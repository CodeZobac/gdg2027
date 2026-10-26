"use client";

import { useContext, useState } from "react";
import { OverviewNavigation } from "./overview-navigation";
import { PresentationHeading } from "./presentation-heading";
import { ArrowRight, CircleCheck, OctagonX, Undo2 } from "lucide-react";
import { z } from "zod/v4";
import { orchestrationLayerProps, orchestrationSteps } from "@/lib/shared/presentation-contract";

/** Illustrative strategies; `as_type` follows from the strategy. */
const strategies = [
  { key: "tool_using_agent", asType: "agent" },
  { key: "policy_based", asType: "chain" },
  { key: "workflow_graph", asType: "chain" },
] as const;
/** Each decision records the business condition that led to an operation. */
const decisions = [
  { when: "intent == \"photos\"", then: "search_photos", kind: "tool" },
  { when: "found >= 4", then: "compose_gallery", kind: "chain" },
  { when: "found < 4", then: "ask_to_refine", kind: "fallback" },
] as const;
const outcomes = [
  { key: "success", label: "Success", icon: CircleCheck, detail: "Gallery delivered", signal: null },
  { key: "business_fallback", label: "Business fallback", icon: Undo2, detail: "Asked the user to refine the request", signal: null },
  { key: "abort", label: "Abort", icon: OctagonX, detail: "Flow stopped on purpose", signal: "circuit_breaker: open" },
] as const;
const stays = ["Which steps run", "In what order", "With which tools", "Business fallback or abort"] as const;
const moves = ["Technical retries", "Fallbacks between models", "Timeouts", "Rate limits"] as const;

