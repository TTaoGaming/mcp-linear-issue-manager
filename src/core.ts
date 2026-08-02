import { z } from "zod";

export const JsonObjectSchema = z.record(z.string(), z.unknown());
export const JsonArraySchema = z.array(JsonObjectSchema);
export const ToolResultSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  status: z.number().int().optional(),
  code: z.string().optional(),
});

export interface RequestOptions {
  query?: Record<string, string | number | boolean | string[] | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  form?: URLSearchParams;
}

export interface ApiClientConfig {
  baseUrl: string;
  configured: boolean;
  headers: Record<string, string>;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

export class ApiError extends Error {
  readonly status: number | undefined;
  readonly code: string | undefined;

  constructor(message: string, options: { status?: number; code?: string } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
  }
}

function bounded(value: string, max = 1_000) {
  return value.length <= max ? value : `${value.slice(0, max)}...`;
}

export class ApiClient {
  readonly configured: boolean;
  readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(config: ApiClientConfig) {
    this.configured = config.configured;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.headers = config.headers;
    this.timeoutMs = config.timeoutMs ?? 20_000;
    this.fetchImpl = config.fetch ?? globalThis.fetch;
  }

  async request(method: string, path: string, options: RequestOptions = {}): Promise<unknown> {
    if (!this.configured) throw new ApiError("Required credentials are not configured.", { code: "missing_credentials" });
    const url = new URL(path, `${this.baseUrl}/`);
    for (const [key, raw] of Object.entries(options.query ?? {})) {
      if (raw === undefined) continue;
      for (const value of Array.isArray(raw) ? raw : [raw]) url.searchParams.append(key, String(value));
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method,
        headers: {
          Accept: "application/json",
          ...(options.form ? { "Content-Type": "application/x-www-form-urlencoded" } : options.body === undefined ? {} : { "Content-Type": "application/json" }),
          ...this.headers,
          ...options.headers,
        },
        ...(options.form ? { body: options.form.toString() } : options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        signal: controller.signal,
      });
      const text = await response.text();
      let payload: unknown = null;
      if (text) {
        try { payload = JSON.parse(text) as unknown; } catch { payload = text; }
      }
      if (!response.ok) {
        const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
        const nested = record.error && typeof record.error === "object" ? record.error as Record<string, unknown> : {};
        const message = [record.message, nested.message, typeof record.error === "string" ? record.error : undefined].find((v): v is string => typeof v === "string") ?? `API request failed with HTTP ${response.status}.`;
        const code = [record.code, nested.code, nested.type].find((v): v is string => typeof v === "string");
        throw new ApiError(bounded(message), { status: response.status, ...(code ? { code } : {}) });
      }
      return payload;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new ApiError(`API request timed out after ${this.timeoutMs} ms.`, { code: "timeout" });
      throw new ApiError(error instanceof Error ? bounded(error.message) : "Unknown network error.", { code: "network_error" });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function success(data: unknown) {
  const structuredContent = { ok: true, data };
  return { content: [{ type: "text" as const, text: JSON.stringify(structuredContent, null, 2) }], structuredContent };
}

export function failure(error: unknown) {
  const structuredContent = error instanceof ApiError
    ? { ok: false, error: error.message, ...(error.status === undefined ? {} : { status: error.status }), ...(error.code ? { code: error.code } : {}) }
    : { ok: false, error: error instanceof Error ? error.message : "Unknown MCP server error." };
  return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(structuredContent, null, 2) }], structuredContent };
}

export async function run(operation: () => Promise<unknown>) {
  try { return success(await operation()); } catch (error) { return failure(error); }
}

export function segment(value: string) { return encodeURIComponent(value); }
