#!/usr/bin/env node
/**
 * Procedural CC0 audio for PUNK ME (generated in-repo, no external assets).
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const musicDir = path.join(root, "assets/audio/music");
const sfxDir = path.join(root, "assets/audio/sfx");
fs.mkdirSync(musicDir, { recursive: true });
fs.mkdirSync(sfxDir, { recursive: true });

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

const tracks = {
  home: { bpm: 92, base: 82, mood: "warm" },
  street: { bpm: 118, base: 98, mood: "grit" },
  cemetery: { bpm: 76, base: 65, mood: "spooky" },
  city: { bpm: 128, base: 110, mood: "neon" },
  roof: { bpm: 132, base: 120, mood: "wind" },
  construction: { bpm: 105, base: 90, mood: "metal" },
  castle: { bpm: 88, base: 72, mood: "gothic" }
};

function makeLoop(name, cfg) {
  const dur = 24;
  const wav = path.join(musicDir, `${name}.wav`);
  const ogg = path.join(musicDir, `${name}.ogg`);
  const mp3 = path.join(musicDir, `${name}.mp3`);
  const f1 = cfg.base;
  const f2 = Math.round(cfg.base * 1.5);
  const f3 = Math.round(cfg.base * 2);
  run(
    `ffmpeg -y -hide_banner -loglevel error -f lavfi -i "sine=frequency=${f1}:duration=${dur}" ` +
      `-f lavfi -i "sine=frequency=${f2}:duration=${dur}" ` +
      `-f lavfi -i "sine=frequency=${f3}:duration=${dur}" ` +
      `-f lavfi -i "anoisesrc=d=${dur}:c=pink:a=0.08" ` +
      `-filter_complex "` +
      `[0:a]volume=0.12[a0];[1:a]volume=0.07[a1];[2:a]volume=0.05[a2];[3:a]lowpass=f=800,volume=0.04[a3];` +
      `[a0][a1][a2][a3]amix=inputs=4:duration=first,` +
      `aecho=0.8:0.88:40:0.25,` +
      `tremolo=f=${cfg.bpm / 60}:d=0.35,` +
      `lowpass=f=4200,highpass=f=55,` +
      `afade=t=in:st=0:d=1.5,afade=t=out:st=${dur - 1.5}:d=1.5,` +
      `volume=0.55` +
      `" -ar 44100 -ac 2 "${wav}"`
  );
  run(`ffmpeg -y -hide_banner -loglevel error -i "${wav}" -c:a libvorbis -q:a 4 "${ogg}"`);
  run(`ffmpeg -y -hide_banner -loglevel error -i "${wav}" -c:a libmp3lame -b:a 96k "${mp3}"`);
  fs.unlinkSync(wav);
  const mb = fs.statSync(ogg).size / (1024 * 1024);
  if (mb > 1.5) console.warn(`WARN ${name}.ogg is ${mb.toFixed(2)} MB`);
}

for (const [name, cfg] of Object.entries(tracks)) makeLoop(`music_${name}`, cfg);

function makeSfx(name, filter) {
  const wav = path.join(sfxDir, `${name}.wav`);
  const ogg = path.join(sfxDir, `${name}.ogg`);
  const mp3 = path.join(sfxDir, `${name}.mp3`);
  run(
    `ffmpeg -y -hide_banner -loglevel error -f lavfi -i "${filter}" -ac 1 -ar 44100 ` +
      `-af "afade=t=in:st=0:d=0.01,afade=t=out:st=0.2:d=0.08,volume=0.9" "${wav}"`
  );
  run(`ffmpeg -y -hide_banner -loglevel error -i "${wav}" -c:a libvorbis -q:a 6 "${ogg}"`);
  run(`ffmpeg -y -hide_banner -loglevel error -i "${wav}" -c:a libmp3lame -b:a 64k "${mp3}"`);
  fs.unlinkSync(wav);
}

makeSfx("interact", "sine=frequency=880:duration=0.12");
makeSfx("quest_received", "sine=frequency=523:duration=0.18");
makeSfx("quest_complete", "sine=frequency=659:duration=0.22");
makeSfx("reward_coins", "sine=frequency=1046:duration=0.15");
makeSfx("error", "sine=frequency=180:duration=0.28");
makeSfx("ui_click", "sine=frequency=1200:duration=0.06");
makeSfx("footstep", "anoisesrc=d=0.08:c=brown:a=0.35");

console.log("Audio assets generated.");
