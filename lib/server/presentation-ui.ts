import { createLibrary, defineComponent, createParser } from "@openuidev/lang-core";
import { z } from "zod/v4";
import { presentationTitleProps, presentationPhotoProps, langfuseOverviewProps, architectureLayersProps, sessionLayerProps, type PresentationStepId } from "../shared/presentation-contract";
import { AgentError } from "./errors";

const PresentationTitle = defineComponent({ name: "PresentationTitle", description: "Required animated presentation title", props: presentationTitleProps, component: null });
const PresentationPhoto = defineComponent({ name: "PresentationPhoto", description: "Authorized opening image ID only", props: presentationPhotoProps, component: null });
const LangfuseOverview = defineComponent({ name: "LangfuseOverview", description: "Four plain-text takeaways: observability, promptManagement, evaluation, analytics. Each maximum 12 words and 100 characters; diagrams and required labels are supplied by React.", props: langfuseOverviewProps, component: null });
const ArchitectureLayers = defineComponent({ name: "ArchitectureLayers", description: "Plain-text summary (maximum 28 words, 200 characters) plus one description per layer: session, orchestration, operation, inference (each maximum 16 words, 120 characters). Layer identifiers, decorator code, Langfuse types and the instrumentation diagram are supplied by React.", props: architectureLayersProps, component: null });
const SessionLayer = defineComponent({ name: "SessionLayer", description: "Plain-text summary (maximum 24 words, 180 characters) plus one caption per step: entrypoint, identity, context, cost (each maximum 14 words, 110 characters). Code, field names, the trace diagram and Demo data are supplied by React.", props: sessionLayerProps, component: null });
const Response = defineComponent({ name: "Response", description: "Presentation canvas", props: z.object({ children: z.array(z.union([PresentationTitle.ref, PresentationPhoto.ref, LangfuseOverview.ref, ArchitectureLayers.ref, SessionLayer.ref])) }), component: null });
export const presentationUiLibrary = createLibrary({ root: "Response", components: [Response, PresentationTitle, PresentationPhoto, LangfuseOverview, ArchitectureLayers, SessionLayer] });
const parser = createParser(presentationUiLibrary.toJSONSchema(), "Response");
const literals = (values: string[]) => values.map(value => JSON.stringify(value)).join(", ");

export function validatePresentationUi(input: string, step: PresentationStepId = "opening"): string {
  const fail = () => { throw new AgentError("INVALID_PRESENTATION_UI", "The assistant returned an invalid presentation. Please retry.", 502); };
  if (input.length > 16000) return fail();
  const parsed = parser.parse(input.trim().replace(/^```(?:openui-lang|openui)?\s*\n/, "").replace(/\n```$/, ""));
  if (!parsed.root || parsed.root.typeName !== "Response" || parsed.root.partial || parsed.rootExpression || parsed.meta.incomplete || parsed.meta.errors.length || parsed.meta.unresolved.length || parsed.meta.orphaned.length || parsed.queryStatements.length || parsed.mutationStatements.length || Object.keys(parsed.stateDeclarations).length) return fail();
  const children = parsed.root.props.children;
  if (!Array.isArray(children)) return fail();
  /** Exactly one element of the expected component, re-serialized from validated literals. */
  const single = (typeName: string) => {
    const [element] = children;
    if (children.length !== 1 || element?.type !== "element" || element.partial || element.typeName !== typeName) return fail();
    return element.props;
  };
  if (step === "what-is-langfuse") {
    const props = langfuseOverviewProps.safeParse(single("LangfuseOverview"));
    if (!props.success) return fail();
    return `root = Response([overview])\noverview = LangfuseOverview(${literals([props.data.observability, props.data.promptManagement, props.data.evaluation, props.data.analytics])})`;
  }
  if (step === "architecture-layers") {
    const props = architectureLayersProps.safeParse(single("ArchitectureLayers"));
    if (!props.success) return fail();
    return `root = Response([layers])\nlayers = ArchitectureLayers(${literals([props.data.summary, props.data.session, props.data.orchestration, props.data.operation, props.data.inference])})`;
  }
  if (step === "layer-session") {
    const props = sessionLayerProps.safeParse(single("SessionLayer"));
    if (!props.success) return fail();
    return `root = Response([session])\nsession = SessionLayer(${literals([props.data.summary, props.data.entrypoint, props.data.identity, props.data.context, props.data.cost])})`;
  }
  if (children.length !== 2) return fail();
  const [title, photo] = children;
  if (title?.type !== "element" || photo?.type !== "element" || title.partial || photo.partial || title.typeName !== "PresentationTitle" || photo.typeName !== "PresentationPhoto") return fail();
  const titleProps = presentationTitleProps.safeParse(title.props);
  const photoProps = presentationPhotoProps.safeParse(photo.props);
  if (!titleProps.success || !photoProps.success) return fail();
  return `root = Response([heading, image])\nheading = PresentationTitle(${JSON.stringify(titleProps.data.title)})\nimage = PresentationPhoto(${JSON.stringify(photoProps.data.photoId)})`;
}
