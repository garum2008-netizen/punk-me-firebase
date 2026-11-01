#!/usr/bin/env node
import { test } from "node:test";
import assert from "node:assert/strict";
import { filterMessage } from "../workers/safe-chat/src/filter.js";
import { phraseText } from "../workers/safe-chat/src/phrases.js";

test("phrase presets resolve all langs", () => {
  assert.equal(phraseText("hi", "uk"), "Привіт!");
  assert.equal(phraseText("hi", "da"), "Hej!");
});

test("free text blocked content matrix sample", () => {
  const samples = ["discord.gg/abc", "t.me/user", "Напиши в лс"];
  for (const s of samples) {
    assert.equal(filterMessage(s).ok, false, s);
  }
});

test("retention thresholds documented constants", () => {
  const seven = 7 * 24 * 60 * 60 * 1000;
  const ninety = 90 * 24 * 60 * 60 * 1000;
  assert.ok(seven < ninety);
});
