import test from "node:test";
import assert from "node:assert/strict";
import { A2uiMessageProcessor } from "@a2ui/web_core/data/model-processor";
import {
  exampleInlinePanelCatalog,
  negotiateCatalog,
  PANEL_CATALOG_ID,
  REPORTING_CATALOG_ID,
} from "../src/lib/a2ui/catalogs/index.ts";
import { renderA2UIViewModel } from "../src/lib/a2ui/compiler.ts";
import { buildMockViewModel } from "../src/lib/a2ui/mock.ts";
import {
  getComponentEntry,
  materializeA2UISurface,
  parseA2UIStream,
  serializeA2UIStream,
} from "../src/lib/a2ui/protocol.ts";
import { planA2UIReplay } from "../src/lib/a2ui/replay-plan.ts";

test("buildMockViewModel returns an incident-oriented semantic view", () => {
  const response = buildMockViewModel("Investigate a severe API latency incident.");

  assert.equal(response.title, "Incident Triage Console");
  assert.equal(response.meta.source, "mock");
  assert.equal(response.surfaceKind, "ops_console");
  assert.ok(response.table);
});

test("renderA2UIViewModel produces a materializable message stream", () => {
  const response = buildMockViewModel("Investigate a severe API latency incident.");
  const messages = renderA2UIViewModel(response);
  const serialized = serializeA2UIStream(messages);
  const parsed = parseA2UIStream(serialized);
  const surface = materializeA2UISurface(parsed);

  assert.equal(surface.root, "root");
  assert.equal(surface.surfaceId, "main");
  assert.equal(surface.catalogId, REPORTING_CATALOG_ID);
  assert.equal(surface.dataModel.meta?.source, "mock");
  assert.equal(surface.dataModel.text?.["page-title"], "Incident Triage Console");
  assert.ok(surface.components["header-card"]);
  assert.equal(getComponentEntry(surface.components["metrics-grid"])?.properties.variant, "metric-grid");
  assert.equal(getComponentEntry(surface.components["steps-list"])?.properties.variant, "steps");
  assert.equal(getComponentEntry(surface.components["table-header"])?.properties.variant, "table-header-row");
});

test("catalog negotiation honors client preference order", () => {
  const runtime = negotiateCatalog({
    supportedCatalogIds: [PANEL_CATALOG_ID, REPORTING_CATALOG_ID],
  });

  assert.equal(runtime.catalog.catalogId, PANEL_CATALOG_ID);
  assert.equal(runtime.roleComponents.column, "Stack");
});

test("inline catalogs can drive custom component names", () => {
  const runtime = negotiateCatalog({
    supportedCatalogIds: [exampleInlinePanelCatalog.catalogId, REPORTING_CATALOG_ID],
    inlineCatalogs: [exampleInlinePanelCatalog],
  });
  const response = buildMockViewModel("Plan a production readiness review.");
  const messages = renderA2UIViewModel(response, runtime);
  const surfaceUpdate = messages.find((message) => "surfaceUpdate" in message);

  assert.ok(surfaceUpdate && "surfaceUpdate" in surfaceUpdate);
  const rootComponent = surfaceUpdate.surfaceUpdate.components.find(
    (component) => component.id === "root",
  );
  const headerComponent = surfaceUpdate.surfaceUpdate.components.find(
    (component) => component.id === "header-card",
  );

  assert.equal(getComponentEntry(rootComponent!)?.componentType, "Stack");
  assert.equal(getComponentEntry(headerComponent!)?.componentType, "Panel");
  assert.equal(
    messages.find((message) => "beginRendering" in message)?.beginRendering.catalogId,
    exampleInlinePanelCatalog.catalogId,
  );
});

