export type A2UIRendererRole =
  | "column"
  | "row"
  | "card"
  | "text"
  | "button"
  | "divider";

export type A2UICatalogComponentSchema = {
  type?: string;
  description?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  "x-a2uiRole"?: A2UIRendererRole;
};

export type A2UIRenderStyles = {
  font?: string;
  primaryColor?: string;
};

export type A2UICatalogDefinition = {
  catalogId: string;
  title: string;
  description?: string;
  extendsCatalogId?: string;
  components: Record<string, A2UICatalogComponentSchema>;
  theme?: A2UIRenderStyles;
};

export type A2UIClientCapabilities = {
  supportedCatalogIds?: string[];
  inlineCatalogs?: A2UICatalogDefinition[];
};

export type A2UICatalogRuntime = {
  catalog: A2UICatalogDefinition;
  roleComponents: Partial<Record<A2UIRendererRole, string>>;
  componentRoles: Record<string, A2UIRendererRole>;
};

export class CatalogNegotiationError extends Error {}
