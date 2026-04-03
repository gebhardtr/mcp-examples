import test from "node:test";
import assert from "node:assert/strict";
import { parseAppConfigToml } from "../src/lib/config/app-config.ts";

test("parseAppConfigToml returns multiple MCP servers", () => {
  const config = parseAppConfigToml(`
[openai]
model = "gpt-5.4"
base_url = "https://api.openai.com/v1"

[mcp]
active_servers = ["oci_stdio", "oci_http"]

[mcp.servers.oci_stdio]
transport = "stdio"
command = "uvx"
args = ["oracle.oci-cloud-mcp-server"]
tool_allowlist = ["list_instances"]

[mcp.servers.oci_http]
transport = "http"
url = "http://localhost:8888/mcp"
`);

  assert.equal(config.openai.model, "gpt-5.4");
  assert.equal(config.mcp.activeServers?.length, 2);
  assert.equal(config.mcp.servers.oci_stdio.transport, "stdio");
  assert.equal(config.mcp.servers.oci_http.transport, "http");
  assert.deepEqual(config.mcp.servers.oci_stdio.toolAllowlist, ["list_instances"]);
});

test("parseAppConfigToml requires stdio command", () => {
  assert.throws(
    () =>
      parseAppConfigToml(`
[mcp.servers.bad]
transport = "stdio"
`),
    /stdio but has no command/,
  );
});
