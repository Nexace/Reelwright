# Higgsfield API fact-check (read 2026-11-02, official pages only)

Sources: docs.higgsfield.ai pages (cited per row), github.com/higgsfield-ai API metadata, npm registry for @higgsfield/client. No accounts, no calls with credentials.

## 1. Prices
- No official page states a per-model or per-generation price. The docs index (https://docs.higgsfield.ai/docs/llms.txt) has no pricing page and no model catalog; https://higgsfield.ai/pricing does not mention the API at all; the FAQ gives no per-model costs, top-up amounts or minimums.
- Billing page (https://docs.higgsfield.ai/docs/concepts/billing-and-retention.md): "Higgsfield charges successful generation requests to your account balance." "The exact cost depends on the selected model and parameters." Estimate endpoint: `POST https://api.higgsfield.ai/estimate/<same model path>` with the same body, sample reply `{"usd": "0.094"}` (format only, per the page). "Use the estimate returned for your authenticated account as the authoritative amount." Balance funds "expire one year after they are added". failed/nsfw are not charged (reservation refunded); a canceled queued request is refunded.
- API vs subscription: FAQ (https://docs.higgsfield.ai/docs/help/faq.md): "The API runs on pay-as-you-go by default: you top up a balance and pay per generation." Invoice billing for committed-use contracts. The docs say nothing about subscription credits applying to the API. (Prior note from the CLI guide, https://higgsfield.ai/blog/higgsfield-cli: API uses a separate prepaid USD balance, not plan credits.)
- Consequence: a connector can only learn cost by calling the estimate endpoint with credentials (needs a key; not done here).

## 2. Concurrency / rate limits
- https://docs.higgsfield.ai/docs/concepts/rate-limits.md and https://docs.higgsfield.ai/docs/enterprise/capacity.md: no default concurrency number; limits "are shown in Higgsfield Console". Queue cap is "a multiple of your account's concurrency limit" (multiplier not given).
- 429 example body: `code: account_queue_full`, `limit: 40` (example value), `retry_after_seconds: 30`, message "Too many queued generations for this account", plus a `Retry-After` header. Separate endpoint (custom references / Soul ID training) example: "Maximum number of concurrent requests (2) has been reached."

## 3. Polling and webhooks
Polling (https://docs.higgsfield.ai/docs/concepts/polling.md): start at 2 s, grow by 1.5x up to 10 s with up to 0.5 s jitter; retry status errors with exponential backoff; "Set an application-level timeout appropriate for the selected model" (no number). Sample uses a 30 s HTTP timeout.
Status endpoint: `GET <status_url>` (= `https://api.higgsfield.ai/requests/{request_id}/status`), `Authorization: Key id:secret`. Schema `RequestStatus` (https://docs.higgsfield.ai/docs/api-reference/requests/get-request-status.md, openapi.json): `status` enum `queued | in_progress | nsfw | failed | completed | canceled` (required), `request_id` (uuid, required), optional `status_url`, `cancel_url`, `error` (string|null), `images[]`, `video`, `audio`, `audios[]` (each `{url}`), `expires_at` (date-time|null, "Present once the request has finished"). Errors: 401 and 404 `{"detail": string}`.
Webhooks (https://docs.higgsfield.ai/docs/how-to/webhooks.md):
- Register per request via query parameter `hf_webhook=<https url>` on submit; endpoint must be public, accept JSON, answer within 10 s.
- Envelope: `request_id`, `status`, `error`, `expires_at`, `payload` ("Successful output is nested in `payload`"; images `{url, content_type}`, `video`, `audio`).
- Sent for terminal states `completed`, `failed`, `nsfw` (canceled not listed).
- Signature: Standard Webhooks. Headers `webhook-id`, `webhook-timestamp` (unix s), `webhook-signature` (space-separated `v1,<base64>`). Key = base64-decode of secret after stripping `whsec_`; signed content `{webhook-id}.{webhook-timestamp}.{raw body}`; HMAC-SHA256, base64; constant-time compare; reject timestamps more than 5 min off. (Page also mentions unsigned deliveries; where the secret comes from is on https://docs.higgsfield.ai/docs/enterprise/webhook-security.md, NOT read.)
- Retries: network failures and 5xx for up to 2 h; 4xx not retried; dedupe by `webhook-id`.
- Result URL lifetime: `expires_at` is when files are deleted and URLs stop working. Earlier read: kept 7 days after finish (`Hf-Expires-After` can shorten, min 1 h); submit response earlier seen with `expires_after: 604800` (the quickstart example I re-read omits it).
- Reelwright is a local CLI with no public endpoint: polling is the right transport.

## 4. Request bodies and errors
Auth/headers: `Authorization: Key {id}:{secret}`, `Content-Type: application/json`, `Idempotency-Key` (resend same key after ambiguous timeout).
Image (openapi.json): `POST /higgsfield-ai/soul/standard` body `prompt` (string, required), `num_images` (int 1-4, default 1), `resolution` ("2K"|"4K", default "2K"), `aspect_ratio` (1:1, 4:3, 3:4, 3:2, 2:3, 5:4, 4:5, 16:9, 9:16, 21:9; default 4:3). Quickstart uses newer `POST /higgsfield-ai/soul/v2/standard` with only `{"prompt": "..."}`; its full schema was not found (openapi lags).
Video (openapi.json): `POST /kling-video/v2.5-turbo/pro/text-to-video` body `prompt` (required), `duration` (5|10, default 5), `cfg_scale` (0-1, step 0.01, default 0.5), `negative_prompt` (default ""). Image-to-video at `/kling-video/v2.5-turbo/pro/image-to-video` adds `image_url` (uri, required). Quickstart has no video example; newer video models have their own pages I did not read.
Error table (https://docs.higgsfield.ai/docs/concepts/errors.md): 401 "Missing or invalid credentials" (no retry); **402 not listed; insufficient balance is documented as 403** ("After adding funds"); 422 validation / idempotency key reused with different params / bad `Hf-Expires-After`; 429 `account_queue_full` or endpoint limit, retry after `Retry-After` (format unspecified; body also has `retry_after_seconds`); 500 retry with backoff; 503 model disabled/not ready or `admission_control_unavailable`. Body shape: `{"detail": "Invalid credentials"}` (detail may be a list for validation). Terminal `failed`/`nsfw` carry e.g. `"error": "Generation failed"`. Also (earlier read, unconfirmed here) 403 `code: api_key_disabled`. openapi.json documents no 402/429/Retry-After.

## 5. SDKs
- Page https://docs.higgsfield.ai/docs/how-to/sdk.md: TypeScript/Node `npm install @higgsfield/client` (repo https://github.com/higgsfield-ai/higgsfield-js); Python `pip install higgsfield-client` (repo https://github.com/higgsfield-ai/higgsfield-client). Page states no license.
- Licenses (not from docs pages): npm registry metadata for `@higgsfield/client` 0.2.6 says `"license":"MIT"`; GitHub API shows higgsfield-client = Apache-2.0 and higgsfield-js with no detected license file (`license: null`). So the JS package's license is declared only in npm metadata, with no LICENSE file on GitHub. Plain `fetch` is enough; no SDK needed.

## Table

| item | verified value | source URL | still UNVERIFIED |
|---|---|---|---|
| Per-model / per-generation price | None published; cost via authenticated `POST /estimate/<model path>`, sample `{"usd":"0.094"}` is format-only | https://docs.higgsfield.ai/docs/concepts/billing-and-retention.md | Any real price per image or per second; minimum top-up |
| API vs subscription credits | API is pay-as-you-go prepaid balance; balance funds expire after 1 year; failed/nsfw refunded | https://docs.higgsfield.ai/docs/help/faq.md | Explicit docs statement that plan credits do not apply (only the CLI blog says so) |
| Concurrency / rate limit numbers | No default published; shown in Console; queue = multiple of concurrency; 429 example `limit: 40`, `retry_after_seconds: 30` | https://docs.higgsfield.ai/docs/concepts/rate-limits.md | Actual per-account numbers; multiplier |
| Status values | queued, in_progress (non-terminal); completed, failed, nsfw, canceled (terminal) | https://docs.higgsfield.ai/docs/api-reference/requests/get-request-status.md | - |
| Status endpoint shape | `GET /requests/{id}/status` -> request_id, status, status_url, cancel_url, error, images[]/video/audio/audios[] of `{url}`, expires_at | same | Whether video `{url}` ever carries content_type outside webhooks |
| Polling guidance | 2 s start, x1.5 to 10 s, jitter, app-level timeout | https://docs.higgsfield.ai/docs/concepts/polling.md | Recommended timeout per model |
| Webhook | `hf_webhook` query param; envelope request_id/status/error/expires_at/payload; Standard Webhooks HMAC-SHA256 (`whsec_`), 5 min tolerance; retries 2 h on 5xx | https://docs.higgsfield.ai/docs/how-to/webhooks.md | Where the signing secret is issued (enterprise/webhook-security.md not read); not needed for local polling |
| Result URL lifetime | URLs die at `expires_at`; 7 days default, `Hf-Expires-After` min 1 h | webhooks page + billing-and-retention page | - |
| Image request body | soul/standard: prompt, num_images, resolution, aspect_ratio | https://docs.higgsfield.ai/docs/openapi.json | soul/v2 full schema; other image models |
| Video request body | kling v2.5 turbo pro t2v: prompt, duration 5/10, cfg_scale, negative_prompt; i2v adds image_url | https://docs.higgsfield.ai/docs/openapi.json | Current models (Seedance, Wan 3.0, etc.) bodies |
| Error codes | 401 invalid creds; insufficient balance is **403** (no 402 documented); 422; 429 + Retry-After (+ body code); 500; 503 | https://docs.higgsfield.ai/docs/concepts/errors.md | Retry-After value format; 403 insufficient-balance body code |
| JS SDK | `@higgsfield/client` (npm, v0.2.6), repo higgsfield-ai/higgsfield-js; npm license MIT | https://docs.higgsfield.ai/docs/how-to/sdk.md ; npm registry | No LICENSE file on GitHub repo; docs state no license |
| Python SDK | `higgsfield-client`, Apache-2.0 on GitHub | https://github.com/higgsfield-ai/higgsfield-client | - |
