#!/usr/bin/env node
import { test } from "node:test";
import assert from "node:assert/strict";
import { filterMessage, stripInvisible } from "../workers/safe-chat/src/filter.js";

test("zero-width characters inside profanity", () => {
  assert.equal(filterMessage(`f${"\u200B"}u${"\u200B"}c${"\u200B"}k`).ok, false);
});

test("fullwidth latin digits in leet", () => {
  assert.equal(filterMessage("sh１t").ok, false);
});

test("emoji separators between letters", () => {
  assert.equal(filterMessage("f🔥u🔥c🔥k").ok, false);
});

test("hxxp and dot-separated TLD", () => {
  assert.equal(filterMessage("open hxxps://bad.site.com").ok, false);
  assert.equal(filterMessage("evil . site . com").ok, false);
});

test("obfuscated email with [at] and dot", () => {
  assert.equal(filterMessage("mail me user [at] mail [dot] com").ok, false);
});

test("social @handle", () => {
  assert.equal(filterMessage("add @someuser123").ok, false);
});

test("PII age and school hints", () => {
  assert.equal(filterMessage("мне 14 лет").ok, false);
  assert.equal(filterMessage("which school do you go").ok, false);
});

test("stripInvisible removes BOM", () => {
  assert.equal(stripInvisible("\uFEFFhello"), "hello");
});
