import {
  builtInCatalogs,
  panelCatalog,
  PANEL_CATALOG_ID,
  reportingCatalog,
  REPORTING_CATALOG_ID,
} from "./builtins.ts";
import {
  type A2UICatalogDefinition,
  type A2UICatalogRuntime,
  type A2UIClientCapabilities,
  type A2UIRenderStyles,
  type A2UIRendererRole,
  CatalogNegotiationError,
} from "./types.ts";

const builtInCatalogRegistry = new Map(
  builtInCatalogs.map((catalog) => [catalog.catalogId, catalog]),
);

const requiredRoles: A2UIRendererRole[] = ["column", "row", "card", "text"];

export function getDefaultCatalogDefinition() {
  return reportingCatalog;
}

export function getBuiltInCatalogs() {
  return builtInCatalogs;
}

export function getBuiltInCatalog(catalogId: string) {
  return builtInCatalogRegistry.get(catalogId);
}

export function getDefaultCatalogRuntime(): A2UICatalogRuntime {
  return buildCatalogRuntime(reportingCatalog);
}

export function parseClientCapabilities(value: unknown): A2UIClientCapabilities | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const supportedCatalogIds = Array.isArray(value.supportedCatalogIds)
    ? value.supportedCatalogIds.flatMap((item) =>
        typeof item === "string" && item.trim() ? [item.trim()] : [],
      )
    : undefined;

  const inlineCatalogs = Array.isArray(value.inlineCatalogs)
    ? value.inlineCatalogs.flatMap((item) => {
        const catalog = parseInlineCatalog(item);
        return catalog ? [catalog] : [];
      })
    : undefined;

  if (!supportedCatalogIds?.length && !inlineCatalogs?.length) {
    return undefined;
  }

  return {
    supportedCatalogIds,
    inlineCatalogs,
  };
}

export function negotiateCatalog(
  capabilities?: A2UIClientCapabilities,
): A2UICatalogRuntime {
  if (!capabilities) {
    return getDefaultCatalogRuntime();
  }

  const inlineCatalogs = new Map(
    (capabilities.inlineCatalogs ?? []).map((catalog) => [catalog.catalogId, catalog]),
  );
  const supportedCatalogIds = capabilities.supportedCatalogIds ?? [];

  if (supportedCatalogIds.length > 0) {
    for (const catalogId of supportedCatalogIds) {
      const negotiated =
        inlineCatalogs.get(catalogId) ?? builtInCatalogRegistry.get(catalogId);
      if (negotiated) {
        return buildCatalogRuntime(negotiated, inlineCatalogs);
      }
    }

    throw new CatalogNegotiationError(
      `No compatible A2UI catalog was negotiated. Client supported: ${supportedCatalogIds.join(", ")}`,
    );
  }

  const firstInlineCatalog = capabilities.inlineCatalogs?.[0];
  if (firstInlineCatalog) {
    return buildCatalogRuntime(firstInlineCatalog, inlineCatalogs);
  }

  return getDefaultCatalogRuntime();
}

export function buildCatalogRuntime(
  catalog: A2UICatalogDefinition,
  inlineCatalogRegistry: Map<string, A2UICatalogDefinition> = new Map(),
): A2UICatalogRuntime {
  const resolvedCatalog = resolveCatalogDefinition(catalog, inlineCatalogRegistry);
  const roleComponents: Partial<Record<A2UIRendererRole, string>> = {};
  const componentRoles: Record<string, A2UIRendererRole> = {};

  for (const [componentName, schema] of Object.entries(resolvedCatalog.components)) {
    const role = schema["x-a2uiRole"];
    if (!role) {
      continue;
    }

    componentRoles[componentName] = role;
    roleComponents[role] = componentName;
  }

  for (const role of requiredRoles) {
    if (!roleComponents[role]) {
      throw new CatalogNegotiationError(
        `Catalog "${resolvedCatalog.catalogId}" does not define the required "${role}" role.`,
      );
    }
  }

  return {
    catalog: resolvedCatalog,
    roleComponents,
    componentRoles,
  };
}

export function getCatalogRuntime(
  catalogId?: string,
  inlineCatalogs: A2UICatalogDefinition[] = [],
): A2UICatalogRuntime {
  const inlineCatalogRegistry = new Map(
    inlineCatalogs.map((catalog) => [catalog.catalogId, catalog]),
  );

  if (!catalogId) {
    return getDefaultCatalogRuntime();
  }

  const inlineCatalog = inlineCatalogs.find((catalog) => catalog.catalogId === catalogId);
  if (inlineCatalog) {
    return buildCatalogRuntime(inlineCatalog, inlineCatalogRegistry);
  }

  const builtInCatalog = builtInCatalogRegistry.get(catalogId);
  if (builtInCatalog) {
    return buildCatalogRuntime(builtInCatalog, inlineCatalogRegistry);
  }

  throw new CatalogNegotiationError(
    `Catalog "${catalogId}" is not implemented by this renderer.`,
  );
}

