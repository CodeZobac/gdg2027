"use client";

import { createLibrary, defineComponent, Renderer } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { textProps, type ChatReply } from "@/lib/shared/chat-contract";
import { architectureLayersProps, closingLinksProps, inferenceLayerProps, langfuseOverviewProps, operationsLayerProps, orchestrationLayerProps, sessionLayerProps, tracingPrincipleProps } from "@/lib/shared/presentation-contract";
import { LangfuseOverviewCanvas } from "./langfuse-overview";
import { ArchitectureLayersCanvas } from "./architecture-layers";
import { SessionLayerCanvas } from "./session-layer";
import { OrchestrationLayerCanvas } from "./orchestration-layer";
import { OperationsLayerCanvas } from "./operations-layer";
import { InferenceLayerCanvas } from "./inference-layer";
import { TracingPrincipleCanvas } from "./tracing-principle";
import { ClosingLinksCanvas } from "./closing-links";

/** The same trusted slide canvases as the Presentation tab, embedded on demand. */
const Text = defineComponent({ name: "Text", description: "Plain text", props: textProps, component: ({ props }) => <>{props.text.split(/\n+/).map((line, index) => <p key={index}>{line}</p>)}</> });
const wrap = (node: React.ReactNode) => <div className="chat-slide">{node}</div>;
const slides = [
  defineComponent({ name: "LangfuseOverview", description: "Langfuse overview", props: langfuseOverviewProps, component: ({ props }) => wrap(<LangfuseOverviewCanvas {...props} />) }),
  defineComponent({ name: "ArchitectureLayers", description: "Four layers", props: architectureLayersProps, component: ({ props }) => wrap(<ArchitectureLayersCanvas {...props} />) }),
  defineComponent({ name: "SessionLayer", description: "Layer 1", props: sessionLayerProps, component: ({ props }) => wrap(<SessionLayerCanvas {...props} />) }),
  defineComponent({ name: "OrchestrationLayer", description: "Layer 2", props: orchestrationLayerProps, component: ({ props }) => wrap(<OrchestrationLayerCanvas {...props} />) }),
  defineComponent({ name: "OperationsLayer", description: "Layer 3", props: operationsLayerProps, component: ({ props }) => wrap(<OperationsLayerCanvas {...props} />) }),
  defineComponent({ name: "InferenceLayer", description: "Layer 4", props: inferenceLayerProps, component: ({ props }) => wrap(<InferenceLayerCanvas {...props} />) }),
  defineComponent({ name: "TracingPrinciple", description: "What to trace", props: tracingPrincipleProps, component: ({ props }) => wrap(<TracingPrincipleCanvas {...props} />) }),
  defineComponent({ name: "ClosingLinks", description: "Links", props: closingLinksProps, component: ({ props }) => wrap(<ClosingLinksCanvas {...props} />) }),
] as const;
const Response = defineComponent({ name: "Response", description: "Chat answer", props: z.object({ children: z.array(z.union([Text.ref, slides[0].ref, slides[1].ref, slides[2].ref, slides[3].ref, slides[4].ref, slides[5].ref, slides[6].ref, slides[7].ref])) }), component: ({ props, renderNode }) => <div className="openui-response chat-answer">{renderNode(props.children)}</div> });
const library = createLibrary({ root: "Response", components: [Response, Text, ...slides] });

export function ChatResponse({ reply, showSource }: { reply: ChatReply; showSource: boolean }) {
  return <><Renderer library={library} response={reply.source} isStreaming={false} />{showSource && <details className="source-code" open><summary>OpenUI Lang · chat answer</summary><pre>{reply.source}</pre></details>}</>;
}
