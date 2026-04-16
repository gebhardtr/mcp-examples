import { NextResponse } from "next/server";
import type { A2UIClientEventMessage } from "@a2ui/react";
import { serializeA2UIStream } from "@/lib/a2ui/protocol";
import { buildRegionSelectorActionMessages } from "@/lib/a2ui/region-selector";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  try {
    const stream = serializeA2UIStream(
      buildRegionSelectorActionMessages(body as A2UIClientEventMessage),
    );

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Region selector action failed.",
      },
      { status: 400 },
    );
  }
}
