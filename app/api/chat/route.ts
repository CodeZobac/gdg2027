import { presentationAgent } from "@/lib/server/presentation-agent";
import { presentationSteps, presentationRequestSchema } from "@/lib/shared/presentation-contract";
import { checkSpam } from "@/lib/server/spam-prevention";
import { z } from "zod/v4";
import { photoAgent } from "@/lib/server/photo-agent";
import { AgentError } from "@/lib/server/errors";

// Node.js is the default runtime; explicit segment runtime conflicts with Cache Components.
const bodySchema = z.union([z.object({ message: z.string().trim().min(1) }).strict(), presentationRequestSchema]);
const noStore = { "Cache-Control": "no-store, private" };
export async function POST(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Cross-origin agent requests are not allowed." }, { status: 403, headers: noStore });
  const headers: Record<string, string> = { ...noStore };
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 10000) return Response.json({ error: "Message is too large." }, { status: 413, headers });
    const reader = request.body?.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 10000) { await reader.cancel(); return Response.json({ error: "Message is too large." }, { status: 413, headers }); }
        chunks.push(value);
      }
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    const parsed = bodySchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return Response.json({ error: "Send a non-empty message." }, { status: 400, headers });
    const payload = parsed.data;
    const spam = checkSpam(request, "mode" in payload ? presentationSteps.find(step => step.id === payload.step)?.prompt ?? payload.step : payload.message);
    headers["Set-Cookie"] = spam.cookie;
    if (spam.blocked) return Response.json({ error: "Repeated or rapid submissions detected. Please wait a moment.", code: "SPAM_DETECTED" }, { status: 429, headers: { ...headers, "Retry-After": String(spam.retryAfter) } });
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(60000)]);
    return Response.json("mode" in parsed.data ? await presentationAgent(signal, parsed.data.step) : await photoAgent(parsed.data.message, signal), { headers });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Invalid JSON request." }, { status: 400, headers });
    if (error instanceof AgentError) return Response.json({ error: error.message, code: error.code }, { status: error.status, headers });
    // Do not leak SDK errors, credentials, paths, prompts or signed URLs into responses/logs.
    return Response.json({ error: "The photo agent is unavailable. Please try again.", code: "AGENT_UNAVAILABLE" }, { status: 503, headers });
  }
}

// Probe provider access without generating a completion or exposing credentials.
export async function GET(request: Request) {
  const reply = (connected: boolean, reason = "") => Response.json({ connected, reason }, { status: connected ? 200 : 503, headers: noStore });
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) return reply(false, "The assistant API key is not configured on the server.");
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY || !process.env.SUPABASE_PHOTO_BUCKET) return reply(false, "Photo storage is not configured on the server.");
  try {
    const response = await fetch("https://api.deepseek.com/models", {
      headers: { Authorization: `Bearer ${key}` }, cache: "no-store", redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(10000)]),
    });
    await response.body?.cancel();
    if (response.ok) return reply(true);
    if (response.status === 401 || response.status === 403) return reply(false, "The assistant API key was rejected. Check the server configuration.");
    if (response.status === 429) return reply(false, "The assistant is rate limited. Try again shortly.");
    return reply(false, "The assistant provider is unavailable. Try again shortly.");
  } catch {
    return reply(false, "The assistant provider could not be reached or the connection timed out.");
  }
}
