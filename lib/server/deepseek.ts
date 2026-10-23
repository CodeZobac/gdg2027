import "server-only";
import { z } from "zod/v4";
import type { GenerateRequest, ChatMessage } from "./agent-loop";
import { AgentError } from "./errors";

const completionSchema = z.object({
  choices: z.array(z.object({
    finish_reason: z.enum(["stop", "tool_calls"]),
    message: z.object({
      role: z.literal("assistant"),
      content: z.string().max(16000).nullable().optional(),
      tool_calls: z.array(z.object({
        id: z.string().min(1), type: z.literal("function"),
        function: z.object({ name: z.string(), arguments: z.string().max(2000) }),
      })).max(1).optional(),
    }),
  })).length(1),
});

export async function generateDeepSeek(request: GenerateRequest, parentSignal?: AbortSignal): Promise<ChatMessage> {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) throw new AgentError("AI_NOT_CONFIGURED", "Set DEEPSEEK_API_KEY on the server to enable Agent mode.");
  const signal = AbortSignal.any([...(parentSignal ? [parentSignal] : []), AbortSignal.timeout(25000)]);
  try {
    signal.throwIfAborted();
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST", cache: "no-store", redirect: "error", signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...request, thinking: { type: "disabled" }, stream: false }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 401 || response.status === 403) throw new AgentError("AI_AUTH_FAILED", "DeepSeek authentication failed. Check the server API key.");
      if (response.status === 402) throw new AgentError("AI_BALANCE_REQUIRED", "DeepSeek requires an available API balance. Check the provider account.");
      if (response.status === 429) throw new AgentError("AI_RATE_LIMITED", "DeepSeek is rate limited. Try again shortly.", 429);
      throw new AgentError("AI_UNAVAILABLE", "DeepSeek is unavailable. Try again shortly.");
    }
    const parsed = completionSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new AgentError("INVALID_AI_RESPONSE", "DeepSeek returned an invalid response. Please try again.", 502);
    const message = parsed.data.choices[0].message;
    return { ...message, content: message.content ?? null };
  } catch (error) {
    if (signal.aborted) {
      const timedOut = signal.reason instanceof DOMException && signal.reason.name === "TimeoutError";
      throw new AgentError(timedOut ? "AI_TIMEOUT" : "AI_CANCELLED", timedOut ? "DeepSeek timed out. Please try again." : "The agent request was cancelled.", timedOut ? 504 : 408);
    }
    if (error instanceof AgentError) throw error;
    throw new AgentError("AI_UNAVAILABLE", "DeepSeek could not be reached. Try again shortly.");
  }
}