export const exampleInlinePanelCatalog: A2UICatalogDefinition = {
  ...panelCatalog,
  catalogId: "https://example.com/catalogs/inline-panel/v1/catalog.json",
  title: "Inline Panel Catalog",
};

export const availableCatalogChoices = [
  {
    id: REPORTING_CATALOG_ID,
    label: "Reporting Catalog",
    description: "Default built-in catalog used by the app.",
  },
  {
    id: PANEL_CATALOG_ID,
    label: "Panel Catalog",
    description: "Built-in custom catalog with renamed component types.",
  },
  {
    id: exampleInlinePanelCatalog.catalogId,
    label: "Inline Panel Catalog",
    description: "Client-provided inline catalog using the panel renderer profile.",
  },
];

function resolveCatalogDefinition(
  catalog: A2UICatalogDefinition,
  inlineCatalogRegistry: Map<string, A2UICatalogDefinition>,
  seenCatalogIds: Set<string> = new Set(),
): A2UICatalogDefinition {
  if (!catalog.extendsCatalogId) {
    return catalog;
  }

  if (seenCatalogIds.has(catalog.catalogId)) {
    throw new CatalogNegotiationError(
      `Catalog "${catalog.catalogId}" creates an inheritance cycle.`,
    );
  }

  const baseCatalog =
    inlineCatalogRegistry.get(catalog.extendsCatalogId) ??
    builtInCatalogRegistry.get(catalog.extendsCatalogId);
  if (!baseCatalog) {
    throw new CatalogNegotiationError(
      `Catalog "${catalog.catalogId}" extends unknown catalog "${catalog.extendsCatalogId}".`,
    );
  }

  const nextSeenCatalogIds = new Set(seenCatalogIds);
  nextSeenCatalogIds.add(catalog.catalogId);
  const resolvedBaseCatalog = resolveCatalogDefinition(
    baseCatalog,
    inlineCatalogRegistry,
    nextSeenCatalogIds,
  );

  return {
    catalogId: catalog.catalogId,
    title: catalog.title,
    description: catalog.description ?? resolvedBaseCatalog.description,
    extendsCatalogId: catalog.extendsCatalogId,
    components: {
      ...resolvedBaseCatalog.components,
      ...catalog.components,
    },
    theme:
      resolvedBaseCatalog.theme || catalog.theme
        ? {
            ...(resolvedBaseCatalog.theme ?? {}),
            ...(catalog.theme ?? {}),
          }
        : undefined,
  };
}

function parseInlineCatalog(value: unknown): A2UICatalogDefinition | null {
  if (!isRecord(value)) {
    return null;
  }

  const catalogId = typeof value.catalogId === "string" ? value.catalogId.trim() : "";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const components = value.components;

  if (!catalogId || !title || !isRecord(components)) {
    return null;
  }

  const normalizedComponents: Record<string, A2UICatalogDefinition["components"][string]> = {};
  for (const [componentName, schema] of Object.entries(components)) {
    if (!isRecord(schema)) {
      return null;
    }

    const role = schema["x-a2uiRole"];
    if (
      role !== undefined &&
      role !== "column" &&
      role !== "row" &&
      role !== "card" &&
      role !== "text" &&
      role !== "button" &&
      role !== "divider"
    ) {
      return null;
    }

    normalizedComponents[componentName] = {
      type: typeof schema.type === "string" ? schema.type : undefined,
      description:
        typeof schema.description === "string" ? schema.description : undefined,
      properties: isRecord(schema.properties) ? schema.properties : undefined,
      required: Array.isArray(schema.required)
        ? schema.required.flatMap((entry) =>
            typeof entry === "string" ? [entry] : [],
          )
        : undefined,
      "x-a2uiRole": role,
    };
  }

  return {
    catalogId,
    title,
    description:
      typeof value.description === "string" ? value.description : undefined,
    extendsCatalogId:
      typeof value.extendsCatalogId === "string"
        ? value.extendsCatalogId
        : undefined,
    components: normalizedComponents,
    theme: parseTheme(value.theme),
  };
}

function parseTheme(value: unknown): A2UIRenderStyles | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const theme: A2UIRenderStyles = {};
  if (typeof value.font === "string" && value.font.trim()) {
    theme.font = value.font.trim();
  }
  if (typeof value.primaryColor === "string" && value.primaryColor.trim()) {
    theme.primaryColor = value.primaryColor.trim();
  }

  return Object.keys(theme).length > 0 ? theme : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export {
  panelCatalog,
  PANEL_CATALOG_ID,
  reportingCatalog,
  REPORTING_CATALOG_ID,
};

export type {
  A2UICatalogDefinition,
  A2UICatalogRuntime,
  A2UIClientCapabilities,
};

export { CatalogNegotiationError };
