export const A2UI_SCHEMA_NAME = "a2ui_view_model";

export const A2UI_SCHEMA_DESCRIPTION = `
Return valid JSON only.
Shape the response as a semantic view model with:
- surfaceKind: optional string enum "briefing" | "ops_console" | "decision_report"
- title: short string
- summary: concise overview
- status?: { tone, title, body }
- metrics?: array of { label, value, detail? }
- checklistTitle?: string
- checklist?: array of { title, detail }
- table?: { title, columns[string], rows[string[]] }
- actionsTitle?: string
- actions?: array of { label, description }
- appendix?: { title, body, format }

Do not choose raw UI components. The server owns template selection and A2UI protocol generation.
Do not include markdown fences. Do not include prose outside the JSON object.
`;
