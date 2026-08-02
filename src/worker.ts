import { createMcpHandler } from "agents/mcp/server";
import { createServer } from "./server.js";

type Env = Record<string, string | undefined>;

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const handler = createMcpHandler(() => createServer(env), { route: "/mcp", responseMode: "json" });
    return handler(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
