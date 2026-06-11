import { describe, it, expect } from "vitest"
import { isPrismaNotFoundError } from "../../src/utils/prisma_not_found.js"

describe("isPrismaNotFoundError", () => {
    it("true для ошибки с code P2025", () => {
        expect(isPrismaNotFoundError({ code: "P2025" })).toBe(true)
    })

    it("false для другого кода", () => {
        expect(isPrismaNotFoundError({ code: "P2002" })).toBe(false)
    })

    it("false для не-объектов и null", () => {
        expect(isPrismaNotFoundError(null)).toBe(false)
        expect(isPrismaNotFoundError(undefined)).toBe(false)
        expect(isPrismaNotFoundError("P2025")).toBe(false)
        expect(isPrismaNotFoundError(123)).toBe(false)
    })

    it("false для объекта без code", () => {
        expect(isPrismaNotFoundError({ message: "boom" })).toBe(false)
    })
})
