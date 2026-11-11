# ICE media recovery

The live worker is `inna-content-engine-gateway`. It stores generated images in the public R2 bucket `ice-public-media` and writes one status object per idempotency key at `ice-status/<key>.json`. It does not call Buffer and it does not publish.

Visual image generation requires an idempotency key and returns only the public image URL. The base64 payload is not a successful media result. Buffer credentials stay in the authorized Buffer client. `prepareVisualDraft` is the only payload that may create a visual draft: it forces `saveToDraft`, omits immediate publishing, and refuses a channel whose audience does not match. No Cloudflare worker contains a Buffer API call. Ask Inna calls the gateway only for text.

Status values:

- `ready_for_attach` — a public JPEG, PNG, or WebP URL passed validation. A draft may be created. Publication is still blocked.
- `media_stored` — the worker stored an image and a public HEAD check returned an allowed image type.
- `media_confirmed` — Buffer readback shows the same image attached, and the post is not sent.
- `blocked_missing_media` — the visual post has no public image URL.
- `blocked_unsupported_media` — the URL is not JPEG, PNG, or WebP.
- `blocked_unconfirmed_media` — Buffer did not return the image.
- `blocked_channel_separation` — a business post was aimed at a children's channel, or the reverse.
- `duplicate_conflict` — the idempotency key already belongs to a different image or Buffer post.

Recovery:

1. Read `ice-status/<key>.json`. Do not create another Buffer post for that key.
2. If the status is `media_stored` or `ready_for_attach`, create one Buffer draft with that `public_url`. Do not use share-now.
3. Read the draft back. Continue only when the asset source matches `public_url` and `sharedNow` is false.
4. Write the Buffer post id back through `POST /api/media/status`. A different post id for the same key returns `duplicate_conflict`.
5. Leave the existing Buffer queue unchanged. Children's channels and the business channels stay on their own channel class.

Image storage and the public HEAD check retry at most three times. A retry is used for a network failure, a brief public HTTP 403, HTTP 429, or HTTP 5xx. A missing idempotency key blocks image generation before any image is requested.
