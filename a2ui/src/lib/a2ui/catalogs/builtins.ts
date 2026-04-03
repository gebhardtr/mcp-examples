import type { A2UICatalogDefinition } from "./types.ts";

export const REPORTING_CATALOG_ID =
  "https://rigebha.dev/catalogs/a2ui-reporting/v1/catalog.json";

export const PANEL_CATALOG_ID =
  "https://rigebha.dev/catalogs/a2ui-panel/v1/catalog.json";

export const reportingCatalog: A2UICatalogDefinition = {
  catalogId: REPORTING_CATALOG_ID,
  title: "Reporting Catalog",
  description: "The repo's default report-oriented A2UI component catalog.",
  components: {
    Column: {
      type: "object",
      description: "Stack children vertically.",
      "x-a2uiRole": "column",
    },
    Row: {
      type: "object",
      description: "Lay out children horizontally or in a grid.",
      "x-a2uiRole": "row",
    },
    Card: {
      type: "object",
      description: "Render a framed content block.",
      "x-a2uiRole": "card",
    },
    Text: {
      type: "object",
      description: "Render bound or literal text content.",
      "x-a2uiRole": "text",
    },
    Button: {
      type: "object",
      description: "Render an action trigger.",
      "x-a2uiRole": "button",
    },
    Divider: {
      type: "object",
      description: "Render a visual divider.",
      "x-a2uiRole": "divider",
    },
  },
};

export const panelCatalog: A2UICatalogDefinition = {
  catalogId: PANEL_CATALOG_ID,
  title: "Panel Catalog",
  description:
    "A custom catalog that renames the built-in component family to align with a panel-style design system.",
  extendsCatalogId: REPORTING_CATALOG_ID,
  components: {
    Stack: {
      type: "object",
      description: "Vertical stack container.",
      "x-a2uiRole": "column",
    },
    Inline: {
      type: "object",
      description: "Horizontal or grid-aligned children.",
      "x-a2uiRole": "row",
    },
    Panel: {
      type: "object",
      description: "Framed panel surface.",
      "x-a2uiRole": "card",
    },
    Copy: {
      type: "object",
      description: "Styled text content.",
      "x-a2uiRole": "text",
    },
    ActionButton: {
      type: "object",
      description: "Interactive action trigger.",
      "x-a2uiRole": "button",
    },
    Rule: {
      type: "object",
      description: "Section separator.",
      "x-a2uiRole": "divider",
    },
  },
};

export const builtInCatalogs = [reportingCatalog, panelCatalog];
