import { describe, it, expect, vi } from "vitest"
import { createLeadAPI } from "../../../src/infra/amo/leads.js"

describe("createLeadAPI", () => {
    describe("getLeads", () => {
        it("формирует query-параметры with/page/limit/query", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({ _embedded: { leads: [] } }) } as any
            const api = createLeadAPI(clientStub)

            await api.getLeads("test.amocrm.ru", "tok", {
                with: ["contacts", "catalog_elements"],
                page: 2,
                limit: 50,
                query: "hello",
            } as any)

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)

            expect(url.pathname).toBe("/api/v4/leads")
            expect(url.searchParams.get("with")).toBe("contacts,catalog_elements")
            expect(url.searchParams.get("page")).toBe("2")
            expect(url.searchParams.get("limit")).toBe("50")
            expect(url.searchParams.get("query")).toBe("hello")
            expect(sentReq.method).toBe("GET")
            expect(sentReq.headers.get("Authorization")).toBe("Bearer tok")
        })

        it("не ставит query-параметры, если их нет", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({}) } as any
            const api = createLeadAPI(clientStub)

            await api.getLeads("test.amocrm.ru", "tok", {} as any)

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)
            expect(url.search).toBe("")
        })
    })

    describe("getLead", () => {
        it("ставит id в путь и with в query", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({ id: 5 }) } as any
            const api = createLeadAPI(clientStub)

            await api.getLead("test.amocrm.ru", "tok", 5, { with: ["contacts"] } as any)

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)
            expect(url.pathname).toBe("/api/v4/leads/5")
            expect(sentReq.url).toContain("/api/v4/leads/5")
            expect(url.searchParams.get("with")).toBe("contacts")
            expect(sentReq.method).toBe("GET")
            expect(sentReq.headers.get("Authorization")).toBe("Bearer tok")
        })
    })

    describe("updateLead", () => {
        it("шлёт PATCH с id в пути и телом в JSON", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({ id: 7 }) } as any
            const api = createLeadAPI(clientStub)

            await api.updateLead("test.amocrm.ru", "tok", 7, { status_id: 142, responsible_user_id: 99 } as any)

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)
            expect(url.pathname).toBe("/api/v4/leads/7")
            expect(sentReq.method).toBe("PATCH")
            expect(sentReq.headers.get("Authorization")).toBe("Bearer tok")
            expect(sentReq.headers.get("Content-Type")).toBe("application/json")
            expect(await sentReq.json()).toEqual({ status_id: 142, responsible_user_id: 99 })
        })
    })

    describe("getPipelines", () => {
        it("GET /api/v4/leads/pipelines", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({ _embedded: { pipelines: [] } }) } as any
            const api = createLeadAPI(clientStub)

            await api.getPipelines("test.amocrm.ru", "tok")

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)
            expect(url.pathname).toBe("/api/v4/leads/pipelines")
            expect(sentReq.method).toBe("GET")
            expect(sentReq.headers.get("Authorization")).toBe("Bearer tok")
        })
    })
})
