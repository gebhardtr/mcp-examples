import type { A2UIClientEventMessage } from "@a2ui/react";
import type { A2UIMessage } from "./protocol";

export const INTERACTIVE_EXAMPLE_SURFACE_ID = "interactive-demo";
export const INTERACTIVE_SUBMIT_ACTION = "submitGreeting";

export function buildInteractiveExampleInitialMessages(): A2UIMessage[] {
  return [
    {
      surfaceUpdate: {
        surfaceId: INTERACTIVE_EXAMPLE_SURFACE_ID,
        components: [
          component("root", "Column", {
            children: {
              explicitList: ["intro-card", "form-card", "result-card"],
            },
          }),
          component("intro-title", "Text", {
            text: { literalString: "Interactive A2UI Example" },
            usageHint: "h2",
          }),
          component("intro-body", "Text", {
            text: {
              literalString:
                "Type a name into the bound text field, then press the button. The button sends a userAction message back to the server, which returns a dataModelUpdate delta.",
            },
            usageHint: "body",
          }),
          component("intro-content", "Column", {
            children: {
              explicitList: ["intro-title", "intro-body"],
            },
          }),
          component("intro-card", "Card", {
            child: "intro-content",
          }),
          component("form-title", "Text", {
            text: { literalString: "Name input" },
            usageHint: "h3",
          }),
          component("name-field", "TextField", {
            label: { literalString: "Your name" },
            text: { path: "/draft/name" },
            type: "shortText",
          }),
          component("submit-label", "Text", {
            text: { literalString: "Send to server" },
            usageHint: "body",
          }),
          component("submit-button", "Button", {
            child: "submit-label",
            action: {
              name: INTERACTIVE_SUBMIT_ACTION,
              context: [
                {
                  key: "name",
                  value: { path: "/draft/name" },
                },
              ],
            },
          }),
          component("form-content", "Column", {
            children: {
              explicitList: ["form-title", "name-field", "submit-button"],
            },
          }),
          component("form-card", "Card", {
            child: "form-content",
          }),
          component("result-title", "Text", {
            text: { literalString: "Server result" },
            usageHint: "h3",
          }),
          component("result-body", "Text", {
            text: { path: "/result/message" },
            usageHint: "body",
          }),
          component("result-content", "Column", {
            children: {
              explicitList: ["result-title", "result-body"],
            },
          }),
          component("result-card", "Card", {
            child: "result-content",
          }),
        ],
      },
    },
    {
      dataModelUpdate: {
        surfaceId: INTERACTIVE_EXAMPLE_SURFACE_ID,
        contents: [
          {
            key: "draft",
            valueMap: [{ key: "name", valueString: "" }],
          },
          {
            key: "result",
            valueMap: [
              {
                key: "message",
                valueString:
                  "Waiting for a userAction. Enter a name and press the button.",
              },
            ],
          },
        ],
      },
    },
    {
      beginRendering: {
        surfaceId: INTERACTIVE_EXAMPLE_SURFACE_ID,
        root: "root",
      },
    },
  ];
}

export function buildInteractiveExampleActionMessages(
  message: A2UIClientEventMessage,
): A2UIMessage[] {
  const userAction = message.userAction;
  if (!userAction) {
    throw new Error("Interactive example requests must include userAction.");
  }

  if (userAction.name !== INTERACTIVE_SUBMIT_ACTION) {
    throw new Error(`Unsupported interactive example action "${userAction.name}".`);
  }

  const rawName =
    typeof userAction.context?.name === "string" ? userAction.context.name : "";
  const name = rawName.trim();
  const resultMessage = name
    ? `Hello, ${name}. This response was returned by the server after handling an A2UI userAction event.`
    : "The server received the userAction, but the input was empty. Enter a name and try again.";

  return [
    {
      dataModelUpdate: {
        surfaceId: INTERACTIVE_EXAMPLE_SURFACE_ID,
        path: "/result",
        contents: [
          { key: "message", valueString: resultMessage },
          { key: "lastSubmittedAt", valueString: userAction.timestamp },
        ],
      },
    },
    {
      dataModelUpdate: {
        surfaceId: INTERACTIVE_EXAMPLE_SURFACE_ID,
        path: "/draft",
        contents: [{ key: "name", valueString: "" }],
      },
    },
  ];
}

export function buildInteractiveExampleSeedMessages(name: string): A2UIMessage[] {
  return [
    {
      dataModelUpdate: {
        surfaceId: INTERACTIVE_EXAMPLE_SURFACE_ID,
        path: "/draft",
        contents: [{ key: "name", valueString: name }],
      },
    },
  ];
}

function component(
  id: string,
  type: string,
  properties: Record<string, unknown>,
): NonNullable<A2UIMessage["surfaceUpdate"]>["components"][number] {
  return {
    id,
    component: {
      [type]: properties,
    },
  };
}
