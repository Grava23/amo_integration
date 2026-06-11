import { describe, it, expect } from "vitest"
import {
    getCallNotesResponseSchema,
    addNotesResponseSchema,
} from "../../../src/infra/amo/notes.js"

function callNoteBase(id: number) {
    return {
        id,
        entity_id: 100,
        created_by: 1,
        updated_by: 1,
        created_at: 1700000000,
        updated_at: 1700000000,
        responsible_user_id: 5,
        group_id: 0,
        account_id: 999,
        _links: { self: { href: "https://x.amocrm.ru/notes/1" } },
    }
}

describe("getCallNotesResponseSchema", () => {
    it("parses a valid response with call_in and call_out notes", () => {
        const response = {
            _page: 1,
            _links: {
                self: { href: "https://x.amocrm.ru/notes?page=1" },
                next: { href: "https://x.amocrm.ru/notes?page=2" },
            },
            _embedded: {
                notes: [
                    {
                        ...callNoteBase(1),
                        note_type: "call_in",
                        params: {
                            uniq: "u1",
                            duration: 60,
                            source: "src",
                            link: "http://link",
                            phone: "79990001122",
                            call_responsible: "Иван Иванов",
                        },
                    },
                    {
                        ...callNoteBase(2),
                        note_type: "call_out",
                        params: {
                            uniq: "u2",
                            duration: 30,
                            source: "src",
                            link: "http://link2",
                            phone: "79990003344",
                            call_responsible: 504141,
                        },
                    },
                ],
            },
        }
        expect(() => getCallNotesResponseSchema.parse(response)).not.toThrow()
        expect(getCallNotesResponseSchema.safeParse(response).success).toBe(true)
    })

    it("coerces a string call_responsible for call_out", () => {
        const response = {
            _page: 1,
            _links: { self: { href: "https://x.amocrm.ru/notes" } },
            _embedded: {
                notes: [
                    {
                        ...callNoteBase(3),
                        note_type: "call_out",
                        params: {
                            uniq: "u3",
                            duration: 10,
                            source: "src",
                            link: "http://link3",
                            phone: "79990005566",
                            call_responsible: "504141",
                        },
                    },
                ],
            },
        }
        const parsed = getCallNotesResponseSchema.parse(response)
        const note = parsed._embedded.notes[0]
        expect(note.params.call_responsible).toBe(504141)
    })
})

describe("addNotesResponseSchema", () => {
    it("parses a note creation response", () => {
        const response = {
            _links: { self: { href: "https://x.amocrm.ru/notes" } },
            _embedded: {
                notes: [
                    {
                        id: 42,
                        entity_id: 100,
                        request_id: "0",
                        _links: { self: { href: "https://x.amocrm.ru/notes/42" } },
                    },
                ],
            },
        }
        expect(() => addNotesResponseSchema.parse(response)).not.toThrow()
        expect(addNotesResponseSchema.safeParse(response).success).toBe(true)
    })
})
