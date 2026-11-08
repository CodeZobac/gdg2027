import "server-only";
import { LangfuseClient } from "@langfuse/client";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { getActiveTraceId, setLangfuseTracerProvider } from "@langfuse/tracing";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { context } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";

/**
 * Langfuse Cloud tracing, following the four-layer tree from the talk:
 * interaction.session (Trace) → orchestration.flow (agent) → operation.unit (tool/retriever) → model.inference (generation).
 * Without keys nothing is registered, so every observation call is a no-op.
 */
export const isLangfuseEnabled = () => Boolean(process.env.LANGFUSE_PUBLIC_KEY?.trim() && process.env.LANGFUSE_SECRET_KEY?.trim());

let processor: LangfuseSpanProcessor | undefined;
let client: LangfuseClient | undefined;

export function startLangfuse() {
  if (processor || !isLangfuseEnabled()) return;
  // Without a context manager each span starts its own trace; this nests all layers under one Trace.
  // setGlobalContextManager is a no-op if Next.js already registered one.
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
  processor = new LangfuseSpanProcessor({ environment: process.env.NODE_ENV });
  // Isolated provider: does not clash with Next.js' own OpenTelemetry spans.
  setLangfuseTracerProvider(new NodeTracerProvider({ spanProcessors: [processor] }));
  client = new LangfuseClient();
}

/** Code-based score attached to the active trace (Langfuse Scores). */
export function scoreActiveTrace(name: string, value: number, comment?: string) {
  const traceId = getActiveTraceId();
  if (traceId) scoreTrace(traceId, name, value, comment);
}

export function scoreTrace(traceId: string, name: string, value: number, comment?: string) {
  if (!client) return;
  client.score.create({ traceId, name, value, dataType: "NUMERIC", ...(comment ? { comment } : {}) });
}

export async function flushLangfuse() {
  await Promise.allSettled([processor?.forceFlush(), client?.score.flush()]);
}
