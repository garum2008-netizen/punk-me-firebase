import assert from "node:assert/strict";
import test from "node:test";
import {
  assessChannel,
  assessVisualMedia,
  confirmBufferAttachment,
  decideRetry,
  duplicateDecision,
  gateAction,
  imageStoredResponse,
  normalizeIdempotencyKey,
  prepareVisualDraft
} from "./visual-media-gate.mjs";

const PNG = "https://pub-2cf3acbd41594638a1855b3db79b5fad.r2.dev/ice-media/gate-20261108/b2b-6-clauses-en.png";
const BUSINESS = "6a9d9398cd8b9c702c1981cd";
const CHILDREN = "6ad507a4778b240e2f4bb2d6";

test("text-only posts are not blocked", () => {
  assert.equal(assessVisualMedia({ visual: false }).status, "text_only");
});

test("a visual post with no image is blocked", () => {
  const result = assessVisualMedia({ visual: true, imageUrl: "" });
  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked_missing_media");
});

test("a private or non-https URL is rejected", () => {
  assert.equal(assessVisualMedia({ imageUrl: "http://cdn.example/a.png", bufferConfirmed: true }).status, "blocked_missing_media");
  assert.equal(assessVisualMedia({ imageUrl: "https://127.0.0.1/a.png", bufferConfirmed: true }).status, "blocked_missing_media");
});

test("an unsupported format is blocked before publication", () => {
  const result = assessVisualMedia({
    imageUrl: "https://cdn.example/animated.gif",
    bufferConfirmed: true
  });
  assert.equal(result.status, "blocked_unsupported_media");
});

test("a visual post whose image Buffer has not confirmed cannot be published", () => {
  const result = assessVisualMedia({
    visual: true,
    imageUrl: PNG,
    bufferAssets: 0
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked_unconfirmed_media");
  assert.equal(result.publish, false);
});

test("a draft may be prepared when the image URL is valid", () => {
  const result = gateAction({ action: "draft", channelId: BUSINESS, audience: "business", imageUrl: PNG });
  assert.equal(result.ok, true);
  assert.equal(result.status, "ready_for_attach");
  assert.equal(result.publish, false);
});

test("a visual draft without an image is blocked", () => {
  const result = gateAction({ action: "draft", channelId: BUSINESS, imageUrl: "" });
  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked_missing_media");
});

test("business media cannot be prepared for a children's channel", () => {
  const result = gateAction({
    action: "draft",
    channelId: CHILDREN,
    audience: "business",
    imageUrl: PNG
  });
  assert.equal(result.status, "blocked_channel_separation");
});

test("an unknown channel is blocked", () => {
  assert.equal(assessChannel("6aaaaaaaaaaaaaaaaaaaaaaa", "business").status, "blocked_unclassified_channel");
});

test("Buffer readback confirms only an attached image and never a sent post", () => {
  const confirmed = confirmBufferAttachment({
    status: "draft",
    sharedNow: false,
    assets: [{ type: "image", mimeType: "image/png", source: PNG }]
  });
  assert.equal(confirmed.status, "media_confirmed");
  const missing = confirmBufferAttachment({ status: "draft", assets: [] });
  assert.equal(missing.status, "blocked_unconfirmed_media");
  const sent = confirmBufferAttachment({ status: "sent", assets: [{ type: "image", mimeType: "image/png", source: PNG }] });
  assert.equal(sent.status, "blocked_publish_not_authorized");
});

test("the same idempotency key is reused and a second post id conflicts", () => {
  const existing = { status: "media_confirmed", public_url: PNG, buffer_post_id: "6af0dfc551492b796e5e74b4" };
  assert.equal(duplicateDecision(existing, { public_url: PNG, buffer_post_id: existing.buffer_post_id }).action, "reuse");
  assert.equal(duplicateDecision(existing, { buffer_post_id: "6af0dfc551492b796e5e74b5" }).error_code, "DUPLICATE_POST");
  assert.equal(normalizeIdempotencyKey("ice-gate-20261111-verify"), "ice-gate-20261111-verify");
  assert.equal(normalizeIdempotencyKey("short"), null);
});

test("retries stop after three attempts and skip permanent errors", () => {
  assert.equal(decideRetry(1, 403), true);
  assert.equal(decideRetry(1, 503), true);
  assert.equal(decideRetry(1, null), true);
  assert.equal(decideRetry(1, 400), false);
  assert.equal(decideRetry(3, 503), false);
});

test("a visual Buffer draft requires a key, a public image, and the matching channel", () => {
  const missing = prepareVisualDraft({ channelId: BUSINESS, audience: "business", text: "x" });
  assert.equal(missing.error_code, "IDEMPOTENCY_KEY");
  const noImage = prepareVisualDraft({
    idempotencyKey: "ice-final-20261111-verify",
    channelId: BUSINESS,
    audience: "business",
    text: "x"
  });
  assert.equal(noImage.status, "blocked_missing_media");
  const child = prepareVisualDraft({
    idempotencyKey: "ice-final-20261111-verify",
    channelId: CHILDREN,
    audience: "business",
    imageUrl: PNG,
    text: "x"
  });
  assert.equal(child.status, "blocked_channel_separation");
  const publish = prepareVisualDraft({
    idempotencyKey: "ice-final-20261111-verify",
    channelId: BUSINESS,
    audience: "business",
    imageUrl: PNG,
    text: "x",
    mode: "shareNow"
  });
  assert.equal(publish.status, "blocked_publish_not_authorized");
  const ready = prepareVisualDraft({
    idempotencyKey: "ice-final-20261111-verify",
    channelId: BUSINESS,
    audience: "business",
    imageUrl: PNG,
    text: "ICE final integration check. Do not publish.",
    altText: "ICE final integration check"
  });
  assert.equal(ready.publish, false);
  assert.equal(ready.request.saveToDraft, true);
  assert.equal(ready.request.mode, undefined);
  assert.equal(ready.request.assets[0].image.url, PNG);
  assert.equal(ready.request.metadata.facebook.type, "post");
  const textOnly = prepareVisualDraft({
    idempotencyKey: "ice-eudi-20261120-teach",
    channelId: "6a9d9227cd8b9c702c197a40",
    audience: "business",
    service: "linkedin",
    visual: false,
    text: "Teaching example."
  });
  assert.equal(textOnly.status, "text_only");
  assert.equal(textOnly.request.assets, undefined);
  assert.equal(textOnly.request.metadata, undefined);
});

test("image generation without a stored public URL fails closed", () => {
  const missing = imageStoredResponse({ ok: false, status: "blocked_missing_media" });
  assert.equal(missing.http, 409);
  const stored = imageStoredResponse({ ok: true, public_url: PNG, content_type: "image/png" });
  assert.equal(stored.http, 200);
  assert.equal(stored.status, "media_confirmed");
});
