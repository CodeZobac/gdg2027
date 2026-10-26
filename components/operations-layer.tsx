"use client";

import { useContext, useState } from "react";
import { OverviewNavigation } from "./overview-navigation";
import { PresentationHeading } from "./presentation-heading";
import { ArrowDown, EyeOff, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { z } from "zod/v4";
import { operationsLayerProps, operationSteps } from "@/lib/shared/presentation-contract";

/** Illustrative operations; the decorator and function follow the selected type. */
const types = [
  { asType: "tool", fn: "search_photos", body: "storage.sample(query, k=4)", kind: "query" },
  { asType: "retriever", fn: "retrieve_docs", body: "index.search(query, top_k=4)", kind: "retrieval" },
] as const;
const kinds = ["calculation", "query", "transformation", "integration", "retrieval"] as const;
const qualitySignals = [
  { key: "missing", label: "Missing data", example: "2 photos without a capture date" },
  { key: "suspicious_format", label: "Suspicious format", example: "1 HEIC file in a JPEG set" },
  { key: "ambiguous_units", label: "Ambiguous units", example: "size 59.17: MB or MiB?" },
  { key: "inconsistent_range", label: "Inconsistent range", example: "taken_at in 2031" },
] as const;

export function OperationsLayerCanvas(props: z.infer<typeof operationsLayerProps>) {
  const [localStep, setLocalStep] = useState(0);
  const [typeIndex, setTypeIndex] = useState(0);
  const [summarize, setSummarize] = useState(true);
  const navigation = useContext(OverviewNavigation);
  const active = navigation?.topic ?? localStep;
  const setActive = navigation?.selectTopic ?? setLocalStep;
  const current = operationSteps[active] ?? operationSteps[0];
  const next = operationSteps[active + 1];
  const op = types[typeIndex];
  const flags = active >= 2 && summarize ? ", capture_input=False, capture_output=False" : "";
  /** Code grows step by step and mirrors the interactive choices. */
  const codeLines: { step: number; text: string; changedAt?: number }[] = [
    { step: 0, text: "# Layer 2 decided to run this. Layer 3 executes it." },
    { step: 1, text: `@observe(as_type="${op.asType}"${flags})`, changedAt: 2 },
    { step: 0, text: `def ${op.fn}(query):` },
    { step: 0, text: `    result = ${op.body}` },
    { step: 1, text: `    langfuse.update_current_span(metadata={"operation_type": "${op.kind}"})` },
    ...(summarize ? [
      { step: 2, text: "    langfuse.update_current_span(" },
      { step: 2, text: '        input={"query": query},' },
      { step: 2, text: '        output={"count": len(result), "ids": "opaque"})' },
    ] : [{ step: 2, text: "    # input & output captured automatically, in full" }]),
    { step: 3, text: '    langfuse.update_current_span(metadata={"quality": {' },
    { step: 3, text: '        "missing": 2, "suspicious_format": 1,' },
    { step: 3, text: '        "ambiguous_units": 1, "inconsistent_range": 1}})' },
    { step: 0, text: "    return result" },
  ];
  return <section className="session-layer operations-layer" aria-label="Layer 3: deterministic operations">
    <PresentationHeading title="Layer 3" punctuation=":" subtitle={<>Deterministic operations, <span className="presentation-highlight">the hands</span></>} />
    <p className="session-crumb"><code>operation.unit</code><span className="langfuse-type type-span">Span</span><span>child of orchestration.flow · executes, never decides</span></p>
    <p className="session-summary">{props.summary}</p>

    <div className="session-stepper" role="group" aria-label="Walk through an operation">
      {operationSteps.map((item, index) => <button key={item.key} className={`session-step step-${["entrypoint", "identity", "context", "cost"][index]} ${index < active ? "is-done" : ""}`} aria-pressed={active === index} onClick={() => setActive(index)}>
        <span className="session-step-dot" aria-hidden="true">{index < active ? "✓" : index + 1}</span>
        <span className="session-step-text"><strong>{item.title}</strong><small>{item.hint}</small></span>
      </button>)}
    </div>

    <div className="session-stage">
      <pre className="session-code" aria-label="Instrumentation code"><code>{codeLines.filter(line => line.step <= active).map((line, index) => <span key={index} className={line.step === active || line.changedAt === active && flags ? "is-new" : undefined}>{line.text}{"\n"}</span>)}</code></pre>

      <div className="session-trace operations-span" role="status" aria-label={`Operation span after step ${active + 1}: ${current.title}`}>
        <div className="session-trace-head"><i aria-hidden="true" /><code>operation.unit</code><span className="langfuse-type type-span">Span</span></div>

        <div className={`session-block block-separation ${active === 0 ? "is-new" : ""}`}>
          <span className="session-block-label">Layer 2 decides · Layer 3 executes</span>
          <div className="ops-tree">
            <div className="ops-node ops-decide"><code>orchestration.flow</code><small>decides</small></div>
            <ArrowDown size={14} aria-hidden="true" />
            <div className="ops-children">{types.map((item, index) => <div key={item.fn} className={`ops-node ops-execute ${active >= 1 && index === typeIndex ? "is-selected" : ""}`}><code>{item.fn}</code><small>{item.asType} · executes</small></div>)}</div>
          </div>
        </div>

        {active >= 1 && <div className={`session-block block-type ${active === 1 ? "is-new" : ""}`}>
          <span className="session-block-label">Operation type</span>
          <div className="orchestration-choices" role="group" aria-label="Operation type">{types.map((item, index) => <button key={item.asType} aria-pressed={typeIndex === index} onClick={() => setTypeIndex(index)}><code>as_type=&quot;{item.asType}&quot;</code></button>)}</div>
          <div className="ops-kinds">{kinds.map(kind => <span key={kind} className={kind === op.kind ? "is-current" : undefined}>{kind}</span>)}</div>
        </div>}

        {active >= 2 && <div className={`session-block block-io ${active === 2 ? "is-new" : ""}`}>
          <span className="session-block-label">Inputs &amp; outputs</span>
          <button className="session-proxy-toggle ops-summarize" aria-pressed={summarize} onClick={() => setSummarize(value => !value)}><EyeOff size={14} aria-hidden="true" />Heavy or sensitive data: summarize</button>
          {summarize
            ? <div className="ops-io is-safe"><ShieldCheck size={15} aria-hidden="true" /><code>output: {"{"}count: 4, ids: &quot;opaque&quot;{"}"}</code><small>Summary only · 38 bytes</small></div>
            : <div className="ops-io is-risky"><ShieldAlert size={15} aria-hidden="true" /><code>output: [{"{"}url: &quot;https://…?token=…&quot;, bytes: 2.1 MB{"}"} ×4]</code><small>Signed URLs + 8.4 MB in the trace</small></div>}
        </div>}

        {active >= 3 && <div className="session-block block-quality is-new">
          <span className="session-block-label">Data quality signals</span>
          <ul className="ops-quality">{qualitySignals.map(item => <li key={item.key}><TriangleAlert size={13} aria-hidden="true" /><strong>{item.label}</strong><span>{item.example}</span></li>)}</ul>
        </div>}

        {next && <div className="session-block session-next" aria-hidden="true">Next: {next.title}</div>}
      </div>
    </div>

    <p className="session-caption"><strong>{current.title}.</strong> {props[current.key]}</p>
    <div className="overview-navigation"><span aria-live="polite">Step {active + 1} of 4</span><span className="architecture-demo-note">Demo data only · no live telemetry</span></div>
  </section>;
}
