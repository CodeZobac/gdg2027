import { createLibrary, defineComponent, createParser } from "@openuidev/lang-core";
import { z, type ZodType } from "zod/v4";
import { presentationTitleProps, presentationPhotoProps, langfuseOverviewProps, architectureLayersProps, sessionLayerProps, orchestrationLayerProps, operationsLayerProps, inferenceLayerProps, tracingPrincipleProps, closingLinksProps, type PresentationStepId } from "../shared/presentation-contract";
import { AgentError } from "./errors";

const PresentationTitle = defineComponent({ name: "PresentationTitle", description: "Required animated presentation title", props: presentationTitleProps, component: null });
const PresentationPhoto = defineComponent({ name: "PresentationPhoto", description: "Authorized opening image ID only", props: presentationPhotoProps, component: null });
const LangfuseOverview = defineComponent({ name: "LangfuseOverview", description: "Four plain-text takeaways: observability, promptManagement, evaluation, analytics. Each maximum 12 words and 100 characters; diagrams and required labels are supplied by React.", props: langfuseOverviewProps, component: null });
const ArchitectureLayers = defineComponent({ name: "ArchitectureLayers", description: "Plain-text summary (maximum 28 words, 200 characters) plus one description per layer: session, orchestration, operation, inference (each maximum 16 words, 120 characters). Layer identifiers, decorator code, Langfuse types and the instrumentation diagram are supplied by React.", props: architectureLayersProps, component: null });
const SessionLayer = defineComponent({ name: "SessionLayer", description: "Plain-text summary (maximum 28 words, 200 characters) plus one caption per step: entrypoint, identity, context, cost (each maximum 16 words, 130 characters). Code, field names, the trace diagram and Demo data are supplied by React.", props: sessionLayerProps, component: null });
const OrchestrationLayer = defineComponent({ name: "OrchestrationLayer", description: "Plain-text summary (maximum 28 words, 200 characters) plus one caption per step: strategy, decisions, outcome, boundary (each maximum 16 words, 130 characters). Code, field names, the decision flow and Demo data are supplied by React.", props: orchestrationLayerProps, component: null });
const OperationsLayer = defineComponent({ name: "OperationsLayer", description: "Plain-text summary (maximum 28 words, 200 characters) plus one caption per step: separation, type, io, quality (each maximum 16 words, 130 characters). Code, field names, the span tree and Demo data are supplied by React.", props: operationsLayerProps, component: null });
const InferenceLayer = defineComponent({ name: "InferenceLayer", description: "Plain-text summary (maximum 28 words, 200 characters) plus one caption per step: automatic, linking, capture, context (each maximum 16 words, 130 characters). Code, field names, the generation tree and Demo data are supplied by React.", props: inferenceLayerProps, component: null });
const TracingPrinciple = defineComponent({ name: "TracingPrinciple", description: "Plain-text lead (maximum 20 words, 140 characters) and takeaway (maximum 16 words, 120 characters). The principle, questions and event sorter are supplied by React.", props: tracingPrincipleProps, component: null });
const ClosingLinks = defineComponent({ name: "ClosingLinks", description: "Plain-text thanks (maximum 14 words, 100 characters) plus one caption per card: profile, repository (each maximum 12 words, 90 characters). QR codes and URLs are supplied by React.", props: closingLinksProps, component: null });
const Response = defineComponent({ name: "Response", description: "Presentation canvas", props: z.object({ children: z.array(z.union([PresentationTitle.ref, PresentationPhoto.ref, LangfuseOverview.ref, ArchitectureLayers.ref, SessionLayer.ref, OrchestrationLayer.ref, OperationsLayer.ref, InferenceLayer.ref, TracingPrinciple.ref, ClosingLinks.ref])) }), component: null });
/** Reused by the chat so slide components keep one definition and one set of copy limits. */
export const slideComponents = { LangfuseOverview, ArchitectureLayers, SessionLayer, OrchestrationLayer, OperationsLayer, InferenceLayer, TracingPrinciple, ClosingLinks } as const;
export const presentationUiLibrary = createLibrary({ root: "Response", components: [Response, PresentationTitle, PresentationPhoto, LangfuseOverview, ArchitectureLayers, SessionLayer, OrchestrationLayer, OperationsLayer, InferenceLayer, TracingPrinciple, ClosingLinks] });
const parser = createParser(presentationUiLibrary.toJSONSchema(), "Response");
const literals = (values: string[]) => values.map(value => JSON.stringify(value)).join(", ");

