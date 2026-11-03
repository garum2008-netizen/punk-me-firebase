#!/usr/bin/env node
/**
 * Unit tests for safe-chat text filter (no network).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { filterMessage, normalizeForModeration, normalizeAsciiProfanity } from "../workers/safe-chat/src/filter.js";

test("rejects empty", () => {
  assert.equal(filterMessage("").ok, false);
});

test("rejects profanity with homoglyphs and spaces", () => {
  assert.equal(filterMessage("f u c k").ok, false);
  assert.equal(filterMessage("sh1t").ok, false);
  assert.equal(filterMessage("х у й").ok, false);
  assert.equal(filterMessage("f.u.c.k").ok, false);
});

test("rejects UK profanity stems", () => {
  assert.equal(filterMessage("піздець").ok, false);
});

test("rejects DA insults", () => {
  assert.equal(filterMessage("din kælling").ok, false);
});

test("rejects links obfuscated", () => {
  assert.equal(filterMessage("visit evil.com now").ok, false);
  assert.equal(filterMessage("hxxp://bad.site").ok, false);
  assert.equal(filterMessage("foo . bar . com").ok, false);
});

test("rejects phone and email", () => {
  assert.equal(filterMessage("call +45 12 34 56 78").ok, false);
  assert.equal(filterMessage("+380501234567").ok, false);
  assert.equal(filterMessage("me@example.com").ok, false);
});

test("rejects telegram solicitation", () => {
  assert.equal(filterMessage("пиши в телеграм").ok, false);
  assert.equal(filterMessage("Напиши в лс").ok, false);
});

test("allows clean short phrase", () => {
  const r = filterMessage("Пойдём на кладбище!");
  assert.equal(r.ok, true);
});

test("rejects over 200 chars", () => {
  assert.equal(filterMessage("a".repeat(201)).ok, false);
});

test("normalize leetspeak", () => {
  assert.ok(normalizeAsciiProfanity("sh1t").includes("shit"));
});
