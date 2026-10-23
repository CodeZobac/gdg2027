# Local setup

Copy `.env.example` to `.env.local` if no configuration exists. Keep all keys server-only and out of source control; never use `NEXT_PUBLIC_` for them.

1. Create a DeepSeek API key at https://platform.deepseek.com/ and set `DEEPSEEK_API_KEY`. The engine uses `deepseek-flash` directly; an available API balance is required.
2. Set `SUPABASE_SECRET_KEY` locally from the project's API Keys settings. Keep `SUPABASE_URL`, `SUPABASE_PHOTO_BUCKET` and optional `SUPABASE_PHOTO_PREFIX` configured for the authorized collection.
3. Upload at least four approved images to the private `gdg-photos` bucket. No public access policy is needed.
4. Start with `npm run dev` and request four photos. Anyone with the app link can use the agent; there is no access code or Demo mode.

Signed photo URLs expire after five minutes; request another gallery to refresh. Use HTTPS when hosted. Spam checks apply per browser session: duplicate submissions within two seconds and bursts above ten messages in ten seconds are rejected. There is no shared quota or server concurrency cap. Requests remain limited to 10,000 bytes.

Missing API configuration, rejected credentials, insufficient balance, rate limiting, timeouts and malformed responses produce sanitized errors. No Google credentials, cloud project or credit-verification record are needed.

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Automated tests mock both services. A live end-to-end test requires configured credentials, an available DeepSeek balance and four photos; no live verification is implied by passing mocked tests.

## Prepare the full gallery

Keep photo originals and compressed outputs outside `source/` and out of source control. The local full gallery is `../gdgfarodevfest25` (286 JPEGs and one excluded MP4).

```sh
npm run photos:compress
```

Compression defaults to `../gdgfarodevfest25` → `../gdg-fotos-compressed`. Optional input/output paths can follow `npm run photos:compress --`. It preserves matching existing images, refuses changed sources/outputs, applies orientation, resizes within 1920 × 1920 without enlargement, encodes JPEG quality 82 and removes embedded metadata. A local manifest records original/compressed SHA-256 hashes, dimensions and sizes for resuming and verification. The initial 15 images were cross-checked against `../gdg-fotos-selection` before reuse. This workflow accepts JPEGs only and excludes videos and other files.

On 2026-10-23, the full collection was seeded into the private `gdg-photos` bucket: 271 new uploads plus 15 preserved images. All 286 remote files were downloaded and SHA-256 verified. The Supabase integration independently confirmed 286 JPEGs, no videos, 59,173,489 total bytes, and private access. The temporary seed script and npm seed command were removed afterward at the owner's request. No existing objects were overwritten or deleted, no policies were changed, and no paid upgrade was made.
