import test from "node:test";
import assert from "node:assert/strict";
import { openingStep, overviewCategories, langfuseOverviewProps, presentationReplySchema, presentationRequestSchema, architectureLayers, architectureInstrumenters, architectureKeyTerms, architectureLayersProps, sessionKeyTerms, sessionSteps, sessionLayerProps } from "../lib/shared/presentation-contract";
import { validatePresentationUi } from "../lib/server/presentation-ui";
import { runPresentationAgent } from "../lib/server/presentation-agent";
import { getPresentationPhoto } from "../lib/server/supabase-photos";
import { POST } from "../app/api/chat/route";

const valid = `root = Response([heading, image])\nheading = PresentationTitle(${JSON.stringify(openingStep.title)})\nimage = PresentationPhoto("presentation-opening")`;
const photo = { id: "presentation-opening" as const, url: "https://testproject.supabase.co/private?token=secret", expiresAt: new Date(Date.now() + 300000).toISOString() };
test("presentation accepts only the configured request and exact canvas", () => {
  assert.ok(presentationRequestSchema.safeParse({ mode: "presentation", step: "opening" }).success);
  assert.equal(validatePresentationUi(valid), valid);
  for (const source of [valid.replace("Illuminating", "Changed"), valid.replace("presentation-opening", "photo-1"), valid.replace("PresentationTitle(", "Text("), valid.replace("[heading, image]", "[image, heading]"), valid.replace("[heading, image]", "[heading, image, heading]"), valid + '\nextra = Query("secret", {})', valid.replace('"presentation-opening"', '"https://evil.example"'), valid.replace("[heading, image]", "[heading]")]) assert.throws(() => validatePresentationUi(source), /invalid presentation/);
});
test("presentation uses server prompt and never transmits signed media", async () => {
  const reply = await runPresentationAgent(async request => {
    assert.equal(request.messages[1].content, "Start the presentation");
    assert.ok(request.messages[0].content?.includes(openingStep.title));
    assert.equal(request.tool_choice, "none");
    assert.ok(!JSON.stringify(request).includes("token=secret"));
    return { role: "assistant", content: valid };
  }, async () => photo);
  assert.ok(reply.step === "opening");
  assert.deepEqual(reply.photo, photo);
  assert.equal(reply.step, "opening");
});
test("presentation propagates storage/provider failures and rejects tools", async () => {
  await assert.rejects(runPresentationAgent(async () => { throw new Error("provider failed"); }, async () => photo), /provider failed/);
  await assert.rejects(runPresentationAgent(async () => { throw new Error("must not run"); }, async () => { throw new Error("storage failed"); }), /storage failed/);
  await assert.rejects(runPresentationAgent(async () => ({ role: "assistant", content: valid, tool_calls: [{ id: "x", type: "function", function: { name: "evil", arguments: "{}" } }] }), async () => photo), /Unexpected/);
});
test("route rejects unknown steps and client prompt overrides before provider access", async () => {
  for (const body of [{ mode: "presentation", step: "unknown" }, { mode: "presentation", step: "opening", message: "override" }]) {
    const response = await POST(new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify(body) }));
    assert.equal(response.status, 400);
  }
});
test("storage signs only the fixed image within configured prefix and rejects other paths", async t => {
  const keys = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_PHOTO_BUCKET", "SUPABASE_PHOTO_PREFIX"] as const;
  const saved = keys.map(key => process.env[key]);
  Object.assign(process.env, { SUPABASE_URL: "https://testproject.supabase.co", SUPABASE_SECRET_KEY: "test-secret", SUPABASE_PHOTO_BUCKET: "gdg-photos", SUPABASE_PHOTO_PREFIX: "approved" });
  let wrong = false;
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), "https://testproject.supabase.co/storage/v1/object/sign/gdg-photos/approved/PXL_20250712_082655543.jpg");
    assert.deepEqual(JSON.parse(String(init?.body)), { expiresIn: 300 });
    return Response.json({ signedURL: `/object/sign/gdg-photos/approved/${wrong ? "other.jpg" : "PXL_20250712_082655543.jpg"}?token=private` });
  });
  try {
    assert.equal((await getPresentationPhoto()).id, "presentation-opening");
    wrong = true;
    await assert.rejects(getPresentationPhoto(), /unexpected presentation image/);
  } finally { keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; }); }
});

