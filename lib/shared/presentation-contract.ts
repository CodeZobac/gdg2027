import { z } from "zod/v4";

export const overviewCategories = [
  { key: "observability", title: "Observability & Tracing", terms: ["Hierarchical traces", "Latency, tokens and cost"] },
  { key: "promptManagement", title: "Prompt Management", terms: ["Version, edit, cache and deploy", "No application code changes"] },
  { key: "evaluation", title: "Evaluation & Experiments", terms: ["LLM-as-a-judge", "Human feedback"] },
  { key: "analytics", title: "Analytics & Dashboards", terms: ["Quality, cost and performance", "Threshold alerts"] },
] as const;
/** Trusted architecture facts. React renders these; the model only explains them. */
export const architectureInstrumenters = [
  { key: "langfuse", name: "Langfuse", via: "@observe decorators", covers: "Layers 1–3", detail: "Execution tree and business context" },
  { key: "litellm", name: "LiteLLM", via: "Unified API + Langfuse callback", covers: "Layer 4", detail: "Generations, tokens, cost, latency and provider errors" },
  { key: "scores", name: "Langfuse Scores", via: "Automated evaluations", covers: "Traces & observations", detail: "Scores attached to traces and observations" },
] as const;
export type ArchitectureInstrumenter = typeof architectureInstrumenters[number]["key"];
export const architectureLayers = [
  { key: "session", name: "interaction.session", role: "Interaction session", instrumentation: ["@observe()", "update_current_trace(...)"], note: "Entrypoint decorator + trace context", type: "Trace", instrumentedBy: "langfuse" },
  { key: "orchestration", name: "orchestration.flow", role: "Orchestrator", instrumentation: ['@observe(as_type="agent")', '@observe(as_type="chain")'], note: "Agent or chain", type: "Span", instrumentedBy: "langfuse" },
  { key: "operation", name: "operation.unit", role: "Deterministic operations", instrumentation: ['@observe(as_type="tool")', '@observe(as_type="retriever")'], note: "Tool or retriever", type: "Span", instrumentedBy: "langfuse" },
  { key: "inference", name: "model.inference", role: "AI model invocation", instrumentation: ["litellm.success_callback = [\"langfuse\"]"], note: "Automatic via LiteLLM callback", type: "Generation", instrumentedBy: "litellm" },
] as const satisfies readonly { instrumentedBy: ArchitectureInstrumenter }[];
export const architectureKeyTerms = ["AI execution tree", "interaction session", "orchestrator", "deterministic operations", "AI model invocation", "Langfuse @observe decorators", "LiteLLM", "Langfuse Scores", "Trace", "Span", "Generation"] as const;
export const presentationSteps = [{
  id: "opening",
  prompt: "Start the presentation",
  components: ["PresentationTitle", "PresentationPhoto"],
  guidelines: "Show only the required title and authorized image, in that order. No introduction, caption, or invented photo descriptions.",
  title: "Langfuse: Illuminating the black box in the AI era",
}, {
  id: "what-is-langfuse",
  prompt: "What is Langfuse?",
  components: ["LangfuseOverview"],
  guidelines: "Write four concise plain-text takeaways for an interactive Langfuse overview, one per category. Each takeaway must be at most 12 words and 100 characters, with no markup or URLs. Explain the benefit, not a feature list. Trusted React components already provide required labels, diagrams and clearly labeled fixed Demo data. Do not generate metrics, demo values, instructions, extra headings, or claims that this app connects to Langfuse. Topics: tracing model/tool/retrieval requests; managing prompts after initial integration; comparing versions with judge, human and code evaluation; monitoring metrics and alerts.",
}, {
  id: "architecture-layers",
  prompt: "How is the architecture instrumented?",
  components: ["ArchitectureLayers"],
  guidelines: `Write a plain-text summary and four plain-text layer descriptions for an interactive overview of an observable AI system's four layers. Key message: the observable system is still an AI execution tree (an interaction session, an orchestrator, a layer of deterministic operations and the AI model invocation); what changes is who instruments each layer. Langfuse @observe decorators instrument layers 1–3 (execution tree and business context); LiteLLM, a unified API with a Langfuse callback, instruments layer 4 (generations, tokens, cost, latency, provider errors); Langfuse Scores attach automated evaluations to traces and observations. Use these key terms naturally where relevant: ${architectureKeyTerms.join(", ")}. Trusted React components already render layer identifiers, decorator code, Langfuse types and fixed Demo data. Never write dotted identifiers, code, underscores, metrics, URLs or markup.`,
}] as const;
export type PresentationStepId = typeof presentationSteps[number]["id"];
export const openingStep = presentationSteps[0];
export const overviewStep = presentationSteps[1];
export const architectureStep = presentationSteps[2];
export const presentationRequestSchema = z.object({ mode: z.literal("presentation"), step: z.enum(["opening", "what-is-langfuse", "architecture-layers"]) }).strict();
export const presentationTitleProps = z.object({ title: z.literal(openingStep.title) }).strict();
export const presentationPhotoProps = z.object({ photoId: z.literal("presentation-opening") }).strict();
/** Model-written copy: short plain text only, no markup, code, URLs or domain-like tokens. */
export const plainText = (maxWords: number, maxChars: number) => z.string().trim().min(1).max(maxChars)
  .refine(text => text.split(/\s+/u).length <= maxWords, `Use at most ${maxWords} words`)
  .refine(text => !/[<>\[\]`*#_]|\b(?:[a-z][a-z0-9+.-]*:\/\/|www\.|(?:mailto|javascript|data):)|\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/i.test(text), "Plain text without markup or URLs only");
export const overviewTakeaway = plainText(12, 100);
export const langfuseOverviewProps = z.object({
  observability: overviewTakeaway,
  promptManagement: overviewTakeaway,
  evaluation: overviewTakeaway,
  analytics: overviewTakeaway,
}).strict();
export const architectureSummary = plainText(28, 200);
export const architectureDescription = plainText(16, 120);
export const architectureLayersProps = z.object({
  summary: architectureSummary,
  session: architectureDescription,
  orchestration: architectureDescription,
  operation: architectureDescription,
  inference: architectureDescription,
}).strict();
export const presentationPhotoSchema = z.object({ id: z.literal("presentation-opening"), url: z.string().url(), expiresAt: z.string().datetime() }).strict();
export const presentationReplySchema = z.discriminatedUnion("step", [
  z.object({ mode: z.literal("presentation"), step: z.literal("opening"), source: z.string().max(16000), photo: presentationPhotoSchema }).strict(),
  z.object({ mode: z.literal("presentation"), step: z.literal("what-is-langfuse"), source: z.string().max(16000) }).strict(),
  z.object({ mode: z.literal("presentation"), step: z.literal("architecture-layers"), source: z.string().max(16000) }).strict(),
]);
export type PresentationReply = z.infer<typeof presentationReplySchema>;
