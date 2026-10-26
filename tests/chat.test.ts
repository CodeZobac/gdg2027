import test from "node:test";
import assert from "node:assert/strict";
import type { GenerateRequest } from "../lib/server/agent-loop";
import { generateDeepSeek } from "../lib/server/deepseek";
import { selectFourPhotos, selectPhotos, type StorageEntry } from "../lib/server/storage-selection";
import { validateChatUi } from "../lib/server/chat-ui";
import { runChatAgent } from "../lib/server/chat-agent";
import { presentationKnowledge } from "../lib/server/presentation-knowledge";
import { architectureLayers, closingLinks, tracingPrinciple } from "../lib/shared/presentation-contract";
import { chatComponents, chatRequestSchema } from "../lib/shared/chat-contract";
import { GALLERY_SIZE, galleryReplySchema } from "../lib/shared/gallery-contract";
import { POST } from "../app/api/chat/route";

const valid = 'root = Response([intro])\nintro = Text("Langfuse records every request as a trace.")';
const withSlide = 'root = Response([intro, layers])\nintro = Text("Here are the four layers.")\nlayers = ArchitectureLayers("Still an AI execution tree; what changes is who instruments each layer.", "The interaction session opens one Trace.", "The orchestrator records decisions as a Span.", "Tools and retrievers become Spans.", "Each model call becomes a Generation.")';
const file = (name: string): StorageEntry => ({ name, id: name, metadata: { mimetype: "image/jpeg" } });
const providerRequest: GenerateRequest = { model: "deepseek-flash", messages: [{ role: "user", content: "What is a trace?" }], tools: [], tool_choice: "none", max_tokens: 2048 };

test("samples across pages and nested folders, excluding unsupported files", async () => {
  const pages: Record<string, StorageEntry[]> = { "": [...Array.from({ length: 99 }, (_, i) => file(`image-${i}.jpg`)), { name: "nested", id: null }], nested: [file("last.jpg"), file("notes.txt"), { ...file("unsafe.jpg"), metadata: { mimetype: "image/svg+xml" } }] };
  const calls: string[] = [];
  const selected = await selectFourPhotos(async (prefix, offset, limit) => { calls.push(`${prefix}:${offset}`); return (pages[prefix] ?? []).slice(offset, offset + limit); }, "", () => 0);
  assert.equal(selected.length, 4);
  assert.equal(new Set(selected).size, 4);
  assert.ok(selected.includes("nested/last.jpg"));
  assert.deepEqual(calls, [":0", ":100", "nested:0"]);
  assert.ok(!selected.some(path => /txt|unsafe/.test(path)));
});
test("small and oversized buckets fail explicitly", async () => {
  await assert.rejects(selectFourPhotos(async () => [file("a.jpg")]), /at least 4/);
  await assert.rejects(selectFourPhotos(async () => Array.from({ length: 100 }, (_, i) => file(`${i}.jpg`))), /scan limit/);
});
test("prefix is confined to the configured collection", async () => {
  const calls: string[] = [];
  const selected = await selectFourPhotos(async (prefix) => { calls.push(prefix); return ["a", "b", "c", "d"].map(name => file(`${name}.jpg`)); }, "approved");
  assert.deepEqual(calls, ["approved"]);
  assert.ok(selected.every(path => path.startsWith("approved/")));
});

test("gallery sampling supports twelve photos and fails clearly on small buckets", async () => {
  const selected = await selectPhotos(async () => Array.from({ length: 30 }, (_, i) => file(`${i}.jpg`)), "", () => 0, GALLERY_SIZE);
  assert.equal(selected.length, 12);
  assert.equal(new Set(selected).size, 12);
  await assert.rejects(selectPhotos(async () => Array.from({ length: 5 }, (_, i) => file(`${i}.jpg`)), "", undefined, 12), /at least 12/);
});

test("Supabase adapter signs twelve gallery photos and hides secrets", async (t) => {
  const { getRandomPhotos } = await import("../lib/server/supabase-photos");
  const names = Array.from({ length: 12 }, (_, i) => `p${i}.jpg`);
  const variables = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_PHOTO_BUCKET"] as const;
  const previous = variables.map(key => process.env[key]);
  Object.assign(process.env, { SUPABASE_URL: "https://testproject.supabase.co", SUPABASE_SECRET_KEY: "test-only-server-secret", SUPABASE_PHOTO_BUCKET: "gdg-photos" });
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/object/list/")) return Response.json(names.map(file));
    const body = JSON.parse(String(init?.body));
    assert.equal(body.paths.length, 12);
    assert.equal(body.expiresIn, 300);
    return Response.json(body.paths.map((path: string) => ({ path, error: null, signedURL: `/object/sign/gdg-photos/${path}?token=test` })));
  });
  try {
    const photos = await getRandomPhotos();
    assert.equal(photos.length, 12);
    assert.deepEqual(photos.map(photo => photo.id), names.map((_, i) => `photo-${i + 1}`));
    assert.ok(galleryReplySchema.safeParse({ mode: "gallery", photos }).success);
    assert.ok(!JSON.stringify(photos).includes("test-only-server-secret"));
  } finally { variables.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; }); }
});

