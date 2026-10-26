import { z } from "zod/v4";

/** Slide components the chat may embed. Opening title/photo stay presentation-only. */
export const chatComponents = ["LangfuseOverview", "ArchitectureLayers", "SessionLayer", "OrchestrationLayer", "OperationsLayer", "InferenceLayer", "TracingPrinciple", "ClosingLinks"] as const;
export const chatText = z.string().trim().min(1).max(1200)
  .refine(text => !/[<>`]|\b(?:javascript|data|mailto):/i.test(text), "Plain text only: no HTML, code fences or script URLs");
export const textProps = z.object({ text: chatText }).strict();
/** Client-sent history is untrusted context only: short, text-only, bounded. */
export const chatTurnSchema = z.object({ role: z.enum(["user", "assistant"]), text: z.string().trim().min(1).max(800) }).strict();
export const chatRequestSchema = z.object({ message: z.string().trim().min(1).max(2000), history: z.array(chatTurnSchema).max(6).optional() }).strict();
export const chatReplySchema = z.object({ mode: z.literal("chat"), source: z.string().max(16000), text: z.string().max(2400) }).strict();
export type ChatTurn = z.infer<typeof chatTurnSchema>;
export type ChatReply = z.infer<typeof chatReplySchema>;
