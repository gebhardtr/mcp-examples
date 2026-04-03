import { renderA2UIViewModel } from "./compiler.ts";
import type { A2UIViewModel } from "./types.ts";

export const sampleViewModel: A2UIViewModel = {
  surfaceKind: "decision_report",
  title: "Production Readiness Review Plan for MCP-Backed App",
  summary:
    "A structured review plan covering architecture, security, reliability, operations, compliance, and launch readiness for a new MCP-backed application before production deployment.",
  status: {
    tone: "info",
    title: "Review Objective",
    body: "Validate that the MCP-backed app is secure, reliable, observable, scalable, and operable in production, with clear ownership, rollback paths, and launch criteria.",
  },
  metrics: [
    {
      label: "Architecture",
      value: "Reviewed",
      detail:
        "MCP integration boundaries, dependencies, and failure modes documented",
    },
    {
      label: "Security",
      value: "Required",
      detail:
        "AuthN/AuthZ, secret handling, tenant isolation, and tool access controls verified",
    },
    {
      label: "Reliability",
      value: "Required",
      detail:
        "Timeouts, retries, circuit breaking, graceful degradation, and rollback tested",
    },
  ],
  checklistTitle: "Review Process",
  checklist: [
    {
      title: "Define scope and owners",
      detail:
        "Identify app owners, MCP server owners, security, SRE, and product stakeholders.",
    },
    {
      title: "Assess MCP-specific risks",
      detail:
        "Review tool permissions, prompt injection handling, trust boundaries, and rate limits.",
    },
    {
      title: "Verify operational readiness",
      detail:
        "Confirm dashboards, SLOs, alerts, release procedures, canary strategy, and rollback playbooks.",
    },
  ],
  table: {
    title: "Readiness Checklist",
    columns: ["Area", "What to Review", "Exit Criteria"],
    rows: [
      [
        "Architecture",
        "MCP client/server topology and fallback behavior",
        "Critical paths documented and failure modes understood",
      ],
      [
        "Authorization",
        "Tool access controls, tenant scoping, dangerous action gating",
        "Unauthorized calls blocked and tenant isolation validated",
      ],
      [
        "Observability",
        "Tracing, logs, dashboards, alert coverage",
        "Operators can detect and trace failures end to end",
      ],
    ],
  },
  actionsTitle: "Suggested Participants",
  actions: [
    {
      label: "Engineering Lead",
      description:
        "Owns architecture, launch scope, and remediation prioritization",
    },
    {
      label: "Security Engineer",
      description:
        "Assesses threat model, secret management, auth flows, and abuse cases",
    },
  ],
  appendix: {
    title: "Example Review Agenda",
    format: "pre",
    body: "1. Scope and critical journeys\\n2. Architecture walkthrough\\n3. Security and abuse cases\\n4. Reliability and failure modes\\n5. Go/no-go decision",
  },
  meta: {
    source: "openai",
    model: "gpt-5.4",
    generatedAt: "2026-04-01T02:57:58.122Z",
  },
};

export const sampleA2UIMessages = renderA2UIViewModel(sampleViewModel);

export const sampleA2UIStream = `${sampleA2UIMessages
  .map((message) => JSON.stringify(message))
  .join("\n")}\n`;
