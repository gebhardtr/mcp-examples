import { A2UI_SCHEMA_DESCRIPTION } from "./schema.ts";
import type { AppConfig } from "@/lib/config/types";
import type { MCPToolDefinition, MCPToolExecution, MCPToolPlan } from "@/lib/mcp/types";

const defaultBaseUrl = "https://api.openai.com/v1";

type A2UIContext = {
  serverName?: string;
  serverInstructions?: string;
  toolExecution?: MCPToolExecution;
  availableTools?: MCPToolDefinition[];
};

export async function requestA2UIViewModel(
  prompt: string,
  context?: A2UIContext,
  appConfig?: AppConfig,
) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const baseUrl =
    process.env.OPENAI_BASE_URL ?? appConfig?.openai.baseUrl ?? defaultBaseUrl;
  const model =
    process.env.OPENAI_MODEL ?? appConfig?.openai.model ?? "gpt-5.4";

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: buildA2UISystemPrompt(context),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed with ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const content = extractResponseText(payload);

  if (!content) {
    throw new Error("No structured text was returned from the model.");
  }

  return {
    model,
    data: parseJsonPayload(content),
  };
}

export async function requestMcpToolPlan(
  prompt: string,
  tools: MCPToolDefinition[],
  serverInstructions?: string,
  appConfig?: AppConfig,
): Promise<MCPToolPlan> {
  const result = await requestJsonObject(
    buildMcpPlannerPrompt(tools, serverInstructions),
    prompt,
    appConfig,
  );

  return normalizeToolPlan(result);
}

function extractResponseText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  if (Array.isArray(payload.output)) {
    const textParts: string[] = [];

    for (const item of payload.output) {
      if (
        typeof item === "object" &&
        item !== null &&
        Array.isArray((item as { content?: unknown }).content)
      ) {
        for (const part of (item as { content: unknown[] }).content) {
          if (
            typeof part === "object" &&
            part !== null &&
            typeof (part as { text?: unknown }).text === "string"
          ) {
            textParts.push((part as { text: string }).text);
          }
        }
      }
    }

    return textParts.join("\n").trim();
  }

  return "";
}

function parseJsonPayload(rawText: string): unknown {
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  return JSON.parse(cleaned);
}

async function requestJsonObject(
  systemPrompt: string,
  userPrompt: string,
  appConfig?: AppConfig,
) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const baseUrl =
    process.env.OPENAI_BASE_URL ?? appConfig?.openai.baseUrl ?? defaultBaseUrl;
  const model =
    process.env.OPENAI_MODEL ?? appConfig?.openai.model ?? "gpt-5.4";

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed with ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  return parseJsonPayload(extractResponseText(payload));
}

function buildA2UISystemPrompt(context?: A2UIContext): string {
  const parts = [A2UI_SCHEMA_DESCRIPTION.trim()];

  if (context?.serverName) {
    parts.push(`The data source is MCP server "${context.serverName}".`);
  }

  if (context?.serverInstructions) {
    parts.push(`Server instructions:\n${context.serverInstructions}`);
  }

  if (context?.availableTools?.length) {
    parts.push(
      `Available MCP tools:\n${context.availableTools
        .map(
          (tool) =>
            `- ${tool.serverName}.${tool.name}: ${
              tool.description ?? "No description"
            }`,
        )
        .join("\n")}`,
    );
  }

  if (context?.toolExecution) {
    parts.push(
      [
        `Use this live MCP result when constructing the semantic view model.`,
        `Server: ${context.toolExecution.serverName}`,
        `Tool: ${context.toolExecution.toolName}`,
        `Arguments: ${JSON.stringify(context.toolExecution.arguments)}`,
        `Result:`,
        context.toolExecution.resultText,
      ].join("\n"),
    );
  }

  parts.push(
    "Favor concise, operator-usable content. Do not emit markdown fences or commentary outside the JSON object.",
  );

  return parts.join("\n\n");
}

function buildMcpPlannerPrompt(
  tools: MCPToolDefinition[],
  serverInstructions?: string,
): string {
  const toolCatalog = tools
    .map((tool) =>
      [
        `Server: ${tool.serverName}`,
        `Tool: ${tool.name}`,
        `Description: ${tool.description ?? "No description"}`,
        `Input schema: ${JSON.stringify(tool.inputSchema ?? {})}`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    "You are the planning step for an agent that can make at most one MCP tool call before rendering a UI.",
    "Return valid JSON only with this shape:",
    '{"useMcp": boolean, "rationale": string, "serverName"?: string, "toolName"?: string, "arguments"?: object}',
    "Choose a tool only if live OCI data is needed to answer the user request.",
    "If a tool is chosen, include both serverName and toolName, and arguments must be a valid JSON object for that tool.",
    serverInstructions ? `Server instructions:\n${serverInstructions}` : "",
    `Available tools:\n${toolCatalog || "No tools available."}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function normalizeToolPlan(value: unknown): MCPToolPlan {
  const record = isRecord(value) ? value : {};

  return {
    useMcp: record.useMcp === true,
    rationale:
      typeof record.rationale === "string" && record.rationale.trim()
        ? record.rationale.trim()
        : "No rationale provided.",
    serverName:
      typeof record.serverName === "string" && record.serverName.trim()
        ? record.serverName.trim()
        : undefined,
    toolName:
      typeof record.toolName === "string" && record.toolName.trim()
        ? record.toolName.trim()
        : undefined,
    arguments: isRecord(record.arguments) ? record.arguments : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
