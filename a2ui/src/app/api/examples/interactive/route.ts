import { NextResponse } from "next/server";
import { serializeA2UIStream } from "@/lib/a2ui/protocol";
import {
  buildInteractiveExampleActionMessages,
  buildInteractiveExampleInitialMessages,
} from "@/lib/a2ui/interactive-example";
import type { A2UIClientEventMessage } from "@a2ui/react";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: {
    request?: unknown;
    userAction?: unknown;
  };

  try {
    body = (await request.json()) as {
      request?: unknown;
      userAction?: unknown;
    };
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  try {
    if (body.userAction) {
      const stream = serializeA2UIStream(
        buildInteractiveExampleActionMessages(
          body as A2UIClientEventMessage,
        ),
      );

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const stream = serializeA2UIStream(buildInteractiveExampleInitialMessages());
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
            : "Interactive example request failed.",
      },
      { status: 400 },
    );
  }
}
