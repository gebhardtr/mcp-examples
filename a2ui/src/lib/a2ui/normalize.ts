import type {
  A2UIAction,
  A2UIAppendix,
  A2UIChecklistItem,
  A2UIMetric,
  A2UISurfaceKind,
  A2UITable,
  A2UIViewModel,
  CalloutTone,
} from "./types.ts";

export function normalizeA2UIViewModel(
  value: unknown,
  source: A2UIViewModel["meta"]["source"],
  model: string,
): A2UIViewModel {
  const record = isRecord(value) ? value : {};
  const meta = isRecord(record.meta) ? record.meta : {};

  return {
    surfaceKind: parseSurfaceKind(record.surfaceKind),
    title: asString(record.title, "Structured Response"),
    summary: asString(
      record.summary,
      "The server produced a normalized semantic view model.",
    ),
    status: normalizeStatus(record.status),
    metrics: Array.isArray(record.metrics)
      ? record.metrics.flatMap((item) => {
          const normalized = normalizeMetric(item);
          return normalized ? [normalized] : [];
        })
      : [],
    checklistTitle: asOptionalString(record.checklistTitle) ?? "Checklist",
    checklist: Array.isArray(record.checklist)
      ? record.checklist.flatMap((item) => {
          const normalized = normalizeChecklistItem(item);
          return normalized ? [normalized] : [];
        })
      : [],
    table: normalizeTable(record.table),
    actionsTitle: asOptionalString(record.actionsTitle) ?? "Actions",
    actions: Array.isArray(record.actions)
      ? record.actions.flatMap((item) => {
          const normalized = normalizeAction(item);
          return normalized ? [normalized] : [];
        })
      : [],
    appendix: normalizeAppendix(record.appendix),
    meta: {
      source: parseSource(meta.source, source),
      model: asString(meta.model, model),
      generatedAt: asString(meta.generatedAt, new Date().toISOString()),
      fallbackReason:
        asOptionalString(meta.fallbackReason) ??
        asOptionalString(record.fallbackReason),
    },
  };
}

function normalizeStatus(value: unknown): A2UIViewModel["status"] {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    tone: parseTone(value.tone),
    title: asString(value.title, "Status"),
    body: asString(value.body, ""),
  };
}

function normalizeMetric(value: unknown): A2UIMetric | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    label: asString(value.label, "Metric"),
    value: asString(value.value, "n/a"),
    detail: asOptionalString(value.detail),
  };
}

function normalizeChecklistItem(value: unknown): A2UIChecklistItem | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    title: asString(value.title, "Checklist item"),
    detail: asString(value.detail, ""),
  };
}

function normalizeTable(value: unknown): A2UITable | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const columns = Array.isArray(value.columns)
    ? value.columns.map((column) => asString(column, "Column"))
    : [];
  const rows = Array.isArray(value.rows)
    ? value.rows.map((row) =>
        Array.isArray(row) ? row.map((cell) => asString(cell, "")) : [],
      )
    : [];

  if (columns.length === 0 && rows.length === 0) {
    return undefined;
  }

  return {
    title: asString(value.title, "Table"),
    columns,
    rows,
  };
}

function normalizeAction(value: unknown): A2UIAction | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    label: asString(value.label, "Action"),
    description: asString(value.description, ""),
  };
}

function normalizeAppendix(value: unknown): A2UIAppendix | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    title: asString(value.title, "Appendix"),
    body: asString(value.body, ""),
    format: value.format === "pre" ? "pre" : "text",
  };
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseTone(value: unknown): CalloutTone {
  return value === "warning" || value === "success" ? value : "info";
}

function parseSource(
  value: unknown,
  fallback: A2UIViewModel["meta"]["source"],
): A2UIViewModel["meta"]["source"] {
  return value === "openai" || value === "mock" ? value : fallback;
}

function parseSurfaceKind(value: unknown): A2UISurfaceKind | undefined {
  return value === "briefing" ||
    value === "ops_console" ||
    value === "decision_report"
    ? value
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
