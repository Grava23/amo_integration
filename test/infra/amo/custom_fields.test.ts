import { describe, it, expect, vi } from "vitest"
import { createCustomFieldsAPI } from "../../../src/infra/amo/custom_fields.js"

describe("createCustomFieldsAPI", () => {
    describe("getCustomFields", () => {
        it("ставит entityType в путь и page/limit/types в query", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({ _embedded: { custom_fields: [] } }) } as any
            const api = createCustomFieldsAPI(clientStub)

            await api.getCustomFields("test.amocrm.ru", "tok", "leads", {
                page: 2,
                limit: 25,
                types: ["text", "numeric"],
            } as any)

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)
            expect(url.pathname).toBe("/api/v4/leads/custom_fields")
            expect(url.searchParams.get("page")).toBe("2")
            expect(url.searchParams.get("limit")).toBe("25")
            expect(url.searchParams.get("types")).toBe("text,numeric")
            expect(sentReq.method).toBe("GET")
            expect(sentReq.headers.get("Authorization")).toBe("Bearer tok")
        })

        it("использует entityType contacts в пути", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({}) } as any
            const api = createCustomFieldsAPI(clientStub)

            await api.getCustomFields("test.amocrm.ru", "tok", "contacts", {} as any)

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)
            expect(url.pathname).toBe("/api/v4/contacts/custom_fields")
            expect(url.search).toBe("")
        })
    })
})
