import { describe, it, expect } from "vitest"
import {
    addNotesBodySchema,
    addNoteSchema,
} from "../../../src/infra/amo/notes.js"

describe("addNotesBodySchema", () => {
    it("parses a non-empty array of notes", () => {
        const body = [{ note_type: "common", params: { text: "hi" } }]
        expect(() => addNotesBodySchema.parse(body)).not.toThrow()
    })

    it("rejects an empty array", () => {
        expect(addNotesBodySchema.safeParse([]).success).toBe(false)
        expect(() => addNotesBodySchema.parse([])).toThrow()
    })
})

describe("addNoteSchema (discriminatedUnion)", () => {
    it("parses a common note requiring params.text", () => {
        expect(() =>
            addNoteSchema.parse({ note_type: "common", params: { text: "hello" } }),
        ).not.toThrow()
    })

    it("rejects a common note missing params.text", () => {
        expect(addNoteSchema.safeParse({ note_type: "common", params: {} }).success).toBe(false)
    })

    it("parses a call_in note with call_responsible as string", () => {
        const note = {
            note_type: "call_in",
            params: {
                uniq: "u1",
                duration: 60,
                source: "src",
                link: "http://link",
                phone: "79990001122",
                call_responsible: "Иван Иванов",
            },
        }
        expect(() => addNoteSchema.parse(note)).not.toThrow()
    })

    it("rejects a call_in note with numeric call_responsible", () => {
        const note = {
            note_type: "call_in",
            params: {
                uniq: "u1",
                duration: 60,
                source: "src",
                link: "http://link",
                phone: "79990001122",
                call_responsible: 504141,
            },
        }
        expect(addNoteSchema.safeParse(note).success).toBe(false)
    })

    it("parses a call_out note with call_responsible as number", () => {
        const note = {
            note_type: "call_out",
            params: {
                uniq: "u1",
                duration: 60,
                source: "src",
                link: "http://link",
                phone: "79990001122",
                call_responsible: 504141,
            },
        }
        expect(() => addNoteSchema.parse(note)).not.toThrow()
    })

    it("rejects a call_out note with string call_responsible", () => {
        const note = {
            note_type: "call_out",
            params: {
                uniq: "u1",
                duration: 60,
                source: "src",
                link: "http://link",
                phone: "79990001122",
                call_responsible: "Иван",
            },
        }
        expect(addNoteSchema.safeParse(note).success).toBe(false)
    })

    it("rejects an unknown note_type", () => {
        expect(
            addNoteSchema.safeParse({ note_type: "nope", params: { text: "x" } }).success,
        ).toBe(false)
    })
})
