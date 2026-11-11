import assert from "node:assert/strict";
import { selectBeat } from "../js/angelina-lines.mjs";

const hello = selectBeat({ step: 0, now: 1000 }, { said: {} });
assert.equal(hello.id, "hello");
assert.match(hello.text.ru, /Добро пожаловать в PUNK ME ANGEL/);
assert.match(hello.text.ru, /Тыквоград/);

const held = selectBeat({ step: 0, now: 2000 }, { said: { hello: 1 } });
assert.equal(held, null);
const move = selectBeat({ step: 0, now: 13000 }, { said: { hello: 1 } });
assert.equal(move.id, "move");

const win = selectBeat({ step: 4, justWon: true, now: 3000 }, { said: { hello: 1, move: 1 } });
assert.equal(win.id, "duel_win");

const again = selectBeat({ step: 4, justWon: true, now: 4000 }, { said: { hello: 1, duel_win: 1 } });
assert.notEqual(again?.id, "duel_win");

const lose = selectBeat({ justLost: true, now: 5000, done: true }, { said: { hello: 1 } });
assert.equal(lose.id, "duel_lose");

const build = selectBeat({
  done: true, joined: true, location: "construction", hangoutStage: 1, now: 6000
}, { said: { hello: 1 } });
assert.equal(build.id, "build");
assert.equal(build.memoryKey, "build_1");

console.log("angelina lines ok");