export function validatePresentationUi(input: string, step: PresentationStepId = "opening"): string {
  const fail = (detail = "output does not match the required program shape"): never => { throw new AgentError("INVALID_PRESENTATION_UI", "The assistant returned an invalid presentation. Please retry.", 502, detail); };
  if (input.length > 16000) return fail("output longer than 16000 characters");
  const parsed = parser.parse(input.trim().replace(/^```(?:openui-lang|openui)?\s*\n/, "").replace(/\n```$/, ""));
  if (parsed.meta.errors.length) return fail(`OpenUI Lang syntax error: ${String((parsed.meta.errors[0] as { message?: string })?.message ?? parsed.meta.errors[0]).slice(0, 160)}`);
  if (!parsed.root || parsed.root.typeName !== "Response" || parsed.root.partial || parsed.rootExpression || parsed.meta.incomplete) return fail("expected a complete root = Response([...]) statement");
  if (parsed.meta.unresolved.length || parsed.meta.orphaned.length) return fail("every referenced variable must be defined exactly once and used");
  if (parsed.queryStatements.length || parsed.mutationStatements.length || Object.keys(parsed.stateDeclarations).length) return fail("queries, mutations and state are not allowed");
  const children = parsed.root.props.children;
  if (!Array.isArray(children)) return fail("Response children must be an array");
  /** Field-level reasons with measured lengths, so the model can repair its own copy. */
  const check = <T,>(schema: ZodType<T>, props: unknown): T => {
    const result = schema.safeParse(props);
    if (result.success) return result.data;
    const values = (props ?? {}) as Record<string, unknown>;
    return fail(result.error.issues.map(issue => {
      const field = String(issue.path[0] ?? "props");
      const value = values[field];
      const measured = typeof value === "string" ? ` (got ${value.trim().split(/\s+/u).filter(Boolean).length} words, ${value.trim().length} characters)` : "";
      return `${field}: ${issue.message}${measured}`;
    }).join("; "));
  };
  /** Exactly one element of the expected component, re-serialized from validated literals. */
  const single = (typeName: string) => {
    const [element] = children;
    if (children.length !== 1 || element?.type !== "element" || element.partial || element.typeName !== typeName) return fail(`Response must contain exactly one complete ${typeName} element`);
    return element.props;
  };
  if (step === "what-is-langfuse") {
    const data = check(langfuseOverviewProps, single("LangfuseOverview"));
    return `root = Response([overview])\noverview = LangfuseOverview(${literals([data.observability, data.promptManagement, data.evaluation, data.analytics])})`;
  }
  if (step === "architecture-layers") {
    const data = check(architectureLayersProps, single("ArchitectureLayers"));
    return `root = Response([layers])\nlayers = ArchitectureLayers(${literals([data.summary, data.session, data.orchestration, data.operation, data.inference])})`;
  }
  if (step === "layer-session") {
    const data = check(sessionLayerProps, single("SessionLayer"));
    return `root = Response([session])\nsession = SessionLayer(${literals([data.summary, data.entrypoint, data.identity, data.context, data.cost])})`;
  }
  if (step === "tracing-principle") {
    const data = check(tracingPrincipleProps, single("TracingPrinciple"));
    return `root = Response([principle])\nprinciple = TracingPrinciple(${literals([data.lead, data.takeaway])})`;
  }
  if (step === "closing") {
    const data = check(closingLinksProps, single("ClosingLinks"));
    return `root = Response([links])\nlinks = ClosingLinks(${literals([data.thanks, data.profile, data.repository])})`;
  }
  if (step === "layer-inference") {
    const data = check(inferenceLayerProps, single("InferenceLayer"));
    return `root = Response([gen])\ngen = InferenceLayer(${literals([data.summary, data.automatic, data.linking, data.capture, data.context])})`;
  }
  if (step === "layer-operations") {
    const data = check(operationsLayerProps, single("OperationsLayer"));
    return `root = Response([ops])\nops = OperationsLayer(${literals([data.summary, data.separation, data.type, data.io, data.quality])})`;
  }
  if (step === "layer-orchestration") {
    const data = check(orchestrationLayerProps, single("OrchestrationLayer"));
    return `root = Response([flow])\nflow = OrchestrationLayer(${literals([data.summary, data.strategy, data.decisions, data.outcome, data.boundary])})`;
  }
  if (children.length !== 2) return fail("Response must contain exactly [heading, image]");
  const [title, photo] = children;
  if (title?.type !== "element" || photo?.type !== "element" || title.partial || photo.partial || title.typeName !== "PresentationTitle" || photo.typeName !== "PresentationPhoto") return fail();
  const titleProps = presentationTitleProps.safeParse(title.props);
  const photoProps = presentationPhotoProps.safeParse(photo.props);
  if (!titleProps.success || !photoProps.success) return fail();
  return `root = Response([heading, image])\nheading = PresentationTitle(${JSON.stringify(titleProps.data.title)})\nimage = PresentationPhoto(${JSON.stringify(photoProps.data.photoId)})`;
}
