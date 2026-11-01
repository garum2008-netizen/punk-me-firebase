import { rtdbPath, rtdbRequest } from "./rtdb.js";

export function pathClientChatMessage(msgId) {
  return rtdbPath("chat", "clientMessages", msgId);
}

export function publicFieldsFromCanonical(canonical) {
  if (!canonical || typeof canonical !== "object") return null;
  const out = {
    sid: canonical.sid,
    name: canonical.name,
    text: canonical.text,
    time: canonical.time,
    phraseId: canonical.phraseId ?? null
  };
  if (canonical.loc) out.loc = canonical.loc;
  if (canonical.hidden === true) out.hidden = true;
  if (canonical.textRedacted === true) {
    out.textRedacted = true;
    delete out.text;
  }
  return out;
}

export async function upsertClientMessageMirror(config, token, emu, ns, msgId, fields) {
  const payload = publicFieldsFromCanonical(fields);
  if (!payload?.sid) return;
  await rtdbRequest(config, pathClientChatMessage(msgId), "PUT", payload, token, emu, ns);
}

export async function deleteClientMessageMirror(config, token, emu, ns, msgId) {
  await rtdbRequest(config, pathClientChatMessage(msgId), "DELETE", null, token, emu, ns);
}
