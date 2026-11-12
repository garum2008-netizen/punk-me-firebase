/**
 * Cloudflare Pages preview gate. Credentials come from the project env, never from the repo.
 * Unset credentials deny everyone. Wrong credentials get 401.
 */
export async function onRequest(context) {
  const user = context.env.PREVIEW_USER;
  const pass = context.env.PREVIEW_PASS;
  if (!user || !pass) {
    return withNoindex(
      new Response("Preview closed — authentication is not configured.", {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
      })
    );
  }

  const authHeader = context.request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Basic ")) return unauthorized();

  let decoded;
  try {
    decoded = atob(authHeader.slice(6));
  } catch {
    return unauthorized();
  }
  const colon = decoded.indexOf(":");
  const u = colon >= 0 ? decoded.slice(0, colon) : decoded;
  const p = colon >= 0 ? decoded.slice(colon + 1) : "";
  if (u !== user || p !== pass) return unauthorized();

  return withNoindex(await context.next());
}

function unauthorized() {
  return withNoindex(
    new Response("Authentication required.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="PUNK ME Preview", charset="UTF-8"',
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      }
    })
  );
}

function withNoindex(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
