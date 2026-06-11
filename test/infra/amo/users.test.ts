import { describe, it, expect, vi } from "vitest"
import { createUsersAPI } from "../../../src/infra/amo/users.js"

describe("createUsersAPI", () => {
    describe("getUserByID", () => {
        it("ставит userID в путь и with в query", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({ id: 42 }) } as any
            const api = createUsersAPI(clientStub)

            await api.getUserByID("test.amocrm.ru", "tok", 42, { with: ["role", "group"] } as any)

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)
            expect(url.pathname).toBe("/api/v4/users/42")
            expect(url.searchParams.get("with")).toBe("role,group")
            expect(sentReq.method).toBe("GET")
            expect(sentReq.headers.get("Authorization")).toBe("Bearer tok")
        })

        it("без with не добавляет query", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({}) } as any
            const api = createUsersAPI(clientStub)

            await api.getUserByID("test.amocrm.ru", "tok", 1, {} as any)

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            expect(new URL(sentReq.url).search).toBe("")
        })
    })

    describe("getUsers", () => {
        it("GET /api/v4/users с limit=250", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({ _embedded: { users: [] } }) } as any
            const api = createUsersAPI(clientStub)

            await api.getUsers("test.amocrm.ru", "tok")

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)
            expect(url.pathname).toBe("/api/v4/users")
            expect(url.searchParams.get("limit")).toBe("250")
            expect(sentReq.method).toBe("GET")
            expect(sentReq.headers.get("Authorization")).toBe("Bearer tok")
        })
    })
})
