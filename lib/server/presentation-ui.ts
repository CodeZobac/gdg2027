import { createLibrary, defineComponent, createParser } from "@openuidev/lang-core";
import { z } from "zod/v4";
import { presentationTitleProps, presentationPhotoProps, langfuseOverviewProps, type PresentationStepId } from "../shared/presentation-contract";
import { AgentError } from "./errors";

const PresentationTitle = defineComponent({ name: "PresentationTitle", description: "Required animated presentation title", props: presentationTitleProps, component: null });
const PresentationPhoto = defineComponent({ name: "PresentationPhoto", description: "Authorized opening image ID only", props: presentationPhotoProps, component: null });
const LangfuseOverview = defineComponent({ name: "LangfuseOverview", description: "Four plain-text takeaways: observability, promptManagement, evaluation, analytics. Each maximum 12 words and 100 characters; diagrams and required labels are supplied by React.", props: langfuseOverviewProps, component: null });
const Response = defineComponent({ name: "Response", description: "Presentation canvas", props: z.object({ children: z.array(z.union([PresentationTitle.ref, PresentationPhoto.ref, LangfuseOverview.ref])) }), component: null });
export const presentationUiLibrary = createLibrary({ root: "Response", components: [Response, PresentationTitle, PresentationPhoto, LangfuseOverview] });
const parser = createParser(presentationUiLibrary.toJSONSchema(), "Response");
export function validatePresentationUi(input: string, step: PresentationStepId = "opening"): string {
  const fail = () => { throw new AgentError("INVALID_PRESENTATION_UI", "The assistant returned an invalid presentation. Please retry.", 502); };
  if (input.length > 16000) return fail();
  const parsed = parser.parse(input.trim().replace(/^```(?:openui-lang|openui)?\s*\n/, "").replace(/\n```$/, ""));
  if (!parsed.root || parsed.root.typeName !== "Response" || parsed.root.partial || parsed.rootExpression || parsed.meta.incomplete || parsed.meta.errors.length || parsed.meta.unresolved.length || parsed.meta.orphaned.length || parsed.queryStatements.length || parsed.mutationStatements.length || Object.keys(parsed.stateDeclarations).length) return fail();
  const children = parsed.root.props.children;
  if (!Array.isArray(children)) return fail();
  if (step === "what-is-langfuse") {
    const [overview] = children;
    if (children.length !== 1 || overview?.type !== "element" || overview.partial || overview.typeName !== "LangfuseOverview") return fail();
    const props = langfuseOverviewProps.safeParse(overview.props);
    if (!props.success) return fail();
    return `root = Response([overview])\noverview = LangfuseOverview(${[props.data.observability, props.data.promptManagement, props.data.evaluation, props.data.analytics].map(value => JSON.stringify(value)).join(", ")})`;
  }
  if (children.length !== 2) return fail();
  const [title, photo] = children;
  if (title?.type !== "element" || photo?.type !== "element" || title.partial || photo.partial || title.typeName !== "PresentationTitle" || photo.typeName !== "PresentationPhoto") return fail();
  const titleProps = presentationTitleProps.safeParse(title.props);
  const photoProps = presentationPhotoProps.safeParse(photo.props);
  if (!titleProps.success || !photoProps.success) return fail();
  return `root = Response([heading, image])\nheading = PresentationTitle(${JSON.stringify(titleProps.data.title)})\nimage = PresentationPhoto(${JSON.stringify(photoProps.data.photoId)})`;
}