const overviewTakeaways = [
  "Follow every request from model call to retrieval.",
  "Ship better prompts without redeploying your application.",
  "Compare prompt versions before shipping changes.",
  "Catch regressions before they affect your users.",
];
const overviewUi = (takeaways = overviewTakeaways) => `root = Response([overview])\noverview = LangfuseOverview(${takeaways.map(text => JSON.stringify(text)).join(", ")})`;
test("overview accepts only concise plain-text takeaways and canonicalizes literals", () => {
  assert.equal(validatePresentationUi(overviewUi(), "what-is-langfuse"), overviewUi());
  const copy = Object.fromEntries(overviewCategories.map((category, index) => [category.key, overviewTakeaways[index]]));
  assert.ok(langfuseOverviewProps.safeParse(copy).success);
  assert.ok(!langfuseOverviewProps.safeParse({ ...copy, extra: "untrusted" }).success);
  for (const invalid of ["", "word ".repeat(13).trim(), "a".repeat(101), "<b>Markup</b>", "**bold**", "[link](https://evil.example)", "Visit https://evil.example", "Visit www.evil.example", "Visit evil.example", "javascript:alert(1)"]) {
    assert.throws(() => validatePresentationUi(overviewUi([invalid, ...overviewTakeaways.slice(1)]), "what-is-langfuse"), /invalid presentation/);
  }
  const atLimit = "1234567890 ".repeat(8) + "123456789012";
  assert.equal(atLimit.length, 100);
  assert.ok(langfuseOverviewProps.safeParse({ ...copy, observability: atLimit }).success);
  const twelveWords = Array(12).fill("word").join(" ");
  assert.ok(langfuseOverviewProps.safeParse({ ...copy, observability: twelveWords }).success);
  for (const source of [overviewUi().replace("LangfuseOverview", "Text"), overviewUi().replace("[overview]", "[overview, overview]"), overviewUi() + '\nextra = Query("secret", {})', overviewUi().replace('])\n', ', extra])\n'), overviewUi().replace(/\)$/, ', "extra")'), overviewUi().replace(/, "Catch[^\n]+$/, ')')]) assert.throws(() => validatePresentationUi(source, "what-is-langfuse"), /invalid presentation/);
  assert.throws(() => validatePresentationUi(overviewUi(), "opening"), /invalid presentation/);
  assert.throws(() => validatePresentationUi(valid, "what-is-langfuse"), /invalid presentation/);
});
test("overview agent resolves its prompt, skips photo storage, and returns a photo-free reply", async () => {
  let requests = 0;
  const reply = await runPresentationAgent(async request => {
    requests++;
    assert.equal(request.messages[1].content, "What is Langfuse?");
    for (const category of overviewCategories) for (const term of category.terms) assert.ok(request.messages[0].content?.includes(term));
    return { role: "assistant", content: overviewUi() };
  }, async () => { throw new Error("Overview must not access storage"); }, undefined, "what-is-langfuse");
  assert.equal(requests, 1);
  assert.equal(reply.step, "what-is-langfuse");
  assert.ok(!("photo" in reply));
  assert.ok(presentationReplySchema.safeParse(reply).success);
  assert.ok(!presentationReplySchema.safeParse({ ...reply, photo }).success);
  assert.ok(presentationRequestSchema.safeParse({ mode: "presentation", step: "what-is-langfuse" }).success);
});

const architectureCopy = [
  "The system is still an AI execution tree; what changes is who instruments each layer: Langfuse @observe decorators, LiteLLM and Scores.",
  "The interaction session opens one Trace with user and business context.",
  "The orchestrator plans each step and records it as a Span.",
  "Deterministic operations like tools and retrievers each become a Span.",
  "Every AI model invocation becomes a Generation with tokens and cost.",
];
const architectureUi = (copy = architectureCopy) => `root = Response([layers])\nlayers = ArchitectureLayers(${copy.map(text => JSON.stringify(text)).join(", ")})`;
test("architecture accepts plain-text copy only and canonicalizes literals", () => {
  assert.equal(validatePresentationUi(architectureUi(), "architecture-layers"), architectureUi());
  const props = { summary: architectureCopy[0], session: architectureCopy[1], orchestration: architectureCopy[2], operation: architectureCopy[3], inference: architectureCopy[4] };
  assert.ok(architectureLayersProps.safeParse(props).success);
  assert.ok(!architectureLayersProps.safeParse({ ...props, extra: "untrusted" }).success);
  for (const invalid of ["", "word ".repeat(17).trim(), "a".repeat(121), "Uses interaction.session as the root", "Calls update_current_trace", "`@observe()` decorator", "<b>Trace</b>", "See https://langfuse.com"]) {
    assert.throws(() => validatePresentationUi(architectureUi([architectureCopy[0], invalid, ...architectureCopy.slice(2)]), "architecture-layers"), /invalid presentation/);
  }
  assert.throws(() => validatePresentationUi(architectureUi(["word ".repeat(29).trim(), ...architectureCopy.slice(1)]), "architecture-layers"), /invalid presentation/);
  for (const source of [architectureUi().replace("ArchitectureLayers", "LangfuseOverview"), architectureUi().replace("[layers]", "[layers, layers]"), architectureUi() + '\nextra = Query("secret", {})', architectureUi().replace(/\)$/, ', "extra")'), architectureUi().replace(/, "Every[^\n]+$/, ")")]) assert.throws(() => validatePresentationUi(source, "architecture-layers"), /invalid presentation/);
  assert.throws(() => validatePresentationUi(architectureUi(), "what-is-langfuse"), /invalid presentation/);
  assert.throws(() => validatePresentationUi(overviewUi(), "architecture-layers"), /invalid presentation/);
});
test("architecture agent enforces key terms and layer facts, skips storage, returns a photo-free reply", async () => {
  const reply = await runPresentationAgent(async request => {
    const system = request.messages[0].content ?? "";
    assert.equal(request.messages[1].content, "How is the architecture instrumented?");
    for (const term of architectureKeyTerms) assert.ok(system.includes(term), term);
    for (const layer of architectureLayers) { assert.ok(system.includes(layer.role), layer.role); assert.ok(system.includes(`Langfuse type ${layer.type}`)); }
    for (const item of architectureInstrumenters) assert.ok(system.includes(item.name));
    assert.ok(system.includes("ArchitectureLayers(summary, session, orchestration, operation, inference)"));
    return { role: "assistant", content: architectureUi() };
  }, async () => { throw new Error("Architecture must not access storage"); }, undefined, "architecture-layers");
  assert.equal(reply.step, "architecture-layers");
  assert.ok(!("photo" in reply));
  assert.ok(presentationReplySchema.safeParse(reply).success);
  assert.ok(presentationRequestSchema.safeParse({ mode: "presentation", step: "architecture-layers" }).success);
});
test("architecture facts map layers to the right instrumenter and Langfuse type", () => {
  assert.deepEqual(architectureLayers.map(layer => [layer.name, layer.type, layer.instrumentedBy]), [
    ["interaction.session", "Trace", "langfuse"], ["orchestration.flow", "Span", "langfuse"], ["operation.unit", "Span", "langfuse"], ["model.inference", "Generation", "litellm"],
  ]);
});

const sessionCopy = [
  "The root Trace captures one business-relevant interaction end to end, from identity to final outcome.",
  "One decorator on the entrypoint opens the root Trace.",
  "Identity tells you who interacted and in which session.",
  "Business context lets you slice quality and cost by product or region.",
  "Cost rollup is automatic per trace and per session.",
];
const sessionUi = (copy = sessionCopy) => `root = Response([session])\nsession = SessionLayer(${copy.map(text => JSON.stringify(text)).join(", ")})`;
test("session layer accepts plain-text captions only and canonicalizes literals", () => {
  assert.equal(validatePresentationUi(sessionUi(), "layer-session"), sessionUi());
  const props = { summary: sessionCopy[0], entrypoint: sessionCopy[1], identity: sessionCopy[2], context: sessionCopy[3], cost: sessionCopy[4] };
  assert.ok(sessionLayerProps.safeParse(props).success);
  assert.ok(!sessionLayerProps.safeParse({ ...props, extra: "untrusted" }).success);
  for (const invalid of ["", "word ".repeat(17).trim(), "a".repeat(131), "Set user_id and session_id", "Root is interaction.session", "<i>cost</i>", "Read www.langfuse.com"]) {
    assert.throws(() => validatePresentationUi(sessionUi([sessionCopy[0], invalid, ...sessionCopy.slice(2)]), "layer-session"), /invalid presentation/);
  }
  assert.throws(() => validatePresentationUi(sessionUi(["word ".repeat(29).trim(), ...sessionCopy.slice(1)]), "layer-session"), /invalid presentation/);
  for (const source of [sessionUi().replace("SessionLayer", "ArchitectureLayers"), sessionUi().replace("[session]", "[session, session]"), sessionUi() + '\nextra = Query("secret", {})', sessionUi().replace(/, "Cost rollup[^\n]+$/, ")")]) assert.throws(() => validatePresentationUi(source, "layer-session"), /invalid presentation/);
  assert.throws(() => validatePresentationUi(sessionUi(), "architecture-layers"), /invalid presentation/);
  assert.throws(() => validatePresentationUi(architectureUi(), "layer-session"), /invalid presentation/);
});
test("session agent enforces layer 1 key terms and facts, skips storage", async () => {
  const reply = await runPresentationAgent(async request => {
    const system = request.messages[0].content ?? "";
    assert.equal(request.messages[1].content, "Layer 1: what does the interaction session capture?");
    for (const term of sessionKeyTerms) assert.ok(system.includes(term), term);
    for (const item of sessionSteps) assert.ok(system.includes(item.title), item.title);
    for (const fact of ["legal entity", "per trace and per session", "virtual keys"]) assert.ok(system.includes(fact), fact);
    assert.ok(system.includes("SessionLayer(summary, entrypoint, identity, context, cost)"));
    return { role: "assistant", content: sessionUi() };
  }, async () => { throw new Error("Session must not access storage"); }, undefined, "layer-session");
  assert.equal(reply.step, "layer-session");
  assert.ok(presentationReplySchema.safeParse(reply).success);
  assert.ok(presentationRequestSchema.safeParse({ mode: "presentation", step: "layer-session" }).success);
});

test("presentation repairs rejected output once, feeding back field-level reasons", async t => {
  const warn = t.mock.method(console, "warn", () => {});
  const tooLong = [sessionCopy[0], "word ".repeat(20).trim(), ...sessionCopy.slice(2)];
  const seen: string[] = [];
  const reply = await runPresentationAgent(async request => {
    seen.push(String(request.messages.at(-1)?.content));
    return { role: "assistant", content: seen.length === 1 ? sessionUi(tooLong) : sessionUi() };
  }, async () => { throw new Error("no storage"); }, undefined, "layer-session");
  assert.equal(reply.source, sessionUi());
  assert.equal(seen.length, 2);
  assert.match(seen[1], /rejected by the validator: entrypoint: .*\(got 20 words, 99 characters\)/);
  assert.equal(warn.mock.callCount(), 1);
  assert.match(String(warn.mock.calls[0].arguments[0]), /layer-session attempt 1\/3 rejected: entrypoint/);
});
test("presentation gives up after three invalid attempts and never leaks details to the client error", async t => {
  t.mock.method(console, "warn", () => {});
  let calls = 0;
  await assert.rejects(runPresentationAgent(async () => { calls++; return { role: "assistant", content: "root = Text(\"nope\")" }; }, async () => { throw new Error("no storage"); }, undefined, "layer-session"), (error: Error & { detail?: string }) => {
    assert.equal(error.message, "The assistant returned an invalid presentation. Please retry.");
    assert.ok(error.detail);
    return true;
  });
  assert.equal(calls, 3);
});
