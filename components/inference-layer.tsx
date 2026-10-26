"use client";

import { useContext, useState } from "react";
import { OverviewNavigation } from "./overview-navigation";
import { PresentationHeading } from "./presentation-heading";
import { CircleCheck, CircleX, CornerDownRight, EyeOff, FileText, RefreshCw } from "lucide-react";
import { z } from "zod/v4";
import { inferenceLayerProps, inferenceSteps } from "@/lib/shared/presentation-contract";

/** Illustrative LiteLLM Router config and usage; no live telemetry. */
const run = {
  primary: { model: "deepseek/deepseek-chat", tokens: "812 → 164", cost: "$0.0004", latency: "640 ms", retries: "0", error: "none" },
  fallback: { model: "gemini/gemini-2.5-flash", tokens: "806 → 171", cost: "$0.0006", latency: "1,180 ms", retries: "1", error: "429 rate limited (deepseek)" },
} as const;
const modes = [
  { key: "otel", label: "SDK v3 · langfuse_otel", note: "inherits the active context" },
  { key: "classic", label: "Classic · langfuse", note: "trace_id + parent_observation_id" },
] as const;

export function InferenceLayerCanvas(props: z.infer<typeof inferenceLayerProps>) {
  const [localStep, setLocalStep] = useState(0);
  const [wrapped, setWrapped] = useState(false);
  const [modeIndex, setModeIndex] = useState(0);
  const [fellBack, setFellBack] = useState(false);
  const [masked, setMasked] = useState(true);
  const navigation = useContext(OverviewNavigation);
  const active = navigation?.topic ?? localStep;
  const setActive = navigation?.selectTopic ?? setLocalStep;
  const current = inferenceSteps[active] ?? inferenceSteps[0];
  const next = inferenceSteps[active + 1];
  const mode = modes[active >= 1 ? modeIndex : 0];
  const showWrapped = active === 0 && wrapped;
  const usage = fellBack ? run.fallback : run.primary;
  /** Code grows step by step and mirrors the interactive choices. */
  const codeLines: { step: number; text: string; changedAt?: number }[] = [
    { step: 0, text: "import litellm" },
    mode.key === "otel"
      ? { step: 0, text: 'litellm.callbacks = ["langfuse_otel"]' }
      : { step: 0, text: 'litellm.success_callback = ["langfuse"]', changedAt: 1 },
    { step: 3, text: `langfuse = Langfuse(mask=${masked ? "mask_pii" : "None"})  # SDK masking` },
    { step: 3, text: 'prompt = langfuse.get_prompt("photo-caption")  # v3' },
    ...(showWrapped ? [
      { step: 0, text: '@observe(as_type="generation")  # ✗ duplicates it' },
      { step: 0, text: "def call_model(messages):" },
      { step: 0, text: '    return litellm.completion(model="faro-chat", messages=messages)' },
    ] : [
      { step: 0, text: "response = litellm.completion(" },
      { step: 0, text: '    model="faro-chat",  # model_group (Router)' },
      active >= 3 ? { step: 3, text: "    messages=prompt.compile(question=question)," } : { step: 0, text: "    messages=messages," },
      { step: 2, text: "    temperature=0.2, max_tokens=512," },
      ...(mode.key === "classic" ? [
        { step: 1, text: '    metadata={"trace_id": trace_id,' },
        { step: 1, text: `              "parent_observation_id": span_id${active >= 3 ? "," : "},"}` },
        ...(active >= 3 ? [{ step: 3, text: '              "prompt": prompt},' }] : []),
      ] : active >= 3 ? [{ step: 3, text: '    metadata={"prompt": prompt},' }] : []),
      { step: 0, text: ")" },
    ]),
    { step: 2, text: "# captured: model, fallback, tokens, cost, latency, retries, errors" },
  ];
  return <section className="session-layer inference-layer" aria-label="Layer 4: model inference">
    <PresentationHeading title="Layer 4" punctuation=":" subtitle={<>Model <span className="presentation-highlight">inference</span></>} />
    <p className="session-crumb"><code>model.inference</code><span className="langfuse-type type-generation">Generation</span><span>nested in the current span · recorded by LiteLLM</span></p>
    <p className="session-summary">{props.summary}</p>

    <div className="session-stepper" role="group" aria-label="Walk through a model call">
      {inferenceSteps.map((item, index) => <button key={item.key} className={`session-step step-${["entrypoint", "identity", "context", "cost"][index]} ${index < active ? "is-done" : ""}`} aria-pressed={active === index} onClick={() => setActive(index)}>
        <span className="session-step-dot" aria-hidden="true">{index < active ? "✓" : index + 1}</span>
        <span className="session-step-text"><strong>{item.title}</strong><small>{item.hint}</small></span>
      </button>)}
    </div>

    <div className="session-stage">
      <pre className={`session-code ${showWrapped ? "has-antipattern" : ""}`} aria-label="Instrumentation code"><code>{codeLines.filter(line => line.step <= active).map((line, index) => <span key={index} className={line.step === active || line.changedAt === active ? "is-new" : undefined}>{line.text}{"\n"}</span>)}</code></pre>

      <div className="session-trace inference-generation" role="status" aria-label={`Generation after step ${active + 1}: ${current.title}`}>
        <div className="session-trace-head"><i aria-hidden="true" /><code>model.inference</code><span className="langfuse-type type-generation">Generation</span></div>

        <div className={`session-block block-automatic ${active === 0 ? "is-new" : ""}`}>
          <span className="session-block-label">Automatic via LiteLLM</span>
          {active === 0 && <button className="session-proxy-toggle inference-wrap-toggle" aria-pressed={wrapped} onClick={() => setWrapped(value => !value)}>Also wrap with @observe(as_type=&quot;generation&quot;)?</button>}
          <ul className="inference-gens">
            <li className="is-ok"><CircleCheck size={14} aria-hidden="true" /><code>litellm.completion</code><span>1 Generation from the callback</span></li>
            {showWrapped && <li className="is-dup"><CircleX size={14} aria-hidden="true" /><code>call_model</code><span>duplicate Generation, double tokens &amp; cost</span></li>}
          </ul>
        </div>

        {active >= 1 && <div className={`session-block block-linking ${active === 1 ? "is-new" : ""}`}>
          <span className="session-block-label">Linked to the tree · {mode.note}</span>
          <div className="orchestration-choices" role="group" aria-label="Callback">{modes.map((item, index) => <button key={item.key} aria-pressed={modeIndex === index} onClick={() => setModeIndex(index)}><code>{item.label}</code></button>)}</div>
          <ol className="inference-tree">
            <li><code>interaction.session</code><span className="langfuse-type type-trace">Trace</span></li>
            <li style={{ marginLeft: 14 }}><CornerDownRight size={12} aria-hidden="true" /><code>orchestration.flow</code><span className="langfuse-type type-span">Span</span><small>current span</small></li>
            <li style={{ marginLeft: 28 }} className="is-gen"><CornerDownRight size={12} aria-hidden="true" /><code>model.inference</code><span className="langfuse-type type-generation">Generation</span></li>
          </ol>
        </div>}

        {active >= 2 && <div className={`session-block block-capture ${active === 2 ? "is-new" : ""}`}>
          <span className="session-block-label">Captured by LiteLLM</span>
          <button className="session-proxy-toggle inference-fallback-toggle" aria-pressed={fellBack} onClick={() => setFellBack(value => !value)}><RefreshCw size={13} aria-hidden="true" />Primary provider fails (429)</button>
          <dl className="session-context inference-capture">
            <div><dt>model_group</dt><dd>faro-chat</dd></div>
            <div className={fellBack ? "is-changed" : undefined}><dt>model used</dt><dd>{usage.model}</dd></div>
            <div><dt>params</dt><dd>temp 0.2 · max 512</dd></div>
            <div><dt>tokens in → out</dt><dd>{usage.tokens}</dd></div>
            <div><dt>cost</dt><dd>{usage.cost}</dd></div>
            <div><dt>latency</dt><dd>{usage.latency}</dd></div>
            <div className={fellBack ? "is-changed" : undefined}><dt>retries</dt><dd>{usage.retries}</dd></div>
            <div className={fellBack ? "is-error" : undefined}><dt>provider error</dt><dd>{usage.error}</dd></div>
          </dl>
        </div>}

        {active >= 3 && <div className="session-block block-prompt is-new">
          <span className="session-block-label">Prompt &amp; privacy</span>
          <div className="inference-prompt"><FileText size={14} aria-hidden="true" /><span>prompt</span><code>photo-caption · v3</code><small>reference from Prompt Management, not raw text</small></div>
          <button className="session-proxy-toggle ops-summarize" aria-pressed={masked} onClick={() => setMasked(value => !value)}><EyeOff size={14} aria-hidden="true" />Mask sensitive data in the SDK</button>
          <div className={`ops-io ${masked ? "is-safe" : "is-risky"}`}><code>input: &quot;Send the album to {masked ? "[EMAIL]" : "ana@example.com"}&quot;</code></div>
        </div>}

        {next && <div className="session-block session-next" aria-hidden="true">Next: {next.title}</div>}
      </div>
    </div>

    <p className="session-caption"><strong>{current.title}.</strong> {props[current.key]}</p>
    <div className="overview-navigation"><span aria-live="polite">Step {active + 1} of 4</span><span className="architecture-demo-note">Demo data only · no live telemetry</span></div>
  </section>;
}
