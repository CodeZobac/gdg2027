# Photo agent architecture

Browser → public POST /api/chat → DeepSeek Flash tool request → select_random_photos → Supabase selection and signing → DeepSeek OpenUI Lang → server validation → approved React renderer.

The server-only native-fetch adapter calls https://api.deepseek.com/chat/completions with `deepseek-flash`, thinking disabled and streaming disabled. Each provider request has a 25-second timeout within the route’s 60-second deadline. The first call requires a tool; the second disables tools. Exactly one authorized call with empty arguments is accepted. There are no Google Cloud dependencies or credit gates.

The tool scans paginated folders under one server-configured bucket/prefix, performs uniform reservoir sampling over eligible files, and returns four distinct photos. It fails if fewer than four images exist or more than 10,000 listing entries are encountered. A fixed collection during a scan gives an unbiased sample; concurrent bucket edits can affect the listing snapshot. No database tables or indexing are needed.

Only opaque IDs go to the model. Pixel data, storage object paths and signed URLs do not. Photo cards receive five-minute bearer URLs separately from the model output; those URLs are held only in browser memory. The server validates their storage origin and path. Expired or failed images show a refresh instruction. A later request may randomly include a photo from an earlier request.

OpenUI accepts Response, Text and PhotoGallery only. The server parses model output, validates exactly one gallery containing the four authorized IDs exactly once, and serializes a canonical literal-only program. Queries, mutations, state, unknown components and unresolved references are rejected. No model-generated JS or TSX runs.

The current agent is one-turn per message and stateless: frontend history is not sent to the model. There is no global request-per-minute or concurrency cap, and no character cap separate from the 10,000-byte request body. Per-browser spam checks reject duplicate submissions within two seconds or more than ten submissions in ten seconds. Browser identity uses a short-lived HttpOnly SameSite cookie; in-memory records expire after ten minutes and are bounded to 10,000 entries. This is best-effort session spam prevention: clearing cookies or switching server processes can bypass it. Anyone with the link can use the agent without authentication. For stronger protection against bots that discard cookies, use deployment-level abuse controls.
