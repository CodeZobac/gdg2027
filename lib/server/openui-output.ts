import { createLibrary, defineComponent, createParser } from "@openuidev/lang-core";
import { z } from "zod/v4";
import { textProps, galleryProps } from "../shared/gallery-contract";
import { AgentError } from "./errors";

const Text = defineComponent({ name: "Text", description: "Plain assistant text", props: textProps, component: null });
const PhotoGallery = defineComponent({ name: "PhotoGallery", description: "Exactly four selected photo IDs. No URLs.", props: galleryProps, component: null });
const Response = defineComponent({ name: "Response", description: "Assistant response", props: z.object({ children: z.array(z.union([Text.ref, PhotoGallery.ref])) }), component: null });
export const agentUiLibrary = createLibrary({ root: "Response", components: [Response, Text, PhotoGallery] });
const parser = createParser(agentUiLibrary.toJSONSchema(), "Response");

/** Parse, validate and serialize literals only. Runtime calls/bindings never reach the browser. */
export function validateAgentUi(input: string, allowedIds: string[]): string {
  if (input.length > 16000) throw new AgentError("INVALID_AGENT_UI", "The agent returned an invalid gallery.", 502);
  const source = input.trim().replace(/^```(?:openui-lang|openui)?\s*\n/, "").replace(/\n```$/, "");
  const parsed = parser.parse(source);
  const fail = () => { throw new AgentError("INVALID_AGENT_UI", "The agent returned an invalid gallery. Please try again.", 502); };
  if (!parsed.root || parsed.root.typeName !== "Response" || parsed.root.partial || parsed.rootExpression || parsed.meta.incomplete || parsed.meta.errors.length || parsed.meta.unresolved.length || parsed.meta.orphaned.length || parsed.queryStatements.length || parsed.mutationStatements.length || Object.keys(parsed.stateDeclarations).length) return fail();
  const children = parsed.root.props.children;
  if (!Array.isArray(children) || children.length < 1 || children.length > 4) return fail();
  const lines: string[] = [];
  let galleries = 0;
  for (const [index, child] of children.entries()) {
    if (!child || child.type !== "element" || child.partial) return fail();
    if (child.typeName === "Text") {
      const props = textProps.safeParse(child.props);
      if (!props.success) return fail();
      lines.push(`part${index} = Text(${JSON.stringify(props.data.text)})`);
    } else if (child.typeName === "PhotoGallery") {
      const props = galleryProps.safeParse(child.props);
      if (!props.success || new Set(props.data.photoIds).size !== 4 || props.data.photoIds.some(id => !allowedIds.includes(id))) return fail();
      galleries++;
      lines.push(`part${index} = PhotoGallery(${JSON.stringify(props.data.title)}, ${JSON.stringify(props.data.photoIds)})`);
    } else return fail();
  }
  if (galleries !== 1) return fail();
  return `root = Response([${lines.map((_, i) => `part${i}`).join(", ")}])\n${lines.join("\n")}`;
}
