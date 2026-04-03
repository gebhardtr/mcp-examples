import type { AppConfig } from "@/lib/config/types";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  callMcpTool,
  listAvailableTools,
  closeMcpClient,
  createMcpClient,
} from "@/lib/mcp/client";
import type {
  MCPServerDefinition,
  MCPToolDefinition,
  MCPToolExecution,
  MCPToolPlan,
} from "@/lib/mcp/types";
import {
  requestA2UIViewModel,
  requestMcpToolPlan,
} from "./openai";

export async function generateAgentA2UIViewModel(
  prompt: string,
  appConfig: AppConfig,
) {
  const serverDefinitions = resolveActiveServers(appConfig);

  if (serverDefinitions.length === 0) {
    return requestA2UIViewModel(prompt, undefined, appConfig);
  }

  const sessions = await openServerSessions(serverDefinitions);

  try {
    const discovery = await discoverTools(sessions);
    const plan = await requestMcpToolPlan(
      prompt,
      discovery.tools,
      discovery.instructions.join("\n\n"),
      appConfig,
    );

    let toolExecution: MCPToolExecution | undefined;
    if (shouldUseTool(plan, discovery.tools)) {
      const targetSession = sessions.find(
        (session) => session.definition.name === plan.serverName,
      );

      if (!targetSession) {
        throw new Error(
          `Planned MCP server "${plan.serverName}" is not configured.`,
        );
      }

      const resultText = await callMcpTool(
        targetSession.client,
        plan.toolName!,
        plan.arguments ?? {},
      );

      toolExecution = {
        serverName: targetSession.definition.name,
        toolName: plan.toolName!,
        arguments: plan.arguments ?? {},
        resultText,
      };
    }

    return requestA2UIViewModel(
      prompt,
      {
        serverInstructions: discovery.instructions.join("\n\n"),
        toolExecution,
        availableTools: discovery.tools,
      },
      appConfig,
    );
  } finally {
    await Promise.all(
      sessions.map((session) => closeMcpClient(session.client, session.transport)),
    );
  }
}

function shouldUseTool(
  plan: MCPToolPlan,
  availableTools: MCPToolDefinition[],
): boolean {
  if (!plan.useMcp || !plan.serverName || !plan.toolName) {
    return false;
  }

  return availableTools.some(
    (tool) => tool.serverName === plan.serverName && tool.name === plan.toolName,
  );
}

type ServerSession = {
  definition: MCPServerDefinition;
  client: Client;
  transport: Awaited<ReturnType<typeof createMcpClient>>["transport"];
};

async function discoverTools(sessions: ServerSession[]) {
  const tools: MCPToolDefinition[] = [];
  const instructions: string[] = [];

  for (const session of sessions) {
    try {
      const result = {
        instructions: session.client.getInstructions(),
        tools: await listAvailableTools(
          session.client,
          session.definition.name,
          session.definition.toolAllowlist,
        ),
      };

      if (result.instructions) {
        instructions.push(`${session.definition.name}: ${result.instructions}`);
      }

      tools.push(...result.tools);
    } catch (error) {
      instructions.push(
        `${session.definition.name}: unavailable (${
          error instanceof Error ? error.message : "unknown error"
        })`,
      );
    }
  }

  return { tools, instructions };
}

async function openServerSessions(
  serverDefinitions: AppConfig["mcp"]["servers"][string][],
): Promise<ServerSession[]> {
  const sessions = await Promise.all(
    serverDefinitions.map(async (definition) => ({
      definition,
      ...(await createMcpClient(definition)),
    })),
  );

  return sessions;
}

function resolveActiveServers(appConfig: AppConfig) {
  const configuredServers = appConfig.mcp.servers;
  const activeServerNames = appConfig.mcp.activeServers;

  if (!activeServerNames?.length) {
    return Object.values(configuredServers);
  }

  return activeServerNames
    .map((serverName) => configuredServers[serverName])
    .filter(Boolean);
}
