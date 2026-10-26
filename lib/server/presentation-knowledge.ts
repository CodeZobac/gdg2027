import { architectureInstrumenters, architectureLayers, closingLinks, inferenceSteps, operationSteps, orchestrationSteps, overviewCategories, presentationSteps, principleEvents, sessionSteps, tracingPrinciple } from "../shared/presentation-contract";

/** Grounding for the chat: built from the same trusted contract that drives the slides, so the two never drift. */
const factsByStep: Record<string, string> = Object.fromEntries(presentationSteps.filter(step => step.id !== "opening").map(step => [step.id, step.guidelines]));
const slide = (n: number, title: string, component: string, body: string[]) => `## Slide ${n}: ${title} (component ${component})\n${body.join("\n")}`;

export const presentationKnowledge = [
  "# The GDG Faro Langfuse presentation",
  `Title: "${presentationSteps[0].title}".`,
  slide(2, "What is Langfuse?", "LangfuseOverview", ["Langfuse is an open-source LLM engineering platform.", ...overviewCategories.map(c => `- ${c.title}: ${c.terms.join("; ")}`)]),
  slide(3, "Architecture: four layers of the AI execution tree", "ArchitectureLayers", [
    ...architectureLayers.map((l, i) => `- Layer ${i + 1} ${l.name} (${l.role}) → Langfuse ${l.type}; instrumentation ${l.instrumentation.join(" or ")}; ${l.note}.`),
    ...architectureInstrumenters.map(x => `- ${x.name} (${x.via}) covers ${x.covers}: ${x.detail}.`),
  ]),
  slide(4, "Layer 1: the interaction session", "SessionLayer", [`Steps: ${sessionSteps.map(s => `${s.title} (${s.hint})`).join(", ")}.`, factsByStep["layer-session"]]),
  slide(5, "Layer 2: orchestration & reasoning", "OrchestrationLayer", [`Steps: ${orchestrationSteps.map(s => `${s.title} (${s.hint})`).join(", ")}.`, factsByStep["layer-orchestration"]]),
  slide(6, "Layer 3: deterministic operations", "OperationsLayer", [`Steps: ${operationSteps.map(s => `${s.title} (${s.hint})`).join(", ")}.`, factsByStep["layer-operations"]]),
  slide(7, "Layer 4: model inference", "InferenceLayer", [`Steps: ${inferenceSteps.map(s => `${s.title} (${s.hint})`).join(", ")}.`, factsByStep["layer-inference"]]),
  slide(8, "What to trace?", "TracingPrinciple", [`Principle: "${tracingPrinciple}"`, `Example events: ${principleEvents.map(e => `${e.label} → ${e.behavior || e.attribution ? "trace" : "drop"}`).join("; ")}.`]),
  slide(9, "Thank you", "ClosingLinks", [`Links shown as QR codes: ${closingLinks.map(l => `${l.title} (${l.handle})`).join(" and ")}.`]),
].join("\n\n")
  // Prompt-facing guideline text addresses the slide writer; neutralize it for the chat.
  .replace(/Write a plain-text summary and four short step captions for a visual, beginner-friendly walkthrough of /g, "This slide walks through ")
  .replace(/ Use these key terms naturally where relevant:[^.]*\. Trusted React already renders[^.]*\. Keep it simple and visual\. Never write[^.`]*\./g, "");