export function OrchestrationLayerCanvas(props: z.infer<typeof orchestrationLayerProps>) {
  const [localStep, setLocalStep] = useState(0);
  const [strategy, setStrategy] = useState(0);
  const [outcome, setOutcome] = useState(0);
  const navigation = useContext(OverviewNavigation);
  const active = navigation?.topic ?? localStep;
  const setActive = navigation?.selectTopic ?? setLocalStep;
  const current = orchestrationSteps[active] ?? orchestrationSteps[0];
  const next = orchestrationSteps[active + 1];
  const chosen = strategies[strategy];
  const path = outcomes[outcome];
  /** Code grows step by step and mirrors the interactive choices. */
  const codeLines: { step: number; text: string }[] = [
    { step: 0, text: `@observe(as_type="${chosen.asType}")` },
    { step: 0, text: "def orchestrate(request):" },
    { step: 0, text: `    # strategy: ${chosen.key}` },
    { step: 1, text: "    for step in decide_steps(request):" },
    { step: 1, text: "        run(step)  # Layer 3 operations" },
    { step: 1, text: "    langfuse.update_current_span(metadata={" },
    { step: 1, text: `        "strategy": "${chosen.key}",` },
    { step: 1, text: '        "decisions": [{"if": "found >= 4",' },
    { step: 1, text: '                       "then": "compose_gallery"}],' },
    { step: 2, text: `        "final_path": "${path.key}",` },
    { step: 2, text: `        "control": {"manual_interrupt": False,` },
    { step: 2, text: `                    "circuit_breaker": "${path.key === "abort" ? "open" : "closed"}"},` },
    { step: 1, text: "    })" },
    { step: 3, text: "# retries · model fallbacks · timeouts · rate limits" },
    { step: 3, text: "# → LiteLLM Router / Proxy (Layer 4), not here" },
  ];
  const visible = codeLines.filter(line => line.step <= active);
  return <section className="session-layer orchestration-layer" aria-label="Layer 2: orchestration and reasoning">
    <PresentationHeading title="Layer 2" punctuation=":" subtitle={<>Orchestration &amp; <span className="presentation-highlight">reasoning</span></>} />
    <p className="session-crumb"><code>orchestration.flow</code><span className="langfuse-type type-span">Span</span><span>child of interaction.session · decides what runs next</span></p>
    <p className="session-summary">{props.summary}</p>

    <div className="session-stepper" role="group" aria-label="Walk through the orchestrator">
      {orchestrationSteps.map((item, index) => <button key={item.key} className={`session-step step-${["entrypoint", "identity", "context", "cost"][index]} ${index < active ? "is-done" : ""}`} aria-pressed={active === index} onClick={() => setActive(index)}>
        <span className="session-step-dot" aria-hidden="true">{index < active ? "✓" : index + 1}</span>
        <span className="session-step-text"><strong>{item.title}</strong><small>{item.hint}</small></span>
      </button>)}
    </div>

    <div className="session-stage">
      <pre className="session-code" aria-label="Instrumentation code"><code>{visible.map((line, index) => <span key={index} className={line.step === active ? "is-new" : undefined}>{line.text}{"\n"}</span>)}</code></pre>

      <div className="session-trace orchestration-span" role="status" aria-label={`Orchestrator span after step ${active + 1}: ${current.title}`}>
        <div className="session-trace-head"><i aria-hidden="true" /><code>orchestration.flow</code><span className="langfuse-type type-span">Span</span></div>

        <div className={`session-block block-strategy ${active === 0 ? "is-new" : ""}`}>
          <span className="session-block-label">Strategy → as_type=&quot;{chosen.asType}&quot;</span>
          <div className="orchestration-choices" role="group" aria-label="Strategy type">{strategies.map((item, index) => <button key={item.key} aria-pressed={strategy === index} onClick={() => setStrategy(index)}><code>{item.key}</code></button>)}</div>
        </div>

        {active >= 1 && <div className={`session-block block-decisions ${active === 1 ? "is-new" : ""}`}>
          <span className="session-block-label">Steps &amp; decisions</span>
          <ol className="orchestration-flow">{decisions.map(item => {
            const taken = item.kind === "fallback" ? path.key === "business_fallback" : path.key === "success" || item.kind === "tool";
            return <li key={item.then} className={`flow-${item.kind} ${active >= 2 && taken ? "is-taken" : ""} ${active >= 2 && !taken ? "is-skipped" : ""}`}><code className="flow-when">if {item.when}</code><ArrowRight size={13} aria-hidden="true" /><code className="flow-then">{item.then}</code></li>;
          })}</ol>
        </div>}

        {active >= 2 && <div className={`session-block block-outcome ${active === 2 ? "is-new" : ""}`}>
          <span className="session-block-label">Final path</span>
          <div className="orchestration-choices orchestration-outcomes" role="group" aria-label="Final path">{outcomes.map((item, index) => {
            const Icon = item.icon;
            return <button key={item.key} className={`outcome-${item.key}`} aria-pressed={outcome === index} onClick={() => setOutcome(index)}><Icon size={14} aria-hidden="true" />{item.label}</button>;
          })}</div>
          <p className="orchestration-outcome-detail">{path.detail}{path.signal && <> · control signal <code>{path.signal}</code></>}</p>
        </div>}

        {active >= 3 && <div className="session-block block-boundary is-new">
          <span className="session-block-label">Who owns what</span>
          <div className="orchestration-boundary">
            <div><strong>Layer 2 · business</strong><ul>{stays.map(item => <li key={item}>{item}</li>)}</ul></div>
            <ArrowRight className="boundary-arrow" size={18} aria-hidden="true" />
            <div className="boundary-l4"><strong>Layer 4 · LiteLLM Router / Proxy</strong><ul>{moves.map(item => <li key={item}>{item}</li>)}</ul></div>
          </div>
        </div>}

        {next && <div className="session-block session-next" aria-hidden="true">Next: {next.title}</div>}
      </div>
    </div>

    <p className="session-caption"><strong>{current.title}.</strong> {props[current.key]}</p>
    <div className="overview-navigation"><span aria-live="polite">Step {active + 1} of 4</span><span className="architecture-demo-note">Demo data only · no live telemetry</span></div>
  </section>;
}
