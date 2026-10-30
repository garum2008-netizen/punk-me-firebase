#!/usr/bin/env node
/**
 * Download CC0 / CC-BY location BGM (real recordings, not procedural).
 * Run: node scripts/download-licensed-music.mjs
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const musicDir = path.join(root, "assets/audio/music");
const metaPath = path.join(root, "assets/audio/music-sources.json");

const OGA = "https://opengameart.org/sites/default/files";

/** @type {{ bucket: string, file: string, title: string, author: string, license: string, page: string }[]} */
const TRACKS = [
  {
    bucket: "home",
    file: "fastsong.ogg",
    title: "Fast Song",
    author: "Bart",
    license: "CC0",
    page: "https://opengameart.org/content/fastsong"
  },
  {
    bucket: "street",
    file: "07_-_downtown_destruction.ogg",
    title: "Downtown Destruction",
    author: "Matthew Steele",
    license: "CC-BY 3.0",
    page: "https://opengameart.org/content/rock-music-pack"
  },
  {
    bucket: "cemetery",
    file: "03_-_hammer_of_the_berserker.ogg",
    title: "Hammer of the Berserker",
    author: "Matthew Steele",
    license: "CC-BY 3.0",
    page: "https://opengameart.org/content/rock-music-pack"
  },
  {
    bucket: "city",
    file: "05_-_plutonian_thrash.ogg",
    title: "Plutonian Thrash",
    author: "Matthew Steele",
    license: "CC-BY 3.0",
    page: "https://opengameart.org/content/rock-music-pack"
  },
  {
    bucket: "roof",
    file: "09_-_chick_with_weapon.ogg",
    title: "Chick with Weapon",
    author: "Matthew Steele",
    license: "CC-BY 3.0",
    page: "https://opengameart.org/content/rock-music-pack"
  },
  {
    bucket: "construction",
    file: "06_-_last_spike.ogg",
    title: "Last Spike",
    author: "Matthew Steele",
    license: "CC-BY 3.0",
    page: "https://opengameart.org/content/rock-music-pack"
  },
  {
    bucket: "castle",
    file: "headbangr.ogg",
    title: "Headbangr",
    author: "Bart",
    license: "CC0",
    page: "https://opengameart.org/content/headbangr"
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, res => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          file.close();
          fs.unlinkSync(dest);
          return download(res.headers.location, dest).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
      })
      .on("error", reject);
  });
}

function hasFfmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function trimLoop(src, destOgg, destMp3, seconds = 75) {
  const af = `afade=t=in:st=0:d=2,afade=t=out:st=${seconds - 3}:d=3`;
  execSync(
    `ffmpeg -y -i "${src}" -t ${seconds} -af "${af}" -c:a libvorbis -q:a 6 "${destOgg}"`,
    { stdio: "inherit" }
  );
  execSync(`ffmpeg -y -i "${destOgg}" -c:a libmp3lame -q:a 4 "${destMp3}"`, { stdio: "inherit" });
}

async function main() {
  if (!hasFfmpeg()) {
    console.error("ffmpeg required");
    process.exit(1);
  }
  fs.mkdirSync(musicDir, { recursive: true });
  const tmp = path.join(musicDir, "_dl");
  fs.mkdirSync(tmp, { recursive: true });
  const manifest = { generatedAt: new Date().toISOString(), tracks: [] };

  for (const t of TRACKS) {
    const srcUrl = `${OGA}/${t.file}`;
    const raw = path.join(tmp, t.file);
    console.log("Downloading", t.bucket, srcUrl);
    await download(srcUrl, raw);
    const ogg = path.join(musicDir, `music_${t.bucket}.ogg`);
    const mp3 = path.join(musicDir, `music_${t.bucket}.mp3`);
    trimLoop(raw, ogg, mp3);
    manifest.tracks.push({
      bucket: t.bucket,
      files: [`music_${t.bucket}.ogg`, `music_${t.bucket}.mp3`],
      title: t.title,
      author: t.author,
      license: t.license,
      sourceUrl: t.page,
      ogaFile: t.file
    });
  }

  fs.writeFileSync(metaPath, JSON.stringify(manifest, null, 2));
  console.log("Wrote", metaPath);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
