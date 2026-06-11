import { describe, it, expect, vi } from "vitest"
import { createContactAPI } from "../../../src/infra/amo/contact.js"

describe("createContactAPI", () => {
    describe("getContacts", () => {
        it("формирует query-параметры with/page/limit/query", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({ _embedded: { contacts: [] } }) } as any
            const api = createContactAPI(clientStub)

            await api.getContacts("test.amocrm.ru", "tok", {
                with: ["leads"],
                page: 3,
                limit: 10,
                query: "ivan",
            } as any)

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)

            expect(url.pathname).toBe("/api/v4/contacts")
            expect(url.searchParams.get("with")).toBe("leads")
            expect(url.searchParams.get("page")).toBe("3")
            expect(url.searchParams.get("limit")).toBe("10")
            expect(url.searchParams.get("query")).toBe("ivan")
            expect(sentReq.method).toBe("GET")
            expect(sentReq.headers.get("Authorization")).toBe("Bearer tok")
        })

        it("без параметров не добавляет query", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({}) } as any
            const api = createContactAPI(clientStub)

            await api.getContacts("test.amocrm.ru", "tok", {} as any)

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            expect(new URL(sentReq.url).search).toBe("")
        })
    })

    describe("getContact", () => {
        it("ставит id в путь и with в query", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({ id: 7 }) } as any
            const api = createContactAPI(clientStub)

            await api.getContact("test.amocrm.ru", "tok", 7, { with: ["leads"] } as any)

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)
            expect(url.pathname).toBe("/api/v4/contacts/7")
            expect(url.searchParams.get("with")).toBe("leads")
            expect(sentReq.method).toBe("GET")
            expect(sentReq.headers.get("Authorization")).toBe("Bearer tok")
        })
    })
})
