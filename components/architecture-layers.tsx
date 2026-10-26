"use client";

import { useContext, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { OverviewNavigation } from "./overview-navigation";
import { PresentationHeading } from "./presentation-heading";
import { ChevronDown, Gauge, Network, Sparkles } from "lucide-react";
import { z } from "zod/v4";
import { architectureInstrumenters, architectureLayers, architectureLayersProps, type ArchitectureInstrumenter } from "@/lib/shared/presentation-contract";

const lensIcons = { langfuse: Network, litellm: Gauge, scores: Sparkles } as const;
/** Illustrative values only; this app sends no telemetry to Langfuse. */
const demoScores: Partial<Record<(typeof architectureLayers)[number]["key"], string>> = { session: "helpfulness 0.92", inference: "faithfulness 0.88" };
const demoGeneration = [["Tokens", "1,240"], ["Cost", "$0.0042"], ["Latency", "620 ms"], ["Provider errors", "0"]] as const;

function isLit(lens: ArchitectureInstrumenter, layer: (typeof architectureLayers)[number]) {
  return lens === "scores" ? layer.key in demoScores : layer.instrumentedBy === lens;
}

/** Fixed architecture facts and demo; the AI supplies only the summary and layer descriptions. */
export function ArchitectureLayersCanvas(props: z.infer<typeof architectureLayersProps>) {
  const [localLayer, setLocalLayer] = useState(0);
  const [lens, setLens] = useState<ArchitectureInstrumenter>("langfuse");
  const navigation = useContext(OverviewNavigation);
  const active = navigation?.topic ?? localLayer;
  const setActive = navigation?.selectTopic ?? setLocalLayer;
  const headingRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const previous = useRef(active);
  const id = useId();
  useEffect(() => {
    if (previous.current !== active) {
      const heading = headingRefs.current[active];
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
    previous.current = active;
  }, [active]);
  const selectedLens = architectureInstrumenters.find(item => item.key === lens) ?? architectureInstrumenters[0];
  return <section className="architecture-layers" aria-label="Four-layer architecture overview">
    <PresentationHeading title="Architecture" punctuation=":" subtitle={<>Four layers of the <span className="presentation-highlight">AI execution tree</span></>} />
    <p className="architecture-summary">{props.summary}</p>

    <div className="architecture-lenses" role="group" aria-label="Who instruments each layer">
      {architectureInstrumenters.map(item => {
        const Icon = lensIcons[item.key];
        return <button key={item.key} className={`architecture-lens lens-${item.key}`} aria-pressed={lens === item.key} onClick={() => setLens(item.key)}>
          <span className="architecture-lens-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.9} /></span>
          <span className="architecture-lens-text"><strong>{item.name}</strong><code>{item.via}</code></span>
          <span className="architecture-lens-covers">{item.covers}</span>
        </button>;
      })}
    </div>
    <p className="architecture-lens-readout" role="status"><strong>{selectedLens.name}</strong> → {selectedLens.covers}: {selectedLens.detail}.</p>

    <ol className={`execution-tree lens-${lens}-active`} aria-label="AI execution tree">
      {architectureLayers.map((layer, index) => {
        const expanded = active === index;
        const lit = isLit(lens, layer);
        const by = architectureInstrumenters.find(item => item.key === layer.instrumentedBy);
        return <li key={layer.key} className={`execution-layer layer-${layer.key} ${expanded ? "is-expanded" : ""} ${lit ? "is-lit" : "is-dimmed"}`} style={{ "--depth": index } as CSSProperties}>
          <h3 className="execution-layer-title"><button className="execution-layer-heading" id={`${id}-heading-${index}`} ref={element => { headingRefs.current[index] = element; }} aria-expanded={expanded} aria-controls={`${id}-panel-${index}`} onClick={() => { setActive(index); headingRefs.current[index]?.focus(); }}>
            <span className="execution-layer-number" aria-hidden="true">{index + 1}</span>
            <span className="execution-layer-names"><code>{layer.name}</code><span>{layer.role}</span></span>
            {lens === "scores" && demoScores[layer.key] && <span className="execution-score">Score · {demoScores[layer.key]}</span>}
            <span className={`langfuse-type type-${layer.type.toLowerCase()}`}>{layer.type}</span>
            <ChevronDown className="topic-chevron" size={16} aria-hidden="true" />
          </button></h3>
          <div className="execution-layer-panel" id={`${id}-panel-${index}`} role="region" aria-labelledby={`${id}-heading-${index}`} hidden={!expanded}>
            <div className="execution-instrumentation">
              <span className="execution-label">Instrumentation · {by?.name}</span>
              <div className="execution-code">{layer.instrumentation.map(code => <code key={code}>{code}</code>)}</div>
              <span className="execution-note">{layer.note} → Langfuse <strong>{layer.type}</strong></span>
            </div>
            {layer.key === "inference" && <div className="execution-generation"><span className="demo-data-label">Demo data · captured by the LiteLLM callback</span><dl>{demoGeneration.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl></div>}
            <p className="execution-description">{props[layer.key]}</p>
          </div>
        </li>;
      })}
    </ol>
    <div className="overview-navigation"><span aria-live="polite">Layer {active + 1} of 4</span><span className="architecture-demo-note">Demo data only · no live telemetry</span></div>
  </section>;
}
