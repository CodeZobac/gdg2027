"use client";

import { useContext, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { OverviewNavigation } from "./overview-navigation";
import { PresentationHeading } from "./presentation-heading";
import { Activity, FileText, CircleCheck, ChartNoAxesColumnIncreasing, ChevronDown, ArrowRight } from "lucide-react";
import { z } from "zod/v4";
import { langfuseOverviewProps, overviewCategories } from "@/lib/shared/presentation-contract";

const icons = [Activity, FileText, CircleCheck, ChartNoAxesColumnIncreasing];
const traceNodes = [
  { name: "Request", latency: "840 ms", tokens: "1,240", cost: "$0.0042" },
  { name: "Model", latency: "620 ms", tokens: "1,240", cost: "$0.0042" },
  { name: "Tool", latency: "140 ms", tokens: "0", cost: "$0.0000" },
  { name: "Retrieval", latency: "80 ms", tokens: "0", cost: "$0.0000" },
];
function TraceDemo() {
  const [selected, setSelected] = useState(0);
  const node = traceNodes[selected];
  return <div className="teaching-demo trace-demo">
    <span className="demo-data-label">Demo data</span>
    <div className="trace-tree" role="group" aria-label="Select a trace node">{traceNodes.map((item, index) => <button key={item.name} className={`trace-node ${index === 0 ? "trace-root" : ""}`} aria-pressed={selected === index} onClick={() => setSelected(index)}>{index === 0 ? "↓ " : "↳ "}{item.name}</button>)}</div>
    <div className="demo-readout" role="status"><span>{node.name} metrics</span><dl><div><dt>Latency</dt><dd>{node.latency}</dd></div><div><dt>Tokens</dt><dd>{node.tokens}</dd></div><div><dt>Cost</dt><dd>{node.cost}</dd></div></dl></div>
  </div>;
}
const promptStages = ["Edit", "Version", "Cache", "Deploy"] as const;
const promptDetails = [
  "Edit the prompt: Explain tracing in one sentence.",
  "Save a new version: v2 is ready for review.",
  "Cache v2: reuse the prompt without fetching it every time.",
  "Deploy v2: update the production label after initial app integration.",
];
function PromptDemo() {
  const [stage, setStage] = useState(0);
  return <div className="teaching-demo"><span className="demo-data-label">Demo data</span><div className="prompt-pipeline" role="group" aria-label="Prompt lifecycle">{promptStages.map((name, index) => <button key={name} className={index < stage ? "is-complete" : undefined} aria-pressed={stage === index} onClick={() => setStage(index)}><span>{index < stage ? "✓" : index + 1}</span>{name}{index < 3 && <ArrowRight size={12} aria-hidden="true" />}</button>)}</div><p className="demo-readout prompt-readout" role="status">{promptDetails[stage]}</p><button className="demo-action" onClick={() => setStage(stage + 1)} disabled={stage === 3}>Advance prompt <ArrowRight size={14} /></button></div>;
}
const versions = [
  { name: "v1", prompt: "Answer the question.", judge: "0.74", human: "3 / 5", code: "Missing JSON fields", pass: false },
  { name: "v2", prompt: "Answer with evidence and valid JSON.", judge: "0.91", human: "4 / 5", code: "JSON schema passed", pass: true },
];
function EvaluationDemo() {
  const [version, setVersion] = useState(0);
  const selected = versions[version];
  return <div className="teaching-demo"><span className="demo-data-label">Demo data · illustrative comparison</span><div className="evaluation-versions" role="group" aria-label="Compare prompt versions">{versions.map((item, index) => <button key={item.name} aria-pressed={version === index} onClick={() => setVersion(index)}><strong>{item.name}</strong><span>{item.prompt}</span></button>)}</div><div className="demo-readout" role="status"><span>{selected.name} · same demo dataset</span><dl><div><dt>Judge score</dt><dd>{selected.judge} <small>/ 1</small></dd></div><div><dt>Human rating</dt><dd>{selected.human}</dd></div></dl><div className={`code-check ${selected.pass ? "code-pass" : "code-fail"}`}><CircleCheck size={15} aria-hidden="true" />Code check: {selected.code}</div></div></div>;
}
const chartMetrics = [
  { name: "Quality", values: [82, 85, 79, 92, 88], labels: ["82%", "85%", "79%", "92%", "88%"], threshold: 80, thresholdLabel: "80% minimum", breach: 2 },
  { name: "Cost", values: [30, 40, 35, 85, 50], labels: ["$0.003", "$0.004", "$0.0035", "$0.0085", "$0.005"], threshold: 70, thresholdLabel: "$0.007 maximum", breach: 3 },
  { name: "Performance", values: [35, 45, 85, 50, 40], labels: ["350 ms", "450 ms", "850 ms", "500 ms", "400 ms"], threshold: 70, thresholdLabel: "700 ms maximum", breach: 2 },
];
function AnalyticsDemo() {
  const [metric, setMetric] = useState(0);
  const selected = chartMetrics[metric];
  return <div className="teaching-demo"><span className="demo-data-label">Demo data · five illustrative requests</span><div className="metric-switch" role="group" aria-label="Chart metric">{chartMetrics.map((item, index) => <button key={item.name} aria-pressed={metric === index} onClick={() => setMetric(index)}>{item.name}</button>)}</div><div className="demo-chart" role="img" aria-label={`${selected.name} demo chart. Threshold ${selected.thresholdLabel}. Values: ${selected.labels.join(", ")}. Alert on request ${selected.breach + 1}.`}><div className="demo-threshold" style={{ bottom: `${selected.threshold}%` }}><span>Threshold</span></div>{selected.values.map((value, index) => <div className={`demo-bar ${index === selected.breach ? "is-alert" : ""}`} key={index} style={{ "--bar-height": `${value}%` } as CSSProperties}><span>{index === selected.breach ? "! " : ""}{selected.labels[index]}</span><i /><small>{index + 1}</small></div>)}</div><p className="chart-alert" role="status">Demo alert · request {selected.breach + 1} crossed {selected.thresholdLabel}.</p></div>;
}
const demos = [TraceDemo, PromptDemo, EvaluationDemo, AnalyticsDemo];

/** Fixed teaching content and demos; the AI supplies only the short takeaway. */
export function LangfuseOverviewCanvas(props: z.infer<typeof langfuseOverviewProps>) {
  const [localTopic, setLocalTopic] = useState(0);
  const navigation = useContext(OverviewNavigation);
  const active = navigation?.topic ?? localTopic;
  const setActive = navigation?.selectTopic ?? setLocalTopic;
  const headingRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const previousTopic = useRef(active);
  useEffect(() => {
    if (previousTopic.current !== active) {
      const heading = headingRefs.current[active];
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
    previousTopic.current = active;
  }, [active]);
  function selectTopic(index: number) {
    setActive(index);
    headingRefs.current[index]?.focus();
  }
  return <section className="langfuse-overview" aria-label="What is Langfuse?">
    <PresentationHeading title="What is Langfuse" punctuation="?" subtitle={<>Open-source <span className="presentation-highlight">LLM engineering platform</span></>} />
    <p className="overview-demo-note">Interactive demonstrations · Demo data only. No Langfuse connection or actual app telemetry.</p>
    <div className="langfuse-category-grid">{overviewCategories.map((category, index) => {
      const Icon = icons[index];
      const Demo = demos[index];
      return <section className={`langfuse-category category-${category.key} ${active === index ? "is-expanded" : ""}`} key={category.key} aria-labelledby={`${id}-heading-${index}`}>
        <h3 className="langfuse-category-title"><button className="langfuse-category-heading" id={`${id}-heading-${index}`} ref={element => { headingRefs.current[index] = element; }} aria-expanded={active === index} aria-controls={`${id}-panel-${index}`} onClick={() => selectTopic(index)}><span className="langfuse-category-icon" aria-hidden="true"><Icon size={23} strokeWidth={1.8} /></span><span>{category.title}</span><span className="langfuse-category-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><ChevronDown className="topic-chevron" size={16} aria-hidden="true" /></button></h3>
        <div className="langfuse-topic-panel" id={`${id}-panel-${index}`} role="region" aria-labelledby={`${id}-heading-${index}`} hidden={active !== index}>
          <div className="teaching-points">{category.terms.map(term => <strong key={term}>{term}</strong>)}</div>
          <Demo />
          <p className="topic-takeaway">{props[category.key]}</p>
        </div>
      </section>;
    })}</div>
    <div className="overview-navigation"><span aria-live="polite">Topic {active + 1} of 4</span></div>
  </section>;
}
