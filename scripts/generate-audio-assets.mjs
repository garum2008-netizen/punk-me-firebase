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

/** Upbeat teen punk / pop-punk loops (procedural CC0, generated in-repo). */
const tracks = {
  home: { bpm: 112, base: 196, drive: 0.22 },
  street: { bpm: 148, base: 220, drive: 0.32 },
  cemetery: { bpm: 118, base: 174, drive: 0.26 },
  city: { bpm: 156, base: 233, drive: 0.34 },
  roof: { bpm: 162, base: 247, drive: 0.3 },
  construction: { bpm: 128, base: 207, drive: 0.28 },
  castle: { bpm: 108, base: 185, drive: 0.24 }
};

function makeLoop(name, cfg) {
  const dur = 24;
  const wav = path.join(musicDir, `${name}.wav`);
  const ogg = path.join(musicDir, `${name}.ogg`);
  const mp3 = path.join(musicDir, `${name}.mp3`);
  const f1 = cfg.base;
  const f2 = Math.round(cfg.base * 1.26);
  const f3 = Math.round(cfg.base * 1.59);
  const f4 = Math.round(cfg.base * 2);
  const beat = cfg.bpm / 60;
  run(
    `ffmpeg -y -hide_banner -loglevel error ` +
      `-f lavfi -i "sine=frequency=${f1}:duration=${dur}" ` +
      `-f lavfi -i "sine=frequency=${f2}:duration=${dur}" ` +
      `-f lavfi -i "sine=frequency=${f3}:duration=${dur}" ` +
      `-f lavfi -i "sine=frequency=${f4}:duration=${dur}" ` +
      `-f lavfi -i "anoisesrc=d=${dur}:c=white:a=${cfg.drive}" ` +
      `-filter_complex "` +
      `[0:a]volume=0.14[a0];[1:a]volume=0.1[a1];[2:a]volume=0.08[a2];[3:a]volume=0.06[a3];` +
      `[4:a]highpass=f=1800,lowpass=f=6200,volume=0.12,` +
      `asetpts=PTS-STARTPTS,` +
      `volume=enable='lt(mod(t*${beat},1),0.12)':volume=1.0[a4];` +
      `[a0][a1][a2][a3][a4]amix=inputs=5:duration=first,` +
      `acompressor=threshold=-18dB:ratio=3:attack=8:release=120,` +
      `equalizer=f=140:width_type=o:width=2:g=3,` +
      `tremolo=f=${beat * 2}:d=0.18,` +
      `highpass=f=90,lowpass=f=9000,` +
      `afade=t=in:st=0:d=1.2,afade=t=out:st=${dur - 1.2}:d=1.2,` +
      `volume=0.72` +
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
