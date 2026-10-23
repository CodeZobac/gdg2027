import { z } from "zod/v4";

export const overviewCategories = [
  { key: "observability", title: "Observability & Tracing", terms: ["Hierarchical traces", "Latency, tokens and cost"] },
  { key: "promptManagement", title: "Prompt Management", terms: ["Version, edit, cache and deploy", "No application code changes"] },
  { key: "evaluation", title: "Evaluation & Experiments", terms: ["LLM-as-a-judge", "Human feedback"] },
  { key: "analytics", title: "Analytics & Dashboards", terms: ["Quality, cost and performance", "Threshold alerts"] },
] as const;
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
}] as const;
export type PresentationStepId = typeof presentationSteps[number]["id"];
export const openingStep = presentationSteps[0];
export const overviewStep = presentationSteps[1];
export const presentationRequestSchema = z.object({ mode: z.literal("presentation"), step: z.enum(["opening", "what-is-langfuse"]) }).strict();
export const presentationTitleProps = z.object({ title: z.literal(openingStep.title) }).strict();
export const presentationPhotoProps = z.object({ photoId: z.literal("presentation-opening") }).strict();
export const overviewTakeaway = z.string().trim().min(1).max(100)
  .refine(text => text.split(/\s+/u).length <= 12, "Use at most 12 words")
  .refine(text => !/[<>\[\]`*#_]|\b(?:[a-z][a-z0-9+.-]*:\/\/|www\.|(?:mailto|javascript|data):)|\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/i.test(text), "Plain text without markup or URLs only");
export const langfuseOverviewProps = z.object({
  observability: overviewTakeaway,
  promptManagement: overviewTakeaway,
  evaluation: overviewTakeaway,
  analytics: overviewTakeaway,
}).strict();
export const presentationPhotoSchema = z.object({ id: z.literal("presentation-opening"), url: z.string().url(), expiresAt: z.string().datetime() }).strict();
export const presentationReplySchema = z.discriminatedUnion("step", [
  z.object({ mode: z.literal("presentation"), step: z.literal("opening"), source: z.string().max(16000), photo: presentationPhotoSchema }).strict(),
  z.object({ mode: z.literal("presentation"), step: z.literal("what-is-langfuse"), source: z.string().max(16000) }).strict(),
]);
export type PresentationReply = z.infer<typeof presentationReplySchema>;
