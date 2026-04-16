import { loadAppConfig } from "@/lib/config/app-config";
import { negotiateCatalog, type A2UIClientCapabilities } from "./catalogs";
import { renderA2UIViewModel } from "./compiler.ts";
import { generateAgentA2UIViewModel } from "./agent.ts";
import { buildGroundedFailureViewModel } from "./grounded-failure.ts";
import { buildMockViewModel } from "./mock.ts";
import { normalizeA2UIViewModel } from "./normalize.ts";
import type { A2UIMessage } from "./protocol.ts";
import {
  buildRegionSelection,
  buildRegionSelectionFailure,
  isRegionChangePrompt,
} from "./region-selector.ts";

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
    const normalized = normalizeA2UIViewModel(result.data, "openai", result.model);

    if (isRegionChangePrompt(prompt)) {
      const selection = buildRegionSelection(result.toolExecution);

      if (!selection) {
        return renderA2UIViewModel(
          buildGroundedFailureViewModel(
            prompt,
            buildRegionSelectionFailure(result.toolExecution),
          ),
          catalogRuntime,
        );
      }

      normalized.selection = selection;
    }

    return renderA2UIViewModel(
      normalized,
      catalogRuntime,
    );
  } catch (error) {
    return renderA2UIViewModel(
      buildGroundedFailureViewModel(prompt, error),
      catalogRuntime,
    );
  }
}
