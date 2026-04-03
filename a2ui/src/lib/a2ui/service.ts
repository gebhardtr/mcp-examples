import { loadAppConfig } from "@/lib/config/app-config";
import { negotiateCatalog, type A2UIClientCapabilities } from "./catalogs";
import { renderA2UIViewModel } from "./compiler.ts";
import { generateAgentA2UIViewModel } from "./agent.ts";
import { buildMockViewModel } from "./mock.ts";
import { normalizeA2UIViewModel } from "./normalize.ts";
import { requestA2UIViewModel } from "./openai.ts";
import type { A2UIMessage } from "./protocol.ts";

type GenerateA2UIOptions = {
  clientCapabilities?: A2UIClientCapabilities;
};

export async function generateA2UIMessageStream(
  prompt: string,
  options?: GenerateA2UIOptions,
): Promise<A2UIMessage[]> {
  const appConfig = await loadAppConfig();
  const catalogRuntime = negotiateCatalog(options?.clientCapabilities);

  if (process.env.A2UI_MODE === "mock" || !process.env.OPENAI_API_KEY) {
    return renderA2UIViewModel(buildMockViewModel(prompt), catalogRuntime);
  }

  try {
    const result = await generateAgentA2UIViewModel(prompt, appConfig);
    return renderA2UIViewModel(
      normalizeA2UIViewModel(result.data, "openai", result.model),
      catalogRuntime,
    );
  } catch (error) {
    try {
      const result = await requestA2UIViewModel(prompt, undefined, appConfig);
      const normalized = normalizeA2UIViewModel(result.data, "openai", result.model);
      return renderA2UIViewModel({
        ...normalized,
        meta: {
          ...normalized.meta,
          fallbackReason:
            error instanceof Error ? error.message : "Unknown MCP failure.",
        },
      }, catalogRuntime);
    } catch {
      // Fall through to the mock response.
    }

    const fallback = buildMockViewModel(prompt);
    return renderA2UIViewModel({
      ...fallback,
      meta: {
        ...fallback.meta,
        fallbackReason:
          error instanceof Error ? error.message : "Unknown model failure.",
      },
    }, catalogRuntime);
  }
}
