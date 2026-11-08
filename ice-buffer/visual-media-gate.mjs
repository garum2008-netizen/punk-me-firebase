// Visual-post gate used by the live worker inna-content-engine-gateway.
// A visual publication is blocked unless a public image URL exists and
// Buffer has confirmed the attachment. Text-only posts are unchanged.

export function assessVisualMedia(input) {
  const visual = !input || input.visual !== false;
  const imageUrl = String((input && (input.imageUrl || input.public_url || input.assetUrl)) || "").trim();
  const confirmed = !!(input && (input.bufferConfirmed === true || Number(input.bufferAssets) > 0));
  if (!visual) return { ok: true, status: "text_only" };
  if (!/^https:\/\/\S+$/.test(imageUrl)) {
    return {
      ok: false,
      status: "blocked_missing_media",
      reason: "visual post has no public image URL"
    };
  }
  if (!confirmed) {
    return {
      ok: false,
      status: "blocked_unconfirmed_media",
      reason: "Buffer has not confirmed the image is attached",
      image_url: imageUrl
    };
  }
  return { ok: true, status: "media_confirmed", image_url: imageUrl };
}

export function imageStoredResponse(stored) {
  if (!stored || stored.ok !== true || typeof stored.public_url !== "string" || !stored.public_url.startsWith("https://")) {
    return {
      ok: false,
      status: (stored && stored.status) || "blocked_missing_media",
      error_code: "MEDIA_NOT_CONFIRMED",
      http: 409
    };
  }
  return {
    ok: true,
    status: "media_confirmed",
    public_url: stored.public_url,
    http: 200
  };
}
