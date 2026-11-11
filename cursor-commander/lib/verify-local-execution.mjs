import { accessSync, constants } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

function expandHome(p) {
  if (p.startsWith('~/')) {
    return resolve(homedir(), p.slice(2));
  }
  return p;
}

export function verifyLocalExecution(preflight = {}) {
  const os = process.platform;
  const errors = [];
  const checks = {};

  if (preflight.requireDarwin && os !== 'darwin') {
    errors.push(`WRONG_EXECUTION_TARGET: expected darwin, got ${os}`);
  }
  checks.platform = os;

  for (const raw of preflight.paths || []) {
    const path = expandHome(raw);
    let ok = false;
    try {
      accessSync(path, constants.F_OK);
      ok = true;
    } catch {
      ok = false;
    }
    checks[path] = ok;
    if (!ok) {
      errors.push(`Missing required path: ${path}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    checks,
  };
}
