/** Block production Firebase hosts in Playwright (hostname match, not substring). */
const PROD_HOST_SUFFIXES = [".firebaseio.com", ".firebasedatabase.app", ".firebaseapp.com"];
const PROD_HOST_EXACT = new Set([
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "firebaseinstallations.googleapis.com"
]);

function hostnameFromUrl(urlStr) {
  try {
    return new URL(urlStr).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isProdFirebaseHostname(host) {
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
  if (PROD_HOST_EXACT.has(host)) return true;
  return PROD_HOST_SUFFIXES.some(sfx => host === sfx.slice(1) || host.endsWith(sfx));
}

function isProdFirebaseRequest(urlStr) {
  return isProdFirebaseHostname(hostnameFromUrl(urlStr));
}

module.exports = { isProdFirebaseRequest, isProdFirebaseHostname, hostnameFromUrl };
