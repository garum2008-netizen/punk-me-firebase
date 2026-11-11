var MEDIA_TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
var ALLOWED_MEDIA = { "image/jpeg": 1, "image/png": 1, "image/webp": 1 };
var CHANNEL_CLASS = {
  "6a9d9398cd8b9c702c1981cd": "business",
  "6a9d9227cd8b9c702c197a40": "business",
  "6ad64323778b240e2f5abcb6": "children",
  "6ad50e6f778b240e2f4c26d0": "children",
  "6ad507a4778b240e2f4bb2d6": "children"
};

function mediaFormat(url, contentType) {
  var type = String(contentType || "").split(";")[0].trim().toLowerCase();
  if (type) return ALLOWED_MEDIA[type] ? type : null;
  var path = String(url || "").split("?")[0].split("#")[0];
  var extension = path.indexOf(".") >= 0 ? path.slice(path.lastIndexOf(".") + 1).toLowerCase() : "";
  return MEDIA_TYPES[extension] || null;
}

function isPublicImageUrl(url) {
  try {
    var parsed = new URL(String(url || ""));
    if (parsed.protocol !== "https:") return false;
    var host = parsed.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
    if (host === "0.0.0.0" || host.indexOf("127.") === 0 || host.indexOf("10.") === 0 || host.indexOf("192.168.") === 0) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    if (host.indexOf(":") >= 0) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function normalizeIdempotencyKey(key) {
  var value = String(key || "").trim();
  return /^[A-Za-z0-9._:-]{8,80}$/.test(value) ? value : null;
}

function decideRetry(attempt, status) {
  if (attempt >= 3) return false;
  if (status == null) return true;
  return status === 403 || status === 429 || status >= 500;
}

function wait(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function statusObjectKey(key) {
  return "ice-status/" + key + ".json";
}

function assessChannel(channelId, audience) {
  var channel = CHANNEL_CLASS[String(channelId || "")];
  if (!channel) return { ok: false, status: "blocked_unclassified_channel", error_code: "CHANNEL_UNCLASSIFIED" };
  var wanted = audience || channel;
  if (wanted !== "business" && wanted !== "children") {
    return { ok: false, status: "blocked_unclassified_channel", error_code: "AUDIENCE_UNCLASSIFIED" };
  }
  if (wanted !== channel) {
    return { ok: false, status: "blocked_channel_separation", error_code: "CHANNEL_SEPARATION", channel: channel, audience: wanted };
  }
  return { ok: true, status: "channel_ok", channel: channel };
}

function assessVisualMedia(input) {
  var visual = !input || input.visual !== false;
  var imageUrl = String((input && (input.imageUrl || input.public_url || input.assetUrl)) || "").trim();
  var confirmed = !!(input && (input.bufferConfirmed === true || Number(input.bufferAssets) > 0));
  if (!visual) return { ok: true, status: "text_only", publish: false };
  if (!isPublicImageUrl(imageUrl)) {
    return { ok: false, status: "blocked_missing_media", error_code: "MEDIA_URL_MISSING", reason: "visual post has no public image URL", publish: false };
  }
  var format = mediaFormat(imageUrl, input && input.contentType);
  if (!format) {
    return { ok: false, status: "blocked_unsupported_media", error_code: "MEDIA_FORMAT", reason: "image must be jpeg, png, or webp", image_url: imageUrl, publish: false };
  }
  if (!confirmed) {
    return { ok: false, status: "blocked_unconfirmed_media", error_code: "BUFFER_ASSET_MISSING", reason: "Buffer has not confirmed the image is attached", image_url: imageUrl, content_type: format, publish: false };
  }
  return { ok: true, status: "media_confirmed", image_url: imageUrl, content_type: format, publish: false };
}

function duplicateDecision(existing, incoming) {
  if (!existing) return { action: "create" };
  var nextPost = incoming && incoming.buffer_post_id || null;
  var nextUrl = incoming && incoming.public_url || null;
  if (existing.buffer_post_id && nextPost && existing.buffer_post_id !== nextPost) {
    return { action: "conflict", status: "duplicate_conflict", error_code: "DUPLICATE_POST" };
  }
  if (existing.public_url && nextUrl && existing.public_url !== nextUrl) {
    return { action: "conflict", status: "duplicate_conflict", error_code: "DUPLICATE_MEDIA" };
  }
  return { action: "reuse", status: existing.status, error_code: null };
}

async function readStatusRecord(env, key) {
  if (!env.ICE_PUBLIC_MEDIA || !key) return null;
  var obj = await env.ICE_PUBLIC_MEDIA.get(statusObjectKey(key));
  if (!obj) return null;
  try { return await obj.json(); } catch (e) { return null; }
}

async function writeStatusRecord(env, record) {
  if (!env.ICE_PUBLIC_MEDIA || !record || !record.idempotency_key) return;
  await env.ICE_PUBLIC_MEDIA.put(statusObjectKey(record.idempotency_key), JSON.stringify(record), {
    httpMetadata: { contentType: "application/json" }
  });
}

async function confirmPublicImage(url) {
  var last = { ok: false, status: "blocked_unconfirmed_media", reason: "stored object was not confirmed as an image" };
  for (var attempt = 1; attempt <= 3; attempt++) {
    try {
      var head = await fetch(url, { method: "HEAD" });
      var contentType = head.headers.get("content-type") || "";
      var format = mediaFormat(url, contentType);
      if (head.ok && format) return { ok: true, content_type: format, attempt: attempt };
      last = { ok: false, status: "blocked_unconfirmed_media", reason: "stored object was not confirmed as an image", http_status: head.status, content_type: contentType, attempt: attempt };
      if (!decideRetry(attempt, head.status)) break;
    } catch (e) {
      last = { ok: false, status: "blocked_unconfirmed_media", reason: "head_failed", attempt: attempt };
      if (!decideRetry(attempt, null)) break;
    }
    if (attempt < 3) await wait(250);
  }
  return last;
}

async function persistGeneratedImage(env, b64, body) {
  if (!env.ICE_PUBLIC_MEDIA) return { ok: false, status: "blocked_missing_media", reason: "ICE_PUBLIC_MEDIA binding is not configured" };
  var idem = normalizeIdempotencyKey(body && (body.idempotencyKey || body.idempotency_key));
  if (idem) {
    var existing = await readStatusRecord(env, idem);
    if (existing && existing.public_url && (existing.status === "media_stored" || existing.status === "media_confirmed" || existing.status === "ready_for_attach")) {
      return { ok: true, status: existing.status, public_url: existing.public_url, content_type: existing.content_type || "image/png", idempotent: true };
    }
  }
  var binary = atob(b64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  var key = "ice-media/generated/" + Date.now() + "-" + crypto.randomUUID() + ".png";
  var putError = null;
  for (var attempt = 1; attempt <= 3; attempt++) {
    try {
      await env.ICE_PUBLIC_MEDIA.put(key, bytes, { httpMetadata: { contentType: "image/png" } });
      putError = null;
      break;
    } catch (e) {
      putError = e;
      if (!decideRetry(attempt, null)) break;
      if (attempt < 3) await wait(250);
    }
  }
  if (putError) return { ok: false, status: "blocked_missing_media", reason: "image storage failed", error_code: "MEDIA_STORE_FAILED" };
  var base = String(env.ICE_PUBLIC_BASE || "https://pub-2cf3acbd41594638a1855b3db79b5fad.r2.dev").replace(/\/$/, "");
  var publicUrl = base + "/" + key;
  var confirmed = await confirmPublicImage(publicUrl);
  var record = {
    idempotency_key: idem,
    status: confirmed.ok ? "media_stored" : "blocked_unconfirmed_media",
    public_url: publicUrl,
    content_type: confirmed.content_type || null,
    attempts: confirmed.attempt || attempt,
    buffer_post_id: null,
    buffer_assets: 0,
    error_code: confirmed.ok ? null : "MEDIA_NOT_CONFIRMED",
    channel_id: body && body.channelId || null,
    audience: body && body.audience || null,
    updated_at: new Date().toISOString()
  };
  await writeStatusRecord(env, record);
  if (!confirmed.ok) return { ok: false, status: "blocked_unconfirmed_media", reason: confirmed.reason, http_status: confirmed.http_status || null, public_url: publicUrl };
  return { ok: true, status: "media_stored", public_url: publicUrl, content_type: confirmed.content_type };
}

async function requireVisualMedia(request, env) {
  var body = await readJson(request);
  if (!body) return json({ ok: false, status: "blocked_missing_media", error: "invalid_json", publish: false }, 400);
  if (body.channelId) {
    var channel = assessChannel(body.channelId, body.audience);
    if (!channel.ok) return json(Object.assign({ publish: false }, channel), 409);
  }
  var action = body.action === "draft" ? "draft" : "publish";
  var visual = body.visual !== false;
  var imageUrl = String(body.imageUrl || body.public_url || body.assetUrl || "").trim();
  if (!visual) return json({ ok: true, status: "text_only", action: action, publish: false }, 200);
  if (!isPublicImageUrl(imageUrl)) {
    return json({ ok: false, status: "blocked_missing_media", error_code: "MEDIA_URL_MISSING", reason: "visual post has no public image URL", action: action, publish: false }, 409);
  }
  var declared = mediaFormat(imageUrl, body.contentType);
  if (!declared) {
    return json({ ok: false, status: "blocked_unsupported_media", error_code: "MEDIA_FORMAT", reason: "image must be jpeg, png, or webp", action: action, publish: false }, 409);
  }
  var head = await confirmPublicImage(imageUrl);
  if (!head.ok) {
    return json({ ok: false, status: "blocked_unconfirmed_media", error_code: "MEDIA_NOT_CONFIRMED", reason: head.reason, attempts: head.attempt || 1, action: action, publish: false }, 409);
  }
  var verdict = assessVisualMedia(body);
  if (action === "draft" && verdict.status === "blocked_unconfirmed_media") {
    return json({ ok: true, status: "ready_for_attach", image_url: imageUrl, content_type: head.content_type, action: action, publish: false }, 200);
  }
  return json(Object.assign({ action: action, content_type: head.content_type }, verdict), verdict.ok ? 200 : 409);
}

async function mediaStatusResponse(request, env) {
  var body = await readJson(request);
  if (!body) return json({ ok: false, status: "blocked_missing_media", error: "invalid_json" }, 400);
  var idem = normalizeIdempotencyKey(body.idempotencyKey || body.idempotency_key);
  if (!idem) return json({ ok: false, status: "blocked_missing_media", error_code: "IDEMPOTENCY_KEY", error: "idempotency key must be 8 to 80 safe characters" }, 400);
  var existing = await readStatusRecord(env, idem);
  var incoming = {
    public_url: body.public_url || body.imageUrl || null,
    buffer_post_id: body.bufferPostId || body.buffer_post_id || null
  };
  var decision = duplicateDecision(existing, incoming);
  if (decision.action === "conflict") return json({ ok: false, status: decision.status, error_code: decision.error_code, idempotency_key: idem }, 409);
  if (decision.action === "reuse" && !body.bufferPostId && !body.buffer_post_id) return json({ ok: true, idempotent: true, record: existing }, 200);
  var record = {
    idempotency_key: idem,
    status: body.status || (existing && existing.status) || "ready_for_attach",
    public_url: incoming.public_url || (existing && existing.public_url) || null,
    content_type: body.contentType || body.content_type || (existing && existing.content_type) || null,
    attempts: existing && existing.attempts || 1,
    buffer_post_id: incoming.buffer_post_id || (existing && existing.buffer_post_id) || null,
    buffer_assets: Number(body.bufferAssets != null ? body.bufferAssets : body.buffer_assets || 0),
    error_code: body.error_code || null,
    channel_id: body.channelId || (existing && existing.channel_id) || null,
    audience: body.audience || (existing && existing.audience) || null,
    updated_at: new Date().toISOString()
  };
  if (record.buffer_assets > 0 && record.public_url) record.status = "media_confirmed";
  await writeStatusRecord(env, record);
  return json({ ok: true, idempotent: decision.action === "reuse", record: record }, 200);
}
