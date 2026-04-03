import { NextResponse } from "next/server";
import {
  CatalogNegotiationError,
  parseClientCapabilities,
} from "@/lib/a2ui/catalogs";
import { serializeA2UIStream } from "@/lib/a2ui/protocol";
import { generateA2UIMessageStream } from "@/lib/a2ui/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: unknown;
      a2uiClientCapabilities?: unknown;
    };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const clientCapabilities = parseClientCapabilities(body.a2uiClientCapabilities);

    if (!prompt) {
      return NextResponse.json(
        { error: "A non-empty prompt is required." },
        { status: 400 },
      );
    }

    const response = await generateA2UIMessageStream(prompt, {
      clientCapabilities,
    });
    const stream = serializeA2UIStream(response);

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof CatalogNegotiationError) {
      return NextResponse.json({ error: error.message }, { status: 406 });
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
