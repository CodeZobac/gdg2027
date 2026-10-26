# Architecture

Browser → public POST /api/chat → one of three modes:

- `{ message, history? }` → **chat agent** (`lib/server/chat-agent.ts`). DeepSeek Flash with no tools, a system prompt built from the presentation knowledge and the OpenUI library (Text + the eight slide components). At most six short, text-only history turns are sent and treated as untrusted. The server validates the OpenUI Lang (`lib/server/chat-ui.ts`): one to three children, at least one Text, at most one slide component, slide props checked against the same zod schemas as the presentation, then re-serialized as a canonical literal-only program. Invalid output gets up to two self-repair attempts with field-level reasons logged server-side.
- `{ mode: "presentation", step }` → **presentation agent**. One fixed prompt per slide; trusted React renders all facts, the model writes short plain-text copy.
- `{ mode: "gallery" }` → **last year's gallery**. Uniform reservoir sampling of twelve photos from the configured bucket/prefix, signed for five minutes. No model call.

No model-generated JS, TSX, HTML or URLs ever run. Queries, mutations, state, unknown components and unresolved references are rejected. Per-browser spam checks and the 10,000-byte body limit apply to every mode.
