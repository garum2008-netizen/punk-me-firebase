const CURSOR_AGENTS_URL = 'https://api.cursor.com/v1/agents';

function stripRoutingMeta(payload) {
  const { _routing, apiVersion, ...body } = payload;
  return body;
}

export async function dispatchMission(payload, { execute = false, apiKey } = {}) {
  const body = stripRoutingMeta(payload);
  if (!execute) {
    return {
      mode: 'dry-run',
      endpoint: CURSOR_AGENTS_URL,
      body,
      routing: payload._routing,
    };
  }
  const key = apiKey || process.env.CURSOR_USER_API_KEY || process.env.CURSOR_API_KEY;
  if (!key) {
    const err = new Error(
      'CURSOR_USER_API_KEY (or CURSOR_API_KEY) is required to dispatch. Set it in the environment or Cursor app secrets; never paste keys into chat.',
    );
    err.code = 'MISSING_API_KEY';
    throw err;
  }
  const auth = Buffer.from(`${key}:`).toString('base64');
  const res = await fetch(CURSOR_AGENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`Create agent failed (${res.status}): ${text.slice(0, 500)}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return { mode: 'executed', status: res.status, data, routing: payload._routing };
}

export async function verifyAgentRun(agentId, { apiKey } = {}) {
  const key = apiKey || process.env.CURSOR_USER_API_KEY || process.env.CURSOR_API_KEY;
  if (!key) {
    throw new Error('CURSOR_USER_API_KEY required for verify');
  }
  const auth = Buffer.from(`${key}:`).toString('base64');
  const url = `${CURSOR_AGENTS_URL}/${agentId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await res.json();
  return { status: res.status, data };
}
