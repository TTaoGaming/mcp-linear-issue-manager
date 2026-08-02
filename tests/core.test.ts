import assert from "node:assert/strict";
import test from "node:test";
import { ApiClient, ApiError } from "../src/core.js";

test("client applies auth, JSON body, and repeated query parameters", async () => {
  let seenUrl = "";
  let seenInit: RequestInit | undefined;
  const client = new ApiClient({ baseUrl: "https://api.invalid", configured: true, headers: { Authorization: "Bearer test-secret" }, fetch: async (input, init) => {
    seenUrl = String(input); seenInit = init; return new Response(JSON.stringify({ ok: true }));
  }});
  assert.deepEqual(await client.request("POST", "/v1/items", { query: { tag: ["a", "b"] }, body: { value: 1 } }), { ok: true });
  assert.equal(seenUrl, "https://api.invalid/v1/items?tag=a&tag=b");
  assert.equal(new Headers(seenInit?.headers).get("authorization"), "Bearer test-secret");
  assert.equal(seenInit?.body, JSON.stringify({ value: 1 }));
});

test("missing credentials fail without a network call", async () => {
  let calls = 0;
  const client = new ApiClient({ baseUrl: "https://api.invalid", configured: false, headers: {}, fetch: async () => { calls += 1; return new Response("{}"); } });
  await assert.rejects(() => client.request("GET", "/v1/items"), (error: unknown) => error instanceof ApiError && error.code === "missing_credentials");
  assert.equal(calls, 0);
});

test("API errors are bounded and never expose response headers", async () => {
  const client = new ApiClient({ baseUrl: "https://api.invalid", configured: true, headers: {}, fetch: async () => new Response(JSON.stringify({ error: { type: "not_found", message: "Missing" } }), { status: 404, headers: { "x-secret": "never" } }) });
  await assert.rejects(() => client.request("GET", "/missing"), (error: unknown) => {
    assert.ok(error instanceof ApiError); assert.equal(error.status, 404); assert.equal(error.code, "not_found"); assert.equal(error.message, "Missing"); assert.equal(error.message.includes("never"), false); return true;
  });
});

test("non-JSON success bodies remain usable", async () => {
  const client = new ApiClient({ baseUrl: "https://api.invalid", configured: true, headers: {}, fetch: async () => new Response("ok") });
  assert.equal(await client.request("GET", "/health"), "ok");
});
