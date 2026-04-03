import { A2UIWorkbench } from "@/components/a2ui-workbench";

const starterPrompts = [
  "Plan a production readiness review for a new MCP-backed application.",
  "Summarize an incident triage flow for an API latency spike.",
  "Turn a cloud cost review into an actionable UI with metrics and next steps.",
];

export default function HomePage() {
  return <A2UIWorkbench starterPrompts={starterPrompts} />;
}
