"use client";

import "./presentation.css";
import { OverviewNavigation } from "./overview-navigation";
import { PresentationHeading } from "./presentation-heading";
import { LangfuseOverviewCanvas } from "./langfuse-overview";
import { ArchitectureLayersCanvas } from "./architecture-layers";
import { SessionLayerCanvas } from "./session-layer";
import { OrchestrationLayerCanvas } from "./orchestration-layer";
import { OperationsLayerCanvas } from "./operations-layer";
import { InferenceLayerCanvas } from "./inference-layer";
import { TracingPrincipleCanvas } from "./tracing-principle";
import { ClosingLinksCanvas } from "./closing-links";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createLibrary, defineComponent, Renderer } from "@openuidev/react-lang";
import { ArrowRight, Sparkles } from "lucide-react";
import { z } from "zod/v4";
import { presentationSteps, presentationTitleProps, presentationPhotoProps, presentationReplySchema, presentationPhotoSchema, langfuseOverviewProps, architectureLayersProps, sessionLayerProps, orchestrationLayerProps, operationsLayerProps, inferenceLayerProps, tracingPrincipleProps, closingLinksProps, type PresentationReply, type PresentationStepId } from "@/lib/shared/presentation-contract";

const PhotoContext = createContext<z.infer<typeof presentationPhotoSchema> | null>(null);
function OpeningPhoto() {
  const photo = useContext(PhotoContext);
  const [unavailable, setUnavailable] = useState(() => !photo || Date.parse(photo.expiresAt) <= Date.now());
  useEffect(() => {
    if (!photo) return;
    const timer = setTimeout(() => setUnavailable(true), Math.max(0, Date.parse(photo.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [photo]);
  if (!photo || unavailable) return <div className="photo-unavailable" role="status">Presentation image unavailable or access expired. Reload and start again to refresh access.</div>;
  // Private signed image: no optimizer cache or third-party proxy.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="presentation-image" src={photo.url} alt="Presentation opening photograph" referrerPolicy="no-referrer" onError={() => setUnavailable(true)} />;
}
const PresentationTitle = defineComponent({ name: "PresentationTitle", description: "Animated opening title", props: presentationTitleProps, component: ({ props }) => <PresentationHeading title="Langfuse" punctuation=":" level="h1" label={props.title} subtitle={<>Illuminating the <span className="presentation-highlight">black box</span> in the AI era</>} /> });
const PresentationPhoto = defineComponent({ name: "PresentationPhoto", description: "Opening photo", props: presentationPhotoProps, component: () => <OpeningPhoto /> });
const LangfuseOverview = defineComponent({ name: "LangfuseOverview", description: "Four pillars of Langfuse", props: langfuseOverviewProps, component: ({ props }) => <LangfuseOverviewCanvas {...props} /> });
const ArchitectureLayers = defineComponent({ name: "ArchitectureLayers", description: "Four-layer architecture overview", props: architectureLayersProps, component: ({ props }) => <ArchitectureLayersCanvas {...props} /> });
const SessionLayer = defineComponent({ name: "SessionLayer", description: "Layer 1 interaction session walkthrough", props: sessionLayerProps, component: ({ props }) => <SessionLayerCanvas {...props} /> });
const OrchestrationLayer = defineComponent({ name: "OrchestrationLayer", description: "Layer 2 orchestration walkthrough", props: orchestrationLayerProps, component: ({ props }) => <OrchestrationLayerCanvas {...props} /> });
const OperationsLayer = defineComponent({ name: "OperationsLayer", description: "Layer 3 deterministic operations walkthrough", props: operationsLayerProps, component: ({ props }) => <OperationsLayerCanvas {...props} /> });
const InferenceLayer = defineComponent({ name: "InferenceLayer", description: "Layer 4 model inference walkthrough", props: inferenceLayerProps, component: ({ props }) => <InferenceLayerCanvas {...props} /> });
const TracingPrinciple = defineComponent({ name: "TracingPrinciple", description: "Tracing principle with an event sorter", props: tracingPrincipleProps, component: ({ props }) => <TracingPrincipleCanvas {...props} /> });
const ClosingLinks = defineComponent({ name: "ClosingLinks", description: "Closing QR links", props: closingLinksProps, component: ({ props }) => <ClosingLinksCanvas {...props} /> });
const Response = defineComponent({ name: "Response", description: "Presentation canvas", props: z.object({ children: z.array(z.union([PresentationTitle.ref, PresentationPhoto.ref, LangfuseOverview.ref, ArchitectureLayers.ref, SessionLayer.ref, OrchestrationLayer.ref, OperationsLayer.ref, InferenceLayer.ref, TracingPrinciple.ref, ClosingLinks.ref])) }), component: ({ props, renderNode }) => <div className="presentation-canvas">{renderNode(props.children)}</div> });
const library = createLibrary({ root: "Response", components: [Response, PresentationTitle, PresentationPhoto, LangfuseOverview, ArchitectureLayers, SessionLayer, OrchestrationLayer, OperationsLayer, InferenceLayer, TracingPrinciple, ClosingLinks] });
/** Steps whose canvas has internal topics; the primary button walks them before the next chapter. */
const topicCounts: Partial<Record<PresentationStepId, number>> = { "what-is-langfuse": 4, "architecture-layers": 4, "layer-session": 4, "layer-orchestration": 4, "layer-operations": 4, "layer-inference": 4 };
const topicLabels: Partial<Record<PresentationStepId, string>> = { "architecture-layers": "Next layer", "layer-session": "Next step", "layer-orchestration": "Next step", "layer-operations": "Next step", "layer-inference": "Next step" };

export function PresentationChat({ active, showSource }: { active: boolean; showSource: boolean }) {
  const [turns, setTurns] = useState<{ step: PresentationStepId; reply?: PresentationReply }[]>([]);
  const [topics, setTopics] = useState<Partial<Record<PresentationStepId, number>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const latestTurn = useRef<HTMLDivElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!active || !turns.length) return;
    const target = turns.at(-1)?.reply ? latestTurn.current : end.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active, turns, busy]);
  const completed = turns.filter(turn => turn.reply).length;
  const nextStep = presentationSteps[completed];
  const currentStep = turns.at(-1)?.reply?.step;
  const topicCount = currentStep ? topicCounts[currentStep] ?? 0 : 0;
  const currentTopic = currentStep ? topics[currentStep] ?? 0 : 0;
  const hasTopics = topicCount > 0;
  const advancingTopic = hasTopics && currentTopic < topicCount - 1;
  const awaitingChapter = hasTopics && !advancingTopic && !nextStep;
  const selectTopic = (step: PresentationStepId) => (topic: number) => setTopics(previous => ({ ...previous, [step]: topic }));
  async function advance() {
    if (controller.current) return;
    if (advancingTopic && currentStep) { selectTopic(currentStep)(Math.min(currentTopic + 1, topicCount - 1)); return; }
    if (!nextStep) return;
    const request = new AbortController();
    controller.current = request;
    setTurns(previous => previous.some(turn => turn.step === nextStep.id) ? previous : [...previous, { step: nextStep.id }]);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "presentation", step: nextStep.id }), signal: request.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The presentation is unavailable.");
      const reply = presentationReplySchema.parse(body);
      if (reply.step !== nextStep.id) throw new Error("The assistant returned the wrong presentation step. Please retry.");
      setTurns(previous => previous.map(turn => turn.step === nextStep.id ? { ...turn, reply } : turn));
    } catch (failure) {
      if (!request.signal.aborted) setError(failure instanceof Error ? failure.message : "The presentation is unavailable.");
    } finally {
      if (!request.signal.aborted) { controller.current = null; setBusy(false); }
    }
  }
  const label = advancingTopic ? ((currentStep && topicLabels[currentStep]) ?? "Next topic") : hasTopics ? "Next" : !nextStep ? "Finish" : completed === 0 ? "Start" : "Next";
  return <div className="presentation-view" hidden={!active}>
    <main className="chat-main has-messages"><div className="messages presentation-messages" aria-live="polite" aria-relevant="additions">
      {turns.map((turn, index) => <div className="presentation-turn" ref={index === turns.length - 1 ? latestTurn : undefined} key={turn.step}>
        <article className="message user"><div className="message-content"><p>{presentationSteps.find(step => step.id === turn.step)?.prompt}</p></div></article>
        {turn.reply && <article className="message assistant"><div className="message-avatar"><Sparkles size={18} /></div><div className="message-content"><div className="message-name">Faro assistant <span>PRESENTATION</span></div><OverviewNavigation.Provider value={{ topic: topics[turn.step] ?? 0, selectTopic: selectTopic(turn.step) }}><PhotoContext.Provider value={turn.reply.step === "opening" ? turn.reply.photo : null}><Renderer library={library} response={turn.reply.source} isStreaming={false} /></PhotoContext.Provider></OverviewNavigation.Provider>{showSource && <details className="source-code" open><summary>OpenUI Lang · presentation</summary><pre>{turn.reply.source}</pre></details>}</div></article>}
      </div>)}
      {busy && <div className="thinking" role="status"><Sparkles size={17} /><span>Preparing the presentation canvas</span><span className="thinking-dots">···</span></div>}
      <div ref={end} />
    </div></main>
    <div className="composer-area"><div className="composer-inner presentation-controls">
      {error && <p className="agent-error" role="alert">{error}</p>}
      <button className="presentation-step-button" onClick={advance} disabled={busy || (!advancingTopic && !nextStep)} aria-describedby={awaitingChapter ? "chapter-pending" : !nextStep && !advancingTopic ? "finish-pending" : undefined}>{busy ? "Preparing…" : label}<ArrowRight size={18} /></button>
      {awaitingChapter && <p id="chapter-pending" className="presentation-pending">The next chapter has not been defined yet.</p>}
      {!nextStep && !advancingTopic && !awaitingChapter && <p id="finish-pending" className="presentation-pending">End of the presentation. Thanks for following along.</p>}
    </div></div>
  </div>;
}
