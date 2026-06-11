import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createHash } from "node:crypto"
import { AmoClient } from "../../../src/infra/amo/client.js"

function jsonReq(url = "https://test.amocrm.ru/api/v4/leads") {
    return new Request(url, { method: "GET", headers: { Accept: "application/json" } })
}

describe("AmoClient.request", () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
        fetchMock = vi.fn()
        vi.stubGlobal("fetch", fetchMock)
    })
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it("парсит успешный JSON-ответ", async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
        const client = new AmoClient(3, 1, 50)
        await expect(client.request(jsonReq())).resolves.toEqual({ ok: true })
        expect(fetchMock).toHaveBeenCalledOnce()
    })

    it("возвращает undefined на 204", async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
        const client = new AmoClient(3, 1, 50)
        await expect(client.request(jsonReq())).resolves.toBeUndefined()
    })

    it("возвращает undefined на пустое тело", async () => {
        fetchMock.mockResolvedValue(new Response("", { status: 200 }))
        const client = new AmoClient(3, 1, 50)
        await expect(client.request(jsonReq())).resolves.toBeUndefined()
    })

    it("возвращает текст, если тело не JSON", async () => {
        fetchMock.mockResolvedValue(new Response("plain text", { status: 200 }))
        const client = new AmoClient(3, 1, 50)
        await expect(client.request(jsonReq())).resolves.toBe("plain text")
    })

    it("на 4xx бросает сразу без ретраев", async () => {
        fetchMock.mockResolvedValue(new Response("nope", { status: 404 }))
        const client = new AmoClient(3, 1, 50)
        await expect(client.request(jsonReq())).rejects.toThrow("HTTP 404")
        expect(fetchMock).toHaveBeenCalledOnce()
    })

    it("на 5xx ретраит и в итоге бросает", async () => {
        fetchMock.mockImplementation(async () => new Response("boom", { status: 500 }))
        const client = new AmoClient(3, 1, 50)
        await expect(client.request(jsonReq())).rejects.toThrow("HTTP 500")
        expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    it("успех после первого 5xx", async () => {
        fetchMock
            .mockResolvedValueOnce(new Response("boom", { status: 502 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ recovered: 1 }), { status: 200 }))
        const client = new AmoClient(3, 1, 50)
        await expect(client.request(jsonReq())).resolves.toEqual({ recovered: 1 })
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it("ретраит 400 с 'host could not be resolved'", async () => {
        fetchMock.mockImplementation(async () => new Response("The host could not be resolved.", { status: 400 }))
        const client = new AmoClient(2, 1, 50)
        await expect(client.request(jsonReq())).rejects.toThrow("host could not be resolved")
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it("размыкает circuit breaker после серии 5xx и перестаёт звать fetch", async () => {
        fetchMock.mockImplementation(async () => new Response("boom", { status: 500 }))
        // retries=1 → один fetch на запрос; брейкер открывается после 5 ошибок (порог по умолчанию)
        const client = new AmoClient(1, 1, 100)

        for (let i = 0; i < 5; i++) {
            await expect(client.request(jsonReq())).rejects.toThrow("HTTP 500")
        }
        expect(fetchMock).toHaveBeenCalledTimes(5)

        // брейкер открыт — следующий запрос падает без обращения к fetch
        await expect(client.request(jsonReq())).rejects.toThrow("Circuit breaker open")
        expect(fetchMock).toHaveBeenCalledTimes(5)
    })

    it("setChatAPIHeaders проставляет подпись и md5 тела", async () => {
        const client = new AmoClient(3, 1, 50)
        const body = JSON.stringify({ a: 1 })
        const req = new Request("https://test.amocrm.ru/v2/origin/custom/scope", {
            method: "POST",
            body,
            headers: { "Content-Type": "application/json" },
        })

        const signed = await client.setChatAPIHeaders(req)

        const expectedMd5 = createHash("md5").update(body).digest("hex")
        expect(signed.headers.get("Content-MD5")).toBe(expectedMd5)
        expect(signed.headers.get("Date")).toBeTruthy()
        expect(signed.headers.get("X-Signature")).toMatch(/^[a-f0-9]{40}$/)
        expect(signed.headers.get("Content-Type")).toBe("application/json")
    })
})
