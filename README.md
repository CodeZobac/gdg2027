# GDG Faro Langfuse assistant

Next.js, React, strict TypeScript, Tailwind CSS and OpenUI, powered by DeepSeek Flash.

Run the commands below from the application directory (the repository root after cloning, or `source/` in the original workspace).

```sh
npm ci
npm run dev
```

Anyone with the app link can use the app without an access code. Three surfaces share the public `/api/chat` endpoint:

- **Chat**: a Langfuse assistant grounded in the presentation (`lib/server/presentation-knowledge.ts`, built from the same trusted contract as the slides). It answers in plain text and embeds at most one interactive slide component when a visual helps.
- **Presentation**: nine OpenUI-driven slides (Langfuse overview, the four instrumentation layers, the tracing principle and closing QR codes).
- **Last year's gallery**: twelve random photos from the private Supabase collection, signed for five minutes.

Configure server-only secrets using [.env.example](.env.example) and follow [setup instructions](docs/setup-agent.md). The model is `deepseek-flash`, called directly through the official DeepSeek API with native fetch. No Google Cloud configuration is required.

Photos never reach the model: the gallery is served directly, and the only model-facing image reference is the opaque presentation photo ID. Google Photos remains disconnected; there is no persistent index or application database table. The approved free Supabase project is `gdg-faro-photos` (`zmljzjsgxnjqlqtuoilv`), with private bucket `gdg-photos`. Paid Supabase upgrades are not authorized.

See [architecture](docs/agent-plan.md). Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` to verify. Tests mock external requests. Live inference requires local credentials and four uploaded photos.

The full DevFest collection contains 286 compressed JPEGs in the private bucket (59.17 MB, no videos), seeded and verified on 2026-10-23. Run `npm run photos:compress` to prepare the local gallery; see setup instructions for details. The one-time seed script was removed after verification.
