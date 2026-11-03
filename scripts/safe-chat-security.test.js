#!/usr/bin/env node
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertFirebaseId, isValidFirebaseId } from "../workers/safe-chat/src/ids.js";
import { isImpersonationName } from "../workers/safe-chat/src/impersonation.js";

test("accepts normal Firebase push ids", () => {
  assert.equal(isValidFirebaseId("-Oabc123_xyz"), true);
  assert.doesNotThrow(() => assertFirebaseId("-Oabc123_xyz"));
});

test("rejects path traversal msg ids", () => {
  for (const bad of ["../x", "..", "a/b", "a%2e%2e", "", "x".repeat(200)]) {
    assert.equal(isValidFirebaseId(bad), false);
  }
});

test("blocks impersonation display names", () => {
  assert.equal(isImpersonationName("Moderator"), true);
  assert.equal(isImpersonationName("Модератор"), true);
  assert.equal(isImpersonationName("Ангелина"), true);
  assert.equal(isImpersonationName("CoolKid"), false);
});
