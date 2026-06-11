import { describe, it, expect, vi } from "vitest"
import { createNotesAPI } from "../../../src/infra/amo/notes.js"

function makeStub() {
    return { request: vi.fn().mockResolvedValue({ _embedded: { notes: [] } }) } as any
}

describe("createNotesAPI", () => {
    describe("getNotesByEntityTypeAndID", () => {
        it("ставит entityType и entityID в путь", async () => {
            const clientStub = makeStub()
            const api = createNotesAPI(clientStub)

            await api.getNotesByEntityTypeAndID("test.amocrm.ru", "tok", "leads", 5, {} as any)

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)
            expect(url.pathname).toBe("/api/v4/leads/5/notes")
            expect(sentReq.method).toBe("GET")
            expect(sentReq.headers.get("Authorization")).toBe("Bearer tok")
            expect(url.search).toBe("")
        })

        it("page и limit", async () => {
            const clientStub = makeStub()
            const api = createNotesAPI(clientStub)

            await api.getNotesByEntityTypeAndID("test.amocrm.ru", "tok", "leads", 5, { page: 2, limit: 50 } as any)

            const url = new URL((clientStub.request.mock.calls[0][0] as Request).url)
            expect(url.searchParams.get("page")).toBe("2")
            expect(url.searchParams.get("limit")).toBe("50")
        })

        it("filter.id как число", async () => {
            const clientStub = makeStub()
            const api = createNotesAPI(clientStub)

            await api.getNotesByEntityTypeAndID("test.amocrm.ru", "tok", "leads", 5, { filter: { id: 123 } } as any)

            const url = new URL((clientStub.request.mock.calls[0][0] as Request).url)
            expect(url.searchParams.get("filter[id]")).toBe("123")
        })

        it("filter.id как массив", async () => {
            const clientStub = makeStub()
            const api = createNotesAPI(clientStub)

            await api.getNotesByEntityTypeAndID("test.amocrm.ru", "tok", "leads", 5, { filter: { id: [1, 2, 3] } } as any)

            const url = new URL((clientStub.request.mock.calls[0][0] as Request).url)
            expect(url.searchParams.get("filter[id]")).toBe("1,2,3")
        })

        it("filter.note_type как число", async () => {
            const clientStub = makeStub()
            const api = createNotesAPI(clientStub)

            await api.getNotesByEntityTypeAndID("test.amocrm.ru", "tok", "leads", 5, { filter: { note_type: 7 } } as any)

            const url = new URL((clientStub.request.mock.calls[0][0] as Request).url)
            expect(url.searchParams.get("filter[note_type]")).toBe("7")
        })

        it("filter.note_type как массив", async () => {
            const clientStub = makeStub()
            const api = createNotesAPI(clientStub)

            await api.getNotesByEntityTypeAndID("test.amocrm.ru", "tok", "leads", 5, { filter: { note_type: ["call_in", "call_out"] } } as any)

            const url = new URL((clientStub.request.mock.calls[0][0] as Request).url)
            expect(url.searchParams.get("filter[note_type]")).toBe("call_in,call_out")
        })

        it("filter.updated_at как число", async () => {
            const clientStub = makeStub()
            const api = createNotesAPI(clientStub)

            await api.getNotesByEntityTypeAndID("test.amocrm.ru", "tok", "leads", 5, { filter: { updated_at: 1700000000 } } as any)

            const url = new URL((clientStub.request.mock.calls[0][0] as Request).url)
            expect(url.searchParams.get("filter[updated_at]")).toBe("1700000000")
            expect(url.searchParams.has("filter[updated_at][from]")).toBe(false)
        })

        it("filter.updated_at как объект from/to", async () => {
            const clientStub = makeStub()
            const api = createNotesAPI(clientStub)

            await api.getNotesByEntityTypeAndID("test.amocrm.ru", "tok", "leads", 5, { filter: { updated_at: { from: 100, to: 200 } } } as any)

            const url = new URL((clientStub.request.mock.calls[0][0] as Request).url)
            expect(url.searchParams.get("filter[updated_at][from]")).toBe("100")
            expect(url.searchParams.get("filter[updated_at][to]")).toBe("200")
            expect(url.searchParams.has("filter[updated_at]")).toBe(false)
        })

        it("order.updated_at и order.id", async () => {
            const clientStub = makeStub()
            const api = createNotesAPI(clientStub)

            await api.getNotesByEntityTypeAndID("test.amocrm.ru", "tok", "leads", 5, { order: { updated_at: "asc", id: "desc" } } as any)

            const url = new URL((clientStub.request.mock.calls[0][0] as Request).url)
            expect(url.searchParams.get("order[updated_at]")).toBe("asc")
            expect(url.searchParams.get("order[id]")).toBe("desc")
        })

        it("with", async () => {
            const clientStub = makeStub()
            const api = createNotesAPI(clientStub)

            await api.getNotesByEntityTypeAndID("test.amocrm.ru", "tok", "leads", 5, { with: ["a", "b"] } as any)

            const url = new URL((clientStub.request.mock.calls[0][0] as Request).url)
            expect(url.searchParams.get("with")).toBe("a,b")
        })
    })

    describe("addNotesByEntityTypeAndID", () => {
        it("POST с телом = переданный body и Content-Type application/json", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({ _embedded: { notes: [] } }) } as any
            const api = createNotesAPI(clientStub)

            const payload = [{ note_type: "common", params: { text: "hi" } }]
            await api.addNotesByEntityTypeAndID("test.amocrm.ru", "tok", "leads", 5, payload as any)

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)
            expect(url.pathname).toBe("/api/v4/leads/5/notes")
            expect(sentReq.method).toBe("POST")
            expect(sentReq.headers.get("Authorization")).toBe("Bearer tok")
            expect(sentReq.headers.get("Content-Type")).toBe("application/json")

            const body = JSON.parse(await sentReq.text())
            expect(body).toEqual(payload)
        })
    })
})
