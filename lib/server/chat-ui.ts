import { createLibrary, defineComponent, createParser } from "@openuidev/lang-core";
import { z, type ZodObject, type ZodRawShape, type ZodError } from "zod/v4";
import { chatComponents, textProps } from "../shared/chat-contract";
import { architectureLayersProps, closingLinksProps, inferenceLayerProps, langfuseOverviewProps, operationsLayerProps, orchestrationLayerProps, sessionLayerProps, tracingPrincipleProps } from "../shared/presentation-contract";
import { slideComponents } from "./presentation-ui";
import { AgentError } from "./errors";

const Text = defineComponent({ name: "Text", description: "Plain-text answer, maximum 1200 characters. Line breaks allowed. No markdown, HTML or code fences.", props: textProps, component: null });
const slides = Object.values(slideComponents);
const Response = defineComponent({ name: "Response", description: "Chat answer: one or two Text parts and at most one slide component", props: z.object({ children: z.array(z.union([Text.ref, slideComponents.LangfuseOverview.ref, slideComponents.ArchitectureLayers.ref, slideComponents.SessionLayer.ref, slideComponents.OrchestrationLayer.ref, slideComponents.OperationsLayer.ref, slideComponents.InferenceLayer.ref, slideComponents.TracingPrinciple.ref, slideComponents.ClosingLinks.ref])) }), component: null });
export const chatUiLibrary = createLibrary({ root: "Response", components: [Response, Text, ...slides] });
const parser = createParser(chatUiLibrary.toJSONSchema(), "Response");

/** Positional argument order for canonical serialization comes from each trusted schema. */
const schemas: Record<(typeof chatComponents)[number], ZodObject<ZodRawShape>> = {
  LangfuseOverview: langfuseOverviewProps, ArchitectureLayers: architectureLayersProps, SessionLayer: sessionLayerProps, OrchestrationLayer: orchestrationLayerProps,
  OperationsLayer: operationsLayerProps, InferenceLayer: inferenceLayerProps, TracingPrinciple: tracingPrincipleProps, ClosingLinks: closingLinksProps,
};
const isSlide = (name: string): name is (typeof chatComponents)[number] => (chatComponents as readonly string[]).includes(name);

export type ValidatedChat = { source: string; text: string; component: string | null };
export function validateChatUi(input: string): ValidatedChat {
  const fail = (detail: string): never => { throw new AgentError("INVALID_CHAT_UI", "The assistant returned an invalid answer. Please retry.", 502, detail); };
  if (input.length > 16000) return fail("output longer than 16000 characters");
  const parsed = parser.parse(input.trim().replace(/^```(?:openui-lang|openui)?\s*\n/, "").replace(/\n```$/, ""));
  if (parsed.meta.errors.length) return fail(`OpenUI Lang syntax error: ${String((parsed.meta.errors[0] as { message?: string })?.message ?? parsed.meta.errors[0]).slice(0, 160)}`);
  if (!parsed.root || parsed.root.typeName !== "Response" || parsed.root.partial || parsed.rootExpression || parsed.meta.incomplete) return fail("expected a complete root = Response([...]) statement");
  if (parsed.meta.unresolved.length || parsed.meta.orphaned.length) return fail("every referenced variable must be defined exactly once and used");
  if (parsed.queryStatements.length || parsed.mutationStatements.length || Object.keys(parsed.stateDeclarations).length) return fail("queries, mutations and state are not allowed");
  const children = parsed.root.props.children;
  if (!Array.isArray(children) || children.length < 1 || children.length > 3) return fail("Response must contain 1 to 3 children");
  const lines: string[] = [];
  const texts: string[] = [];
  let component: string | null = null;
  for (const [index, child] of children.entries()) {
    if (!child || child.type !== "element" || child.partial) return fail(`child ${index + 1} is not a complete component`);
    if (child.typeName === "Text") {
      const props = textProps.safeParse(child.props);
      if (!props.success) return fail(`Text ${index + 1}: ${props.error.issues.map(issue => issue.message).join("; ")}`);
      texts.push(props.data.text);
      lines.push(`part${index} = Text(${JSON.stringify(props.data.text)})`);
    } else if (isSlide(child.typeName)) {
      if (component) return fail("use at most one slide component per answer");
      const schema = schemas[child.typeName as (typeof chatComponents)[number]];
      const props = schema.safeParse(child.props) as { success: true; data: unknown } | { success: false; error: ZodError };
      if (!props.success) {
        const values = (child.props ?? {}) as Record<string, unknown>;
        return fail(`${child.typeName}: ${props.error.issues.map(issue => {
          const field = String(issue.path[0] ?? "props");
          const value = values[field];
          return `${field}: ${issue.message}${typeof value === "string" ? ` (got ${value.trim().split(/\s+/u).filter(Boolean).length} words, ${value.trim().length} characters)` : ""}`;
        }).join("; ")}`);
      }
      component = child.typeName;
      const data = props.data as Record<string, string>;
      lines.push(`part${index} = ${child.typeName}(${Object.keys(schema.shape).map(key => JSON.stringify(data[key])).join(", ")})`);
    } else return fail(`unknown component ${child.typeName}; allowed: Text, ${chatComponents.join(", ")}`);
  }
  if (!texts.length) return fail("include at least one Text part that answers the question");
  return { source: `root = Response([${lines.map((_, i) => `part${i}`).join(", ")}])\n${lines.join("\n")}`, text: texts.join("\n\n").slice(0, 2400), component };
}