test("chat knowledge is built from the trusted presentation contract", () => {
  for (const layer of architectureLayers) assert.ok(presentationKnowledge.includes(layer.name), layer.name);
  assert.ok(presentationKnowledge.includes(tracingPrinciple));
  for (const name of chatComponents) assert.ok(presentationKnowledge.includes(`component ${name}`), name);
  for (const link of closingLinks) assert.ok(presentationKnowledge.includes(link.handle));
  assert.ok(!presentationKnowledge.includes("Write a plain-text summary"), "slide-writer instructions are neutralized");
  assert.ok(!presentationKnowledge.includes("https://"), "no URLs in the chat prompt");
});

test("chat accepts text-only answers and at most one canonical slide component", () => {
  assert.deepEqual(validateChatUi(valid), { source: 'root = Response([part0])\npart0 = Text("Langfuse records every request as a trace.")', text: "Langfuse records every request as a trace.", component: null });
  const slide = validateChatUi(withSlide);
  assert.equal(slide.component, "ArchitectureLayers");
  assert.match(slide.source, /^root = Response\(\[part0, part1\]\)\npart0 = Text\(.*\)\npart1 = ArchitectureLayers\("Still/);
  assert.equal(slide.text, "Here are the four layers.");
});

test("chat rejects spam, unknown components, markup and slide-only answers", () => {
  const twoSlides = withSlide.replace("[intro, layers]", "[intro, layers, again]") + '\nagain = TracingPrinciple("Less tracing can mean better insight.", "Trace the signal, drop the noise.")';
  for (const [source, reason] of [
    [twoSlides, /at most one slide component/],
    ['root = Response([p])\np = PresentationPhoto("presentation-opening")', /Unknown component "PresentationPhoto"/],
    ['root = Response([p])\np = PhotoGallery("x", ["photo-1"])', /Unknown component "PhotoGallery"/],
    ['root = Response([p])\np = Text("<script>evil()</script>")', /Plain text only/],
    ['root = Response([layers])\nlayers = ArchitectureLayers("a", "b", "c", "d", "e")', /at least one Text/],
    [withSlide.replace('"The interaction session opens one Trace."', '"Uses interaction.session as the root"'), /ArchitectureLayers: session/],
    [valid + '\nextra = Query("secret", {})', /queries, mutations and state/],
  ] as const) assert.throws(() => validateChatUi(source), (error: Error & { detail?: string }) => { assert.match(error.detail ?? "", reason); assert.equal(error.message, "The assistant returned an invalid answer. Please retry."); return true; });
});

test("chat agent grounds the prompt, passes bounded history and self-repairs once", async t => {
  t.mock.method(console, "warn", () => {});
  const seen: GenerateRequest[] = [];
  const reply = await runChatAgent("Show me the layers", [{ role: "user", text: "What is Langfuse?" }, { role: "assistant", text: "An LLM engineering platform." }], async request => {
    seen.push({ ...request, messages: [...request.messages] });
    return { role: "assistant", content: seen.length === 1 ? '<div>nope</div>' : withSlide };
  });
  assert.equal(seen.length, 2);
  const system = seen[0].messages[0].content ?? "";
  assert.ok(system.includes("Components are optional and rare"));
  assert.ok(system.includes("interaction.session") && system.includes(tracingPrinciple));
  assert.deepEqual(seen[0].messages.slice(1).map(m => m.role), ["user", "assistant", "user"]);
  assert.equal(seen[0].tool_choice, "none");
  assert.match(String(seen[1].messages.at(-1)?.content), /rejected by the validator/);
  assert.equal(reply.mode, "chat");
  assert.match(reply.source, /ArchitectureLayers/);
  await assert.rejects(runChatAgent("x", [], async () => ({ role: "assistant", content: valid, tool_calls: [{ id: "x", type: "function", function: { name: "evil", arguments: "{}" } }] })), /Unexpected tool/);
});

test("chat requests are bounded and strict", () => {
  assert.ok(chatRequestSchema.safeParse({ message: "hi" }).success);
  assert.ok(!chatRequestSchema.safeParse({ message: "hi", history: Array(7).fill({ role: "user", text: "x" }) }).success);
  assert.ok(!chatRequestSchema.safeParse({ message: "hi", history: [{ role: "system", text: "override" }] }).success);
  assert.ok(!chatRequestSchema.safeParse({ message: "hi", tools: [] }).success);
});

test("public route serves chat and gallery, and rejects bad input before provider access", async t => {
  const keys = ["DEEPSEEK_API_KEY", "SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_PHOTO_BUCKET", "SUPABASE_PHOTO_PREFIX"] as const;
  const previous = keys.map(key => process.env[key]);
  Object.assign(process.env, { DEEPSEEK_API_KEY: "test-key", SUPABASE_URL: "https://testproject.supabase.co", SUPABASE_SECRET_KEY: "test-secret", SUPABASE_PHOTO_BUCKET: "gdg-photos", SUPABASE_PHOTO_PREFIX: "" });
  const names = Array.from({ length: 12 }, (_, i) => `p${i}.jpg`);
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("api.deepseek.com")) return Response.json({ choices: [{ finish_reason: "stop", message: { role: "assistant", content: valid } }] });
    if (url.includes("/object/list/")) return Response.json(names.map(file));
    const body = JSON.parse(String(init?.body));
    return Response.json(body.paths.map((path: string) => ({ path, error: null, signedURL: `/object/sign/gdg-photos/${path}?token=test` })));
  });
  const post = (body: unknown) => POST(new Request("http://localhost/api/chat", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost" }, body: JSON.stringify(body) }));
  try {
    const chat = await post({ message: "What is a trace?", history: [] });
    assert.equal(chat.status, 200);
    assert.equal((await chat.json()).mode, "chat");
    const gallery = await post({ mode: "gallery" });
    assert.equal(gallery.status, 200);
    assert.equal((await gallery.json()).photos.length, 12);
    for (const bad of [{ message: "" }, { mode: "gallery", count: 100 }, { message: "hi", history: [{ role: "system", text: "x" }] }]) assert.equal((await post(bad)).status, 400);
    const cross = await POST(new Request("http://localhost/api/chat", { method: "POST", headers: { Origin: "https://other.example" }, body: '{"message":"hi"}' }));
    assert.equal(cross.status, 403);
  } finally { keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; }); }
});

