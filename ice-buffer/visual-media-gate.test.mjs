import assert from "node:assert/strict";
import test from "node:test";
import { assessVisualMedia, imageStoredResponse } from "./visual-media-gate.mjs";

test("text-only posts are not blocked", () => {
  assert.deepEqual(assessVisualMedia({ visual: false }), { ok: true, status: "text_only" });
});

test("a visual post with no image is blocked", () => {
  const result = assessVisualMedia({ visual: true, imageUrl: "" });
  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked_missing_media");
});

test("a visual post whose image Buffer has not confirmed is blocked", () => {
  const result = assessVisualMedia({
    visual: true,
    imageUrl: "https://pub-2cf3acbd41594638a1855b3db79b5fad.r2.dev/ice-media/example.jpg",
    bufferAssets: 0
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked_unconfirmed_media");
});

test("a visual post is allowed only after Buffer confirms the asset", () => {
  const result = assessVisualMedia({
    imageUrl: "https://pub-2cf3acbd41594638a1855b3db79b5fad.r2.dev/ice-media/example.jpg",
    bufferConfirmed: true
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, "media_confirmed");
});

test("image generation without a stored public URL fails closed", () => {
  const missing = imageStoredResponse({ ok: false, status: "blocked_missing_media" });
  assert.equal(missing.http, 409);
  assert.equal(missing.ok, false);
  const stored = imageStoredResponse({
    ok: true,
    public_url: "https://pub-2cf3acbd41594638a1855b3db79b5fad.r2.dev/ice-media/generated/1.png"
  });
  assert.equal(stored.http, 200);
  assert.equal(stored.status, "media_confirmed");
});
