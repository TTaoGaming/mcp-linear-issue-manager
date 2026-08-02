import assert from "node:assert/strict";
import test from "node:test";
import { createServer, SERVER_NAME } from "../src/server.js";
test("server supports credential-free MCP discovery", () => { assert.ok(createServer({})); assert.equal(SERVER_NAME, "mcp-linear-issue-manager"); });