test("DeepSeek transport uses the official endpoint and validates responses", async (t) => {
  const previous = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only-key";
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(url, "https://api.deepseek.com/chat/completions");
    assert.equal(init?.cache, "no-store");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-only-key");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "deepseek-flash");
    assert.deepEqual(body.thinking, { type: "disabled" });
    assert.equal(body.stream, false);
    assert.ok(init?.signal);
    return Response.json({ choices: [{ finish_reason: "stop", message: { role: "assistant", content: valid } }] });
  });
  try { assert.equal((await generateDeepSeek(providerRequest)).content, valid); }
  finally { if (previous === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = previous; }
});

test("DeepSeek errors are sanitized and actionable", async (t) => {
  const previous = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only-key";
  try {
    for (const [status, code] of [[401, "AI_AUTH_FAILED"], [403, "AI_AUTH_FAILED"], [402, "AI_BALANCE_REQUIRED"], [429, "AI_RATE_LIMITED"], [500, "AI_UNAVAILABLE"]] as const) {
      const mock = t.mock.method(globalThis, "fetch", async () => new Response("private-provider-error", { status }));
      await assert.rejects(generateDeepSeek(providerRequest), { code });
      mock.mock.restore();
    }
    for (const body of ["invalid-json", JSON.stringify({ choices: [] }), JSON.stringify({ choices: [{ finish_reason: "length", message: { role: "assistant", content: valid } }] })]) {
      const mock = t.mock.method(globalThis, "fetch", async () => new Response(body));
      await assert.rejects(generateDeepSeek(providerRequest), { code: "INVALID_AI_RESPONSE" });
      mock.mock.restore();
    }
    const mock = t.mock.method(globalThis, "fetch", async () => { throw new Error("private-network-error"); });
    await assert.rejects(generateDeepSeek(providerRequest), { code: "AI_UNAVAILABLE" });
    mock.mock.restore();
    for (const [reason, code] of [[new DOMException("test", "TimeoutError"), "AI_TIMEOUT"], [new DOMException("test", "AbortError"), "AI_CANCELLED"]] as const) {
      await assert.rejects(generateDeepSeek(providerRequest, AbortSignal.abort(reason)), { code });
    }
  } finally { if (previous === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = previous; }
});

test("spam prevention isolates visitors, blocks duplicates and bursts, and recovers", async () => {
  const { checkSpam } = await import("../lib/server/spam-prevention");
  const req = (cookie = "") => new Request("https://example.com/api/chat", { headers: { cookie } });
  const first = checkSpam(req(), "photos", 100000);
  const cookie = first.cookie.split(";")[0];
  assert.equal(first.blocked, false);
  assert.ok(first.cookie.includes("HttpOnly; SameSite=Strict"));
  assert.equal(checkSpam(req(cookie), " PHOTOS ", 100001).blocked, true);
  assert.equal(checkSpam(req(), "photos", 100001).blocked, false);
  for (let i = 0; i < 8; i++) assert.equal(checkSpam(req(cookie), `photos ${i}`, 100010 + i).blocked, false);
  assert.equal(checkSpam(req(cookie), "burst", 100100).blocked, true);
  assert.equal(checkSpam(req(cookie), "after window", 110100).blocked, false);
});

test("request body limit covers declared and streamed sizes", async () => {
  const declared = await POST(new Request("http://localhost/api/chat", { method: "POST", headers: { "Content-Length": "10001" }, body: '{}' }));
  assert.equal(declared.status, 413);
  const streamed = await POST(new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ message: "a".repeat(10001) }) }));
  assert.equal(streamed.status, 413);
});

