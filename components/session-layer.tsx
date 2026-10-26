"use client";

import { useContext, useState } from "react";
import { OverviewNavigation } from "./overview-navigation";
import { PresentationHeading } from "./presentation-heading";
import { CircleCheck, KeyRound } from "lucide-react";
import { z } from "zod/v4";
import { sessionLayerProps, sessionSteps } from "@/lib/shared/presentation-contract";

/** Code grows step by step: each line belongs to the step that introduces it. */
const codeLines: { step: number; text: string }[] = [
  { step: 0, text: "@observe()" },
  { step: 0, text: "def handle_message(request):" },
  { step: 1, text: "    langfuse.update_current_trace(" },
  { step: 1, text: "        user_id=request.user_id," },
  { step: 1, text: "        session_id=request.session_id," },
  { step: 1, text: '        tags=["smb", "whatsapp"],' },
  { step: 2, text: '        metadata={"product": "photo-assistant",' },
  { step: 2, text: '                  "plan": "pro", "region": "eu-west",' },
  { step: 2, text: '                  "legal_entity": "GDG Faro",' },
  { step: 2, text: '                  "customer": "external"},' },
  { step: 1, text: "    )" },
  { step: 0, text: "    return orchestrate(request)" },
  { step: 3, text: "# cost: rolled up by Langfuse, no code needed" },
];
/** Illustrative values only; this app sends no telemetry to Langfuse. */
const identity = [["user_id", "u_8f2c"], ["session_id", "s_41a"]] as const;
const tags = ["smb", "whatsapp"] as const;
const context = [["product", "photo-assistant"], ["plan", "pro"], ["region", "eu-west"], ["legal_entity", "GDG Faro"], ["customer", "external"]] as const;
const generations = [["Generation 1", 0.0042], ["Generation 2", 0.0031], ["Generation 3", 0.0053]] as const;
const traceTotal = generations.reduce((sum, [, cost]) => sum + cost, 0);
const money = (value: number) => `$${value.toFixed(4)}`;

export function SessionLayerCanvas(props: z.infer<typeof sessionLayerProps>) {
  const [localStep, setLocalStep] = useState(0);
  const [proxy, setProxy] = useState(false);
  const navigation = useContext(OverviewNavigation);
  const active = navigation?.topic ?? localStep;
  const setActive = navigation?.selectTopic ?? setLocalStep;
  const current = sessionSteps[active] ?? sessionSteps[0];
  const next = sessionSteps[active + 1];
  return <section className="session-layer" aria-label="Layer 1: interaction session">
    <PresentationHeading title="Layer 1" punctuation=":" subtitle={<>The <span className="presentation-highlight">interaction session</span></>} />
    <p className="session-crumb"><code>interaction.session</code><span className="langfuse-type type-trace">Trace</span><span>root of the AI execution tree</span></p>
    <p className="session-summary">{props.summary}</p>

    <div className="session-stepper" role="group" aria-label="Build the root trace">
      {sessionSteps.map((item, index) => <button key={item.key} className={`session-step step-${item.key} ${index < active ? "is-done" : ""}`} aria-pressed={active === index} onClick={() => setActive(index)}>
        <span className="session-step-dot" aria-hidden="true">{index < active ? "✓" : index + 1}</span>
        <span className="session-step-text"><strong>{item.title}</strong><small>{item.hint}</small></span>
      </button>)}
    </div>

    <div className="session-stage">
      <pre className="session-code" aria-label="Instrumentation code"><code>{codeLines.filter(line => line.step <= active).map((line, index) => <span key={index} className={line.step === active ? "is-new" : undefined}>{line.text}{"\n"}</span>)}</code></pre>

      <div className={`session-trace step-${current.key}`} role="status" aria-label={`Root trace after step ${active + 1}: ${current.title}`}>
        <div className="session-trace-head"><i aria-hidden="true" /><code>interaction.session</code><span className="langfuse-type type-trace">Trace</span></div>
        <div className="session-block block-entrypoint is-on">
          <span className="session-block-label">Interaction</span>
          <div className="session-io"><span>“Show me DevFest photos”</span><span aria-hidden="true">→</span><span>4 photos <CircleCheck size={13} aria-hidden="true" /> final outcome</span></div>
        </div>
        {active >= 1 && <div className={`session-block block-identity ${active === 1 ? "is-new" : ""}`}>
          <span className="session-block-label">Identity</span>
          <div className="session-chips">{identity.map(([key, value]) => <span key={key}><code>{key}</code>{value}</span>)}{tags.map(tag => <span key={tag} className="session-tag">#{tag}</span>)}</div>
        </div>}
        {active >= 2 && <div className={`session-block block-context ${active === 2 ? "is-new" : ""}`}>
          <span className="session-block-label">Business context · metadata</span>
          <dl className="session-context">{context.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
        </div>}
        {active >= 3 && <div className="session-block block-cost is-new">
          <span className="session-block-label">Cost rollup · automatic</span>
          <ul className="session-generations">{generations.map(([name, cost]) => <li key={name}><span>{name}</span><i style={{ width: `${(cost / traceTotal) * 100}%` }} aria-hidden="true" /><b>{money(cost)}</b></li>)}</ul>
          <div className="session-totals"><span>Trace <b>{money(traceTotal)}</b></span><span>Session · 3 traces <b>$0.0381</b></span></div>
          <button className="session-proxy-toggle" aria-pressed={proxy} onClick={() => setProxy(value => !value)}><KeyRound size={14} aria-hidden="true" />Optional · LiteLLM Proxy virtual key</button>
          {proxy && <div className="session-proxy"><span>team-growth key · budget $50 / month</span><div className="session-budget" role="img" aria-label="18% of budget used"><i style={{ width: "18%" }} /></div><small>Attribution + cost control in one place</small></div>}
        </div>}
        {next && <div className="session-block session-next" aria-hidden="true">Next: {next.title}</div>}
      </div>
    </div>

    <p className="session-caption"><strong>{current.title}.</strong> {props[current.key]}</p>
    <div className="overview-navigation"><span aria-live="polite">Step {active + 1} of 4</span><span className="architecture-demo-note">Demo data only · no live telemetry</span></div>
  </section>;
}
