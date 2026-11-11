// Media gate for visual ICE posts.
// A visual draft may be prepared only with a public JPEG, PNG, or WebP URL.
// Publication stays blocked until Buffer readback confirms the attachment.
// This module does not publish and does not call Buffer.

const FORMAT_BY_EXTENSION = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

const ALLOWED_TYPES = new Set(Object.values(FORMAT_BY_EXTENSION));

export const CHANNEL_CLASS = {
  "6a9d9398cd8b9c702c1981cd": "business",
  "6a9d9227cd8b9c702c197a40": "business",
  "6ad64323778b240e2f5abcb6": "children",
  "6ad50e6f778b240e2f4c26d0": "children",
  "6ad507a4778b240e2f4bb2d6": "children"
};

export function mediaFormat(url, contentType) {
  const type = String(contentType || "").split(";")[0].trim().toLowerCase();
  if (type) return ALLOWED_TYPES.has(type) ? type : null;
  const path = String(url || "").split("?")[0].split("#")[0];
  const extension = path.includes(".") ? path.slice(path.lastIndexOf(".") + 1).toLowerCase() : "";
  return FORMAT_BY_EXTENSION[extension] || null;
}

export function isPublicImageUrl(url) {
  let parsed;
  try {
    parsed = new URL(String(url || ""));
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (host === "0.0.0.0" || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.")) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
  if (host.includes(":")) return false;
  return true;
}

export function normalizeIdempotencyKey(key) {
  const value = String(key || "").trim();
  return /^[A-Za-z0-9._:-]{8,80}$/.test(value) ? value : null;
}

export function decideRetry(attempt, status) {
  if (attempt >= 3) return false;
  if (status == null) return true;
  return status === 429 || status >= 500;
}

export function assessChannel(channelId, audience) {
  const channel = CHANNEL_CLASS[String(channelId || "")];
  if (!channel) {
    return { ok: false, status: "blocked_unclassified_channel", error_code: "CHANNEL_UNCLASSIFIED" };
  }
  const wanted = audience || channel;
  if (wanted !== "business" && wanted !== "children") {
    return { ok: false, status: "blocked_unclassified_channel", error_code: "AUDIENCE_UNCLASSIFIED" };
  }
  if (wanted !== channel) {
    return {
      ok: false,
      status: "blocked_channel_separation",
      error_code: "CHANNEL_SEPARATION",
      channel,
      audience: wanted
    };
  }
  return { ok: true, status: "channel_ok", channel };
}

export function assessVisualMedia(input) {
  const visual = !input || input.visual !== false;
  const imageUrl = String((input && (input.imageUrl || input.public_url || input.assetUrl)) || "").trim();
  const confirmed = !!(input && (input.bufferConfirmed === true || Number(input.bufferAssets) > 0));
  if (!visual) return { ok: true, status: "text_only", publish: false };
  if (!isPublicImageUrl(imageUrl)) {
    return { ok: false, status: "blocked_missing_media", error_code: "MEDIA_URL_MISSING", publish: false };
  }
  const format = mediaFormat(imageUrl, input && input.contentType);
  if (!format) {
    return {
      ok: false,
      status: "blocked_unsupported_media",
      error_code: "MEDIA_FORMAT",
      image_url: imageUrl,
      publish: false
    };
  }
  if (!confirmed) {
    return {
      ok: false,
      status: "blocked_unconfirmed_media",
      error_code: "BUFFER_ASSET_MISSING",
      image_url: imageUrl,
      content_type: format,
      publish: false
    };
  }
  return { ok: true, status: "media_confirmed", image_url: imageUrl, content_type: format, publish: false };
}

export function gateAction(input) {
  const action = input && input.action === "draft" ? "draft" : "publish";
  if (input && input.channelId) {
    const channel = assessChannel(input.channelId, input.audience);
    if (!channel.ok) return { ...channel, publish: false, http: 409 };
  }
  const visual = !input || input.visual !== false;
  if (!visual) return { ok: true, status: "text_only", action, publish: false, http: 200 };
  const imageUrl = String((input && (input.imageUrl || input.public_url || input.assetUrl)) || "").trim();
  if (!isPublicImageUrl(imageUrl)) {
    return { ok: false, status: "blocked_missing_media", error_code: "MEDIA_URL_MISSING", action, publish: false, http: 409 };
  }
  const format = mediaFormat(imageUrl, input && input.contentType);
  if (!format) {
    return { ok: false, status: "blocked_unsupported_media", error_code: "MEDIA_FORMAT", action, publish: false, http: 409 };
  }
  const verdict = assessVisualMedia(input);
  if (action === "draft" && verdict.status === "blocked_unconfirmed_media") {
    return {
      ok: true,
      status: "ready_for_attach",
      error_code: null,
      image_url: imageUrl,
      content_type: format,
      action,
      publish: false,
      http: 200
    };
  }
  return { ...verdict, action, http: verdict.ok ? 200 : 409 };
}

export function confirmBufferAttachment(input) {
  const visual = !input || input.visual !== false;
  if (input && (input.sharedNow === true || input.status === "sent" || input.status === "sending")) {
    return { ok: false, status: "blocked_publish_not_authorized", error_code: "PUBLISH_NOT_AUTHORIZED", publish: false };
  }
  if (!visual) return { ok: true, status: "text_only", publish: false };
  const assets = Array.isArray(input && input.assets) ? input.assets : [];
  const image = assets.find((asset) => asset && (asset.type === "image" || asset.source || asset.image));
  const imageUrl = String((image && (image.source || (image.image && image.image.url) || image.url)) || "").trim();
  const contentType = image && (image.mimeType || image.contentType || "");
  if (!image || !isPublicImageUrl(imageUrl) || !mediaFormat(imageUrl, contentType)) {
    return {
      ok: false,
      status: "blocked_unconfirmed_media",
      error_code: "BUFFER_ASSET_MISSING",
      buffer_assets: assets.length,
      publish: false
    };
  }
  return {
    ok: true,
    status: "media_confirmed",
    image_url: imageUrl,
    content_type: mediaFormat(imageUrl, contentType),
    buffer_assets: assets.length,
    publish: false
  };
}

export function duplicateDecision(existing, incoming) {
  if (!existing) return { action: "create" };
  const nextPost = incoming && incoming.buffer_post_id || null;
  const nextUrl = incoming && incoming.public_url || null;
  if (existing.buffer_post_id && nextPost && existing.buffer_post_id !== nextPost) {
    return { action: "conflict", status: "duplicate_conflict", error_code: "DUPLICATE_POST" };
  }
  if (existing.public_url && nextUrl && existing.public_url !== nextUrl) {
    return { action: "conflict", status: "duplicate_conflict", error_code: "DUPLICATE_MEDIA" };
  }
  return { action: "reuse", status: existing.status, error_code: null };
}

export function imageStoredResponse(stored) {
  if (!stored || stored.ok !== true || !isPublicImageUrl(stored.public_url) || !mediaFormat(stored.public_url, stored.content_type)) {
    return {
      ok: false,
      status: (stored && stored.status) || "blocked_missing_media",
      error_code: "MEDIA_NOT_CONFIRMED",
      http: 409
    };
  }
  return { ok: true, status: "media_confirmed", public_url: stored.public_url, http: 200 };
}
