# mcp-linear-issue-manager

TypeScript MCP server for Linear teams, workflow states, projects, labels, issue search, create/update, and archive operations via GraphQL. Ten tools plus a status resource and duplicate-aware prompt run over stdio or Cloudflare Workers Streamable HTTP.

```bash
git clone https://github.com/TTaoGaming/mcp-linear-issue-manager.git
cd mcp-linear-issue-manager && npm ci && npm run build
LINEAR_API_KEY=lin_api_... npm run dev
```

Hosted mode uses `/mcp`; store the key as a Worker secret. `npm run check` compiles, tests, and dry-runs the Worker. `npm run inspector:list` verifies discovery. npm and Registry publication require operator approval.
