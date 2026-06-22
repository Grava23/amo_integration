import { describe, it, expect, beforeAll, afterAll, beforeEach, inject } from "vitest"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../src/generated/prisma/client.js"
import { AuthRepo } from "../../src/modules/auth/repo.js"
import { IntegrationRepo } from "../../src/modules/integration/repo.js"
import { WazupRepo } from "../../src/modules/wazup/repo.js"
import { LeadsRepo } from "../../src/modules/leads/repo.js"

let prisma: PrismaClient

async function seedIntegration(domain = "acme.amocrm.ru") {
    await prisma.integrations.create({
        data: {
            domain,
            access_token: "access-1",
            refresh_token: "refresh-1",
            amojo_id: "amojo-1",
            scope_id: "scope-1",
        },
    })
}

beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: inject("databaseUrl") })
    prisma = new PrismaClient({ adapter })
    await prisma.$connect()
})

afterAll(async () => {
    await prisma?.$disconnect()
})

beforeEach(async () => {
    await prisma.lead_stage_events.deleteMany()
    // integration_settings удалится каскадом по FK на integrations
    await prisma.integrations.deleteMany()
    await prisma.oauth_states.deleteMany()
})

describe("AuthRepo (real DB)", () => {
    it("createOauthState + consumeOauthState помечает used", async () => {
        const repo = new AuthRepo(prisma)
        await repo.createOauthState({
            state: "state-1",
            expiredAt: new Date(Date.now() + 60_000),
            used: false,
        })

        await repo.consumeOauthState("state-1")

        const row = await prisma.oauth_states.findUniqueOrThrow({ where: { state: "state-1" } })
        expect(row.used).toBe(true)
    })

    it("consumeOauthState бросает для просроченного state", async () => {
        const repo = new AuthRepo(prisma)
        await repo.createOauthState({
            state: "expired",
            expiredAt: new Date(Date.now() - 60_000),
            used: false,
        })

        await expect(repo.consumeOauthState("expired")).rejects.toMatchObject({ code: "P2025" })
    })

    it("upsertIntegration создаёт, затем обновляет", async () => {
        const repo = new AuthRepo(prisma)
        await repo.upsertIntegration({
            domain: "new.amocrm.ru",
            accessToken: "a1",
            refreshToken: "r1",
            amojoID: "am1",
            scopeID: "sc1",
            active: true,
        })

        let row = await prisma.integrations.findUniqueOrThrow({ where: { domain: "new.amocrm.ru" } })
        expect(row.access_token).toBe("a1")

        await repo.upsertIntegration({
            domain: "new.amocrm.ru",
            accessToken: "a2",
            refreshToken: "r2",
            amojoID: "am2",
            scopeID: "sc2",
            active: true,
        })

        row = await prisma.integrations.findUniqueOrThrow({ where: { domain: "new.amocrm.ru" } })
        expect(row.access_token).toBe("a2")
        expect(row.amojo_id).toBe("am2")
    })

    it("getIntegrationByDomain возвращает доменную модель", async () => {
        await seedIntegration()
        const repo = new AuthRepo(prisma)
        const integration = await repo.getIntegrationByDomain("acme.amocrm.ru")
        expect(integration).toMatchObject({
            domain: "acme.amocrm.ru",
            accessToken: "access-1",
            refreshToken: "refresh-1",
            amojoID: "amojo-1",
            scopeID: "scope-1",
            active: true,
        })
    })

    it("getIntegrationByDomain бросает для отсутствующего домена", async () => {
        const repo = new AuthRepo(prisma)
        await expect(repo.getIntegrationByDomain("missing.amocrm.ru")).rejects.toBeTruthy()
    })

    it("updateIntegrationTokens обновляет токены", async () => {
        await seedIntegration()
        const repo = new AuthRepo(prisma)
        await repo.updateIntegrationTokens("acme.amocrm.ru", "access-2", "refresh-2")
        const row = await prisma.integrations.findUniqueOrThrow({ where: { domain: "acme.amocrm.ru" } })
        expect(row.access_token).toBe("access-2")
        expect(row.refresh_token).toBe("refresh-2")
    })
})

