import test from "node:test";
import assert from "node:assert/strict";
import { openingStep, overviewCategories, langfuseOverviewProps, presentationReplySchema, presentationRequestSchema } from "../lib/shared/presentation-contract";
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
