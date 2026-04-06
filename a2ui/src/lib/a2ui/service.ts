import { loadAppConfig } from "@/lib/config/app-config";
import { negotiateCatalog, type A2UIClientCapabilities } from "./catalogs";
import { renderA2UIViewModel } from "./compiler.ts";
import { generateAgentA2UIViewModel } from "./agent.ts";
import { buildGroundedFailureViewModel } from "./grounded-failure.ts";
import { buildMockViewModel } from "./mock.ts";
import { normalizeA2UIViewModel } from "./normalize.ts";
import type { A2UIMessage } from "./protocol.ts";

type GenerateA2UIOptions = {
  clientCapabilities?: A2UIClientCapabilities;
};

export async function generateA2UIMessageStream(
  prompt: string,
  options?: GenerateA2UIOptions,
): Promise<A2UIMessage[]> {
  const catalogRuntime = negotiateCatalog(options?.clientCapabilities);

  if (process.env.A2UI_MODE === "mock" || !process.env.OPENAI_API_KEY) {
    return renderA2UIViewModel(buildMockViewModel(prompt), catalogRuntime);
  }

  const appConfig = await loadAppConfig();

  try {
    const result = await generateAgentA2UIViewModel(prompt, appConfig);
    return renderA2UIViewModel(
      normalizeA2UIViewModel(result.data, "openai", result.model),
      catalogRuntime,
    );
  } catch (error) {
    return renderA2UIViewModel(
      buildGroundedFailureViewModel(prompt, error),
      catalogRuntime,
    );
  }
}
