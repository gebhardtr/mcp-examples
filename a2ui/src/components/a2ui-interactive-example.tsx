"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { A2UIClientEventMessage } from "@a2ui/react";
import { ResponseSurface } from "@/components/response-surface";
import { parseA2UIStream, type A2UIMessage } from "@/lib/a2ui/protocol";
import {
  buildInteractiveExampleInitialMessages,
  buildInteractiveExampleSeedMessages,
  INTERACTIVE_EXAMPLE_SURFACE_ID,
  INTERACTIVE_SUBMIT_ACTION,
} from "@/lib/a2ui/interactive-example";

const demoNames = ["A2UI", "Oracle Cloud", "Platform Team"];

export function A2UIInteractiveExample() {
  const [messages, setMessages] = useState<A2UIMessage[]>(() =>
    buildInteractiveExampleInitialMessages(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [actionCount, setActionCount] = useState(0);
  const [lastAction, setLastAction] = useState<A2UIClientEventMessage | null>(null);
  const [lastDelta, setLastDelta] = useState<A2UIMessage[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadExample() {
      try {
        const response = await fetch("/api/examples/interactive", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            request: {
              example: "interactive-a2ui",
            },
          }),
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(errorBody?.error ?? "Interactive example failed to load.");
        }

        const nextMessages = parseA2UIStream(await response.text());
        if (!cancelled) {
          setMessages(nextMessages);
          setError(null);
          setLastDelta([]);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Interactive example failed to load.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadExample();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAction(message: A2UIClientEventMessage) {
    setIsActing(true);
    setLastAction(message);

    try {
      const response = await fetch("/api/examples/interactive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorBody?.error ?? "Interactive action failed.");
      }

      const nextMessages = parseA2UIStream(await response.text());
      setActionCount((count) => count + 1);
      setLastDelta(nextMessages);
      setMessages((current) => [...current, ...nextMessages]);
      setError(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Interactive action failed.",
      );
    } finally {
      setIsActing(false);
    }
  }

  function seedName(name: string) {
    setMessages((current) => [...current, ...buildInteractiveExampleSeedMessages(name)]);
    setError(null);
  }

  async function replayLastAction() {
    if (!lastAction || isActing) {
      return;
    }

    const replayedAction: A2UIClientEventMessage = {
      userAction: {
        ...lastAction.userAction!,
        timestamp: new Date().toISOString(),
      },
    };

    await handleAction(replayedAction);
  }

  function resetExample() {
    setMessages(buildInteractiveExampleInitialMessages());
    setError(null);
    setIsLoading(false);
    setIsActing(false);
    setActionCount(0);
    setLastAction(null);
    setLastDelta([]);
  }

  const streamStats = useMemo(
    () => ({
      totalMessages: messages.length,
      totalDeltas: messages.filter((message) => Boolean(message.dataModelUpdate)).length,
      lastDeltaCount: lastDelta.length,
    }),
    [lastDelta.length, messages],
  );

  return (
    <main className="page-shell">
      <section className="hero interactive-hero fade-in">
        <span className="eyebrow">Canonical A2UI Interaction</span>
        <h1>Render input, emit `userAction`, update the same surface.</h1>
        <p>
          This example uses the official A2UI runtime flow: the server returns an
          initial surface, the client captures a user interaction, posts a
          `userAction` message back to the server, and the server responds with a
          delta `dataModelUpdate`.
        </p>
        <div className="interactive-flow-strip">
          <div className="interactive-flow-chip">
            <strong>1</strong>
            <span>Initial A2UI surface</span>
          </div>
          <div className="interactive-flow-arrow">→</div>
          <div className="interactive-flow-chip">
            <strong>2</strong>
            <span>`userAction` event</span>
          </div>
          <div className="interactive-flow-arrow">→</div>
          <div className="interactive-flow-chip">
            <strong>3</strong>
            <span>`dataModelUpdate` delta</span>
          </div>
        </div>
      </section>

      <section className="grid">
        <aside className="panel fade-in">
          <div className="panel-inner">
            <h2 className="section-title">What this shows</h2>
            <p className="section-copy">
              The text field is bound to the data model. The button action resolves
              that bound value into `action.context`, and the server sends back an
              update for the same surface instead of re-rendering from scratch.
            </p>
            <div className="interactive-step-list">
              <div className="interactive-step-card">
                <span className="interactive-step-label">Client render</span>
                <strong>Initial surface</strong>
                <p>The server sends the first `surfaceUpdate`, `dataModelUpdate`, and `beginRendering` messages.</p>
              </div>
              <div className="interactive-step-card">
                <span className="interactive-step-label">Client event</span>
                <strong>Resolved action context</strong>
                <p>The button emits `userAction` with the current text-field value already resolved into `context.name`.</p>
              </div>
              <div className="interactive-step-card">
                <span className="interactive-step-label">Server delta</span>
                <strong>Same-surface update</strong>
                <p>The server replies with `dataModelUpdate` messages only, so the rendered surface updates without a full reset.</p>
              </div>
            </div>

            <div className="interactive-metrics">
              <div className="interactive-metric-card">
                <span className="interactive-metric-label">Messages seen</span>
                <strong>{streamStats.totalMessages}</strong>
              </div>
              <div className="interactive-metric-card">
                <span className="interactive-metric-label">Action events</span>
                <strong>{actionCount}</strong>
              </div>
              <div className="interactive-metric-card">
                <span className="interactive-metric-label">Last server delta</span>
                <strong>{streamStats.lastDeltaCount}</strong>
              </div>
            </div>

            <div className="button-group" style={{ marginTop: 18 }}>
              <Link href="/" className="secondary-button">
                Back to workbench
              </Link>
            </div>

            <div className="interactive-demo-controls">
              <span className="interactive-inspector-label">Demo controls</span>
              <div className="interactive-demo-chip-row">
                {demoNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="interactive-demo-chip"
                    onClick={() => seedName(name)}
                    disabled={isLoading || isActing}
                  >
                    Use “{name}”
                  </button>
                ))}
              </div>
              <div className="button-group" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    void replayLastAction();
                  }}
                  disabled={!lastAction || isActing}
                >
                  Replay last action
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetExample}
                  disabled={isLoading || isActing}
                >
                  Reset example
                </button>
              </div>
            </div>

            {isActing ? (
              <p className="subtle-note" style={{ marginTop: 12 }}>
                Waiting for server action response...
              </p>
            ) : null}
          </div>
        </aside>

        <section className="history">
          <article className="conversation-card fade-in">
            <div className="conversation-meta">
              <h2>Interactive demo</h2>
              <span>Standard A2UI interaction loop</span>
              <span>Default catalog components</span>
            </div>

            <div className="interactive-inspector">
              <div className="interactive-inspector-card">
                <span className="interactive-inspector-label">Last `userAction`</span>
                <pre className="interactive-json-block">
                  {serializePretty(
                    lastAction?.userAction ?? {
                      note: "No user interaction yet. Type a name and press the button.",
                      actionName: INTERACTIVE_SUBMIT_ACTION,
                      surfaceId: INTERACTIVE_EXAMPLE_SURFACE_ID,
                    },
                  )}
                </pre>
              </div>
              <div className="interactive-inspector-card">
                <span className="interactive-inspector-label">Last server delta</span>
                <pre className="interactive-json-block">
                  {serializePretty(
                    lastDelta.length > 0
                      ? lastDelta
                      : [
                          {
                            note: "Waiting for the first dataModelUpdate response.",
                          },
                        ],
                  )}
                </pre>
              </div>
            </div>

            {error ? (
              <div className="surface">
                <div className="block callout-warning">
                  <h3>Interactive example failed</h3>
                  <p className="section-copy">{error}</p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="surface">
                <div className="block">
                  <p className="section-copy">
                    Waiting for the server to shape the interactive surface.
                  </p>
                </div>
              </div>
            ) : (
              <ResponseSurface messages={messages} onAction={handleAction} />
            )}
          </article>
        </section>
      </section>
    </main>
  );
}

function serializePretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}
