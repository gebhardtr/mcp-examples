import type { A2UIClientEventMessage } from "@a2ui/react";
import type { MCPToolExecution } from "@/lib/mcp/types";
import type { A2UISelection, A2UIViewModel } from "./types.ts";
import type { A2UIMessage } from "./protocol.ts";

export const REGION_SELECTOR_ACTION_ENDPOINT = "/api/actions/region-selector";
export const REGION_SELECTOR_ACTION_NAME = "submitRegionSelection";
const MAIN_SURFACE_ID = "main";

type OciRegion = {
  key: string;
  name: string;
};

export function isRegionChangePrompt(prompt: string) {
  const normalized = prompt.trim().toLowerCase();

  return (
    /(?:change|switch|set|update|select).*(?:current )?region/.test(normalized) ||
    /(?:current )?region.*(?:change|switch|set|update|select)/.test(normalized)
  );
}

export function buildRegionSelection(
  toolExecution: MCPToolExecution | undefined,
): A2UISelection | undefined {
  if (!toolExecution) {
    return undefined;
  }

  const regions = extractRegions(toolExecution.resultText);
  if (regions.length === 0) {
    return undefined;
  }

  return {
    title: "Region selector",
    body: "Choose one region from the grounded OCI region catalog returned by MCP, then submit it back to the server.",
    label: "OCI region",
    placeholder: "Choose a region",
    options: regions.map((region) => ({
      label: `${region.name} (${region.key})`,
      value: encodeRegionValue(region),
    })),
    submitLabel: "Apply region selection",
    actionName: REGION_SELECTOR_ACTION_NAME,
    actionEndpoint: REGION_SELECTOR_ACTION_ENDPOINT,
    actionContextKey: "regionValue",
    resultTitle: "Server result",
    resultMessage:
      "Waiting for a region selection. Pick a region from the dropdown and submit it.",
  };
}

export function buildRegionSelectionViewModel(
  toolExecution: MCPToolExecution | undefined,
): A2UIViewModel | undefined {
  const selection = buildRegionSelection(toolExecution);

  if (!selection) {
    return undefined;
  }

  return {
    surfaceKind: "ops_console",
    title: "Change Current OCI Region",
    summary:
      "Select a grounded OCI region from the live region catalog returned through the MCP-backed server path.",
    status: {
      tone: "info",
      title: "Grounded region catalog ready",
      body:
        "The server retrieved live OCI regions through MCP. Choose a region and submit it to continue the same-surface A2UI interaction loop.",
    },
    metrics: [
      {
        label: "Regions",
        value: String(selection.options.length),
        detail: "Live OCI regions returned by the grounded MCP request.",
      },
      {
        label: "Source",
        value: "OCI MCP",
        detail: `${toolExecution?.serverName ?? "unknown server"}.${toolExecution?.toolName ?? "unknown tool"}`,
      },
      {
        label: "Interaction",
        value: "userAction",
        detail: "Submitting the selector posts the chosen value back to the server for a same-surface update.",
      },
    ],
    selection,
    actionsTitle: "How this works",
    actions: [
      {
        label: "Grounded initial load",
        description:
          "The agent planned an MCP call, fetched the live OCI region catalog, and the server shaped the selector from that grounded result.",
      },
      {
        label: "Interactive follow-up",
        description:
          "The dropdown selection is sent back as an A2UI userAction, and the server responds with a delta update for the same surface.",
      },
    ],
    appendix: {
      title: "Grounding detail",
      format: "text",
      body: `Grounded via ${toolExecution?.serverName ?? "unknown server"}.${toolExecution?.toolName ?? "unknown tool"} using live OCI region data.`,
    },
    meta: {
      source: "server",
      model: "grounded-region-selector",
      generatedAt: new Date().toISOString(),
    },
  };
}

export function buildRegionSelectorActionMessages(
  message: A2UIClientEventMessage,
): A2UIMessage[] {
  const userAction = message.userAction;
  if (!userAction) {
    throw new Error("Region selector actions must include userAction.");
  }

  if (userAction.name !== REGION_SELECTOR_ACTION_NAME) {
    throw new Error(`Unsupported region selector action "${userAction.name}".`);
  }

  const encodedRegion =
    typeof userAction.context?.regionValue === "string"
      ? userAction.context.regionValue.trim()
      : "";
  const { key: regionKey, name: regionName } = decodeRegionValue(encodedRegion);

  const summary = regionName
    ? `Selected ${regionName}${regionKey ? ` (${regionKey})` : ""}. This grounded request fetched the region catalog through MCP and returned the choice through an A2UI userAction round trip.`
    : "No region was selected. Choose a region from the dropdown, then submit again.";

  return [
    {
      dataModelUpdate: {
        surfaceId: MAIN_SURFACE_ID,
        path: "/result",
        contents: [
          { key: "message", valueString: summary },
          { key: "submittedAt", valueString: userAction.timestamp },
          { key: "selectedRegionName", valueString: regionName },
          { key: "selectedRegionKey", valueString: regionKey },
        ],
      },
    },
  ];
}

export function buildRegionSelectionFailure(
  toolExecution: MCPToolExecution | undefined,
): Error {
  if (!toolExecution) {
    return new Error(
      "No grounded MCP tool result was available for the region-selection request.",
    );
  }

  const toolError = extractToolError(toolExecution.resultText);
  if (toolError) {
    return new Error(toolError);
  }

  return new Error(
    `The grounded tool result from ${toolExecution.serverName}.${toolExecution.toolName} did not contain OCI region rows.`,
  );
}

function extractRegions(resultText: string): OciRegion[] {
  const parsed = safeParseJson(resultText);
  const candidates = collectRegionCandidates(parsed ?? resultText);
  const deduped = new Map<string, OciRegion>();

  for (const candidate of candidates) {
    const key = candidate.key.trim();
    const name = candidate.name.trim();
    if (!key || !name) {
      continue;
    }
    deduped.set(`${key}:${name}`, { key, name });
  }

  return [...deduped.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function extractToolError(resultText: string) {
  const parsed = safeParseJson(resultText);

  if (isRecord(parsed) && typeof parsed.error === "string" && parsed.error.trim()) {
    return parsed.error.trim();
  }

  return undefined;
}

function encodeRegionValue(region: OciRegion) {
  return `${region.key}::${region.name}`;
}

function decodeRegionValue(value: string) {
  const [key = "", ...nameParts] = value.split("::");
  return {
    key: key.trim(),
    name: nameParts.join("::").trim(),
  };
}

function collectRegionCandidates(value: unknown): OciRegion[] {
  const matches: OciRegion[] = [];

  walk(value, (entry) => {
    if (!isRecord(entry)) {
      return;
    }

    const key = firstString(
      entry.key,
      entry.regionKey,
      entry.region_key,
      entry.code,
    );
    const name = firstString(entry.name, entry.regionName, entry.region_name);

    if (key && name) {
      matches.push({ key, name });
    }
  });

  return matches;
}

function walk(value: unknown, visit: (value: unknown) => void) {
  visit(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, visit);
    }
    return;
  }

  if (isRecord(value)) {
    for (const item of Object.values(value)) {
      walk(item, visit);
    }
  }
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
