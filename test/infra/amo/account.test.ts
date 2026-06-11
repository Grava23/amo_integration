import { describe, it, expect, vi } from "vitest"
import { createAccountAPI } from "../../../src/infra/amo/account.js"

describe("createAccountAPI", () => {
    describe("getAmojoID", () => {
        it("ставит with=amojo_id и возвращает response.amojo_id", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({ amojo_id: "my-amojo-id" }) } as any
            const api = createAccountAPI(clientStub)

            const result = await api.getAmojoID("test.amocrm.ru", "tok")

            expect(result).toBe("my-amojo-id")

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)
            expect(url.pathname).toBe("/api/v4/account")
            expect(url.searchParams.get("with")).toBe("amojo_id")
            expect(sentReq.method).toBe("GET")
            expect(sentReq.headers.get("Authorization")).toBe("Bearer tok")
        })
    })
})