test("inline catalogs can extend a built-in catalog and override selected roles", () => {
  const inlineCatalog = {
    catalogId: "https://example.com/catalogs/reporting-card-override/v1/catalog.json",
    title: "Reporting Card Override",
    extendsCatalogId: REPORTING_CATALOG_ID,
    components: {
      Panel: {
        type: "object",
        "x-a2uiRole": "card" as const,
      },
    },
  };
  const runtime = negotiateCatalog({
    supportedCatalogIds: [inlineCatalog.catalogId, REPORTING_CATALOG_ID],
    inlineCatalogs: [inlineCatalog],
  });
  const response = buildMockViewModel("Plan a production readiness review.");
  const messages = renderA2UIViewModel(response, runtime);
  const surfaceUpdate = messages.find((message) => "surfaceUpdate" in message);

  assert.ok(surfaceUpdate && "surfaceUpdate" in surfaceUpdate);
  const rootComponent = surfaceUpdate.surfaceUpdate.components.find(
    (component) => component.id === "root",
  );
  const headerComponent = surfaceUpdate.surfaceUpdate.components.find(
    (component) => component.id === "header-card",
  );

  assert.equal(runtime.roleComponents.column, "Column");
  assert.equal(runtime.roleComponents.card, "Panel");
  assert.equal(getComponentEntry(rootComponent!)?.componentType, "Column");
  assert.equal(getComponentEntry(headerComponent!)?.componentType, "Panel");
});

test("official A2UI processor accepts the reporting catalog stream", () => {
  const response = buildMockViewModel("Investigate a severe API latency incident.");
  const processor = new A2uiMessageProcessor();

  processor.processMessages(renderA2UIViewModel(response));
  const surface = processor.getSurfaces().get("main");

  assert.equal(surface?.rootComponentId, "root");
  assert.ok(surface?.componentTree);
  assert.equal(surface?.componentTree?.type, "Column");
});

test("official A2UI processor accepts renamed catalog component types", () => {
  const response = buildMockViewModel("Plan a production readiness review.");
  const runtime = negotiateCatalog({
    supportedCatalogIds: [PANEL_CATALOG_ID, REPORTING_CATALOG_ID],
  });
  const processor = new A2uiMessageProcessor();

  processor.processMessages(renderA2UIViewModel(response, runtime));
  const surface = processor.getSurfaces().get("main");

  assert.equal(surface?.componentTree?.type, "Stack");
  assert.equal(findNode(surface?.componentTree ?? null, "header-card")?.type, "Panel");
  assert.equal(findNode(surface?.componentTree ?? null, "page-title")?.type, "Copy");
});

test("replay planner appends only the unseen suffix", () => {
  const messages = renderA2UIViewModel(
    buildMockViewModel("Investigate a severe API latency incident."),
  );
  const previousMessages = messages.slice(0, 2);
  const replayPlan = planA2UIReplay(previousMessages, messages);

  assert.equal(replayPlan.reset, false);
  assert.deepEqual(replayPlan.messages, messages.slice(previousMessages.length));
});

test("replay planner resets when the next stream is shorter", () => {
  const messages = renderA2UIViewModel(
    buildMockViewModel("Investigate a severe API latency incident."),
  );
  const replayPlan = planA2UIReplay(messages, messages.slice(0, 1));

  assert.equal(replayPlan.reset, true);
  assert.deepEqual(replayPlan.messages, messages.slice(0, 1));
});

test("replay planner resets when an earlier message changes", () => {
  const messages = renderA2UIViewModel(
    buildMockViewModel("Investigate a severe API latency incident."),
  );
  const mutatedMessages = messages.map((message, index) =>
    index === 0 && message.surfaceUpdate
      ? {
          ...message,
          surfaceUpdate: {
            ...message.surfaceUpdate,
            surfaceId: "secondary",
          },
        }
      : message,
  );
  const replayPlan = planA2UIReplay(messages, mutatedMessages);

  assert.equal(replayPlan.reset, true);
  assert.deepEqual(replayPlan.messages, mutatedMessages);
});

function findNode(node: { id: string; properties?: Record<string, unknown> } | null, id: string) {
  if (!node) {
    return null;
  }

  if (node.id === id) {
    return node;
  }

  const props = node.properties ?? {};
  for (const key of ["children", "child"]) {
    const value = props[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (
          typeof child === "object" &&
          child !== null &&
          "id" in child &&
          typeof child.id === "string"
        ) {
          const match = findNode(child as { id: string; properties?: Record<string, unknown> }, id);
          if (match) {
            return match;
          }
        }
      }
      continue;
    }

    if (
      typeof value === "object" &&
      value !== null &&
      "id" in value &&
      typeof value.id === "string"
    ) {
      const match = findNode(value as { id: string; properties?: Record<string, unknown> }, id);
      if (match) {
        return match;
      }
    }
  }

  return null;
}