describe("IntegrationRepo (real DB)", () => {
    it("updateIntegrationActive переключает флаг", async () => {
        await seedIntegration()
        const repo = new IntegrationRepo(prisma)
        await repo.updateIntegrationActive("acme.amocrm.ru", false)
        const row = await prisma.integrations.findUniqueOrThrow({ where: { domain: "acme.amocrm.ru" } })
        expect(row.active).toBe(false)
    })

    it("upsertLeadStageSettings создаёт и обновляет, getLeadStageSettings читает все поля", async () => {
        await seedIntegration("st.amocrm.ru")
        const repo = new IntegrationRepo(prisma)

        await repo.upsertLeadStageSettings("st.amocrm.ru", {
            targetStatusId: 142,
            targetPipelineId: 1,
            targetResponsibleUserId: 7,
            priorityOpenStatusId: 9,
            commentTemplate: "привет",
        })

        const got = await repo.getLeadStageSettings("st.amocrm.ru")
        expect(got).toMatchObject({
            domain: "st.amocrm.ru",
            targetStatusId: 142,
            targetPipelineId: 1,
            targetResponsibleUserId: 7,
            priorityOpenStatusId: 9,
            commentTemplate: "привет",
        })

        // update-ветка апсерта + очистка полей в null
        await repo.upsertLeadStageSettings("st.amocrm.ru", {
            targetStatusId: 200,
            targetPipelineId: null,
            targetResponsibleUserId: null,
            priorityOpenStatusId: null,
            commentTemplate: null,
        })
        const got2 = await repo.getLeadStageSettings("st.amocrm.ru")
        expect(got2?.targetStatusId).toBe(200)
        expect(got2?.commentTemplate).toBeNull()
        expect(got2?.priorityOpenStatusId).toBeNull()
    })

    it("getLeadStageSettings возвращает null, если настроек нет", async () => {
        await seedIntegration("none.amocrm.ru")
        const repo = new IntegrationRepo(prisma)
        expect(await repo.getLeadStageSettings("none.amocrm.ru")).toBeNull()
    })

    it("listStageEvents отдаёт записи журнала обоих источников", async () => {
        await seedIntegration("ev.amocrm.ru")
        const leadsRepo = new LeadsRepo(prisma)
        await leadsRepo.createStageEvent({
            domain: "ev.amocrm.ru", source: "manual", leadId: 111,
            statusId: 142, pipelineId: null, responsibleUserId: 7, success: true, error: null,
        })
        await leadsRepo.createStageEvent({
            domain: "ev.amocrm.ru", source: "webhook", leadId: null,
            statusId: null, pipelineId: null, responsibleUserId: null, success: false, error: "нет сделок",
        })

        const repo = new IntegrationRepo(prisma)
        const events = await repo.listStageEvents("ev.amocrm.ru")

        expect(events).toHaveLength(2)
        expect(events.find((e) => e.leadId === 111)?.success).toBe(true)
        const skip = events.find((e) => e.leadId === null)
        expect(skip?.source).toBe("webhook")
        expect(skip?.error).toBe("нет сделок")
    })

    it("softDeleteIntegration скрывает интеграцию из списка и getIntegrationByDomain", async () => {
        await seedIntegration("del.amocrm.ru")
        const repo = new IntegrationRepo(prisma)

        await repo.softDeleteIntegration("del.amocrm.ru", new Date())

        const list = await repo.listIntegrations()
        expect(list.find((i) => i.domain === "del.amocrm.ru")).toBeUndefined()
        await expect(repo.getIntegrationByDomain("del.amocrm.ru")).rejects.toBeTruthy()
    })
})

describe("WazupRepo (real DB)", () => {
    it("getIntegrationByDomain + updateIntegrationTokens", async () => {
        await seedIntegration("wz.amocrm.ru")
        const repo = new WazupRepo(prisma)

        const integration = await repo.getIntegrationByDomain("wz.amocrm.ru")
        expect(integration.domain).toBe("wz.amocrm.ru")

        await repo.updateIntegrationTokens("wz.amocrm.ru", "wz-access", "wz-refresh")
        const row = await prisma.integrations.findUniqueOrThrow({ where: { domain: "wz.amocrm.ru" } })
        expect(row.access_token).toBe("wz-access")
    })
})

describe("LeadsRepo (real DB)", () => {
    it("getIntegrationByDomain + updateIntegrationTokens", async () => {
        await seedIntegration("ld.amocrm.ru")
        const repo = new LeadsRepo(prisma)

        const integration = await repo.getIntegrationByDomain("ld.amocrm.ru")
        expect(integration.domain).toBe("ld.amocrm.ru")

        await repo.updateIntegrationTokens("ld.amocrm.ru", "ld-access", "ld-refresh")
        const row = await prisma.integrations.findUniqueOrThrow({ where: { domain: "ld.amocrm.ru" } })
        expect(row.refresh_token).toBe("ld-refresh")
    })
})
