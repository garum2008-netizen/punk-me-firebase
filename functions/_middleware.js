/**
 * Cloudflare Pages preview gate — HTTP Basic Auth from env (never hardcoded).
 * Set PREVIEW_USER and PREVIEW_PASS on the Pages project. If unset, deny all.
 */
export async function onRequest(context) {
  const user = context.env.PREVIEW_USER;
  const pass = context.env.PREVIEW_PASS;
  if (!user || !pass) {
    return new Response("Preview closed — authentication is not configured.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  const authHeader = context.request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Basic ")) {
    return unauthorized();
  }

  let decoded;
  try {
    decoded = atob(authHeader.slice(6));
  } catch {
    return unauthorized();
  }
  const colon = decoded.indexOf(":");
  const u = colon >= 0 ? decoded.slice(0, colon) : decoded;
  const p = colon >= 0 ? decoded.slice(colon + 1) : "";
  if (u !== user || p !== pass) {
    return unauthorized();
  }

  return context.next();
}

function unauthorized() {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="PUNK ME Preview", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
