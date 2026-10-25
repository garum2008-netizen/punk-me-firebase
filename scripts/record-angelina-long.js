#!/usr/bin/env node
/**
 * Long Angelina host episode (15–30 min), qa/content/00-angelina-long/
 * Usage: node scripts/record-angelina-long.js
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { chromium } = require("playwright");
const { start, stop } = require("./local-static-server");
const H = require("./playthrough-ui-helpers");
const Angelina = require("./content-angelina-long-flow");
const audioIngest = require("./content-audio-ingest");
const { finalizeClipDir } = require("./finalize-content-clip");

async function injectMultiAudioBridge(context, port) {
  await context.addInitScript(p => {
    const base = `http://127.0.0.1:${p}/segment`;
    window.__contentAudioEndpoint = base;
    window.__contentCaptureActive = false;
    const recorders = { mix: null, music: null, sfx: null, voice: null };
    window.__contentStartAudioCapture = async function () {
      await window.AudioManager?.unlockAudio?.();
      window.AudioManager?.setLocationMusic?.(window.me?.location || "room");
      window.AudioManager?.setChannelVolume?.("music", 0.82);
      window.AudioManager?.setChannelVolume?.("sfx", 0.88);
      window.AudioManager?.setChannelVolume?.("speech", 0.9);
      const streams = window.AudioManager?.installCaptureTaps?.() || window.AudioManager?.installCaptureTap?.();
      const map = streams && streams.mix ? streams : { mix: streams, music: streams, sfx: streams };
      if (!map.mix) return { ok: false };
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      for (const track of ["mix", "music", "sfx", "voice"]) {
        const stream = map[track] || map.mix;
        try {
          recorders[track]?.stop?.();
        } catch (e) {}
        const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 160000 });
        const blobs = [];
        rec.ondataavailable = e => {
          if (e.data?.size) blobs.push(e.data);
        };
        rec.onstop = async () => {
          const body = new Blob(blobs, { type: mime });
          if (body.size > 256) {
            await fetch(`${base}/${track}`, { method: "POST", body, mode: "cors" }).catch(() => {});
          }
        };
        rec.start(400);
        recorders[track] = rec;
      }
      window.__contentCaptureActive = true;
      return { ok: true };
    };
    window.__contentStopAudioCapture = async function () {
      window.__contentCaptureActive = false;
      for (const track of ["mix", "music", "sfx", "voice"]) {
        const rec = recorders[track];
        if (!rec || rec.state === "inactive") continue;
        await new Promise(resolve => {
          rec.onstop = () => resolve();
          try {
            if (rec.state === "recording") rec.requestData();
            rec.stop();
          } catch (e) {
            resolve();
          }
        });
        recorders[track] = null;
      }
    };
  }, port);
}

const OUT = path.join(__dirname, "../qa/content/00-angelina-long");
const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const shootDate = new Date().toISOString().slice(0, 10);

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const r = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function writeDocs(marks, trimSec, duration, flowMeta) {
  const lines = [
    "# TIMECODES — Angelina long episode",
    "",
    `**Commit:** \`${commit}\``,
    `**Date:** ${shootDate}`,
    `**File:** \`gameplay-1080p-mix.mp4\` (fallback: \`gameplay-1080p-silent.mp4\`)`,
    `**Duration:** ~${fmt(duration)}`,
    "",
    "**PiP ведущей (Ангелина):** нижний **правый** угол кадра 1920×1080 — ~420×280 px; держите там минимум важного HUD (док в `CONTROLS.md`).",
    "",
    "| Time | Event | Notes |",
    "| --- | --- | --- |"
  ];
  for (const m of marks) {
    const sec = Math.max(0, m.sec - trimSec);
    lines.push(`| ${fmt(sec)} | ${m.label} | ${m.extra || ""} |`);
  }
  fs.writeFileSync(path.join(OUT, "TIMECODES.md"), lines.join("\n") + "\n");

  const controls = `# CONTROLS — проверено в этой записи

**Commit:** \`${commit}\` · **Дата:** ${shootDate}

## ПК (desktop 1920×1080)

| Действие | Клавиша / UI |
| --- | --- |
| Движение | \`W\` \`A\` \`S\` \`D\` (удержание) |
| Взаимодействие | \`E\` |
| Разговор / диалог | \`E\` или кнопка **Talk** на HUD |
| Карта / телепорт | кнопка **Карта** → выбор локации |
| Банда / NPC | **Банда** → строка NPC |
| Цепная дуэль | **Драка** / диалог → Chain fight |
| Удары в 3D-дуэли | кнопка **Attack** (красная) на \`#duel3dHud\` |
| Работы | **Работа** → выбор смены |
| Декор | **Декор** (в комнате / на локации) → \`]\` каталог, \`R\` поворот, \`C\` цвет, клик по полу |
| Меню / журнал | \`#btnGameMenu\` (пауза) |

## Мобильный (не снималось в этом ролике; проверено в клипе 04)

| Действие | Элемент |
| --- | --- |
| Движение | \`#touchJoystick\` |
| Talk | \`#touchTalk\` |
| Interact | \`#touchInteract\` |

## Кадр для PiP ведущей

- **Зона ведущей:** нижний **правый** угол (рекомендуемое окно ~420×280 px).
- В записи скрыты: версия (\`#gameVersion\`), dev/account/lang кнопки (\`html.episode-capture\`).
- Нижний центр занят игровым доком (монеты, навигация) — **не** использовать под PiP.
`;

  fs.writeFileSync(path.join(OUT, "CONTROLS.md"), controls);

  const bugs = `# KNOWN_BUGS — контекст записи

**Commit:** \`${commit}\`

| ID | Область | Статус в записи |
| --- | --- | --- |
| RTDB-presence | \`permission_denied\` на \`/presence/room/{uid}\` на проде | Не блокирует соло-съёмку; онлайн-счётчик может молчать |
| RTDB-publicProfiles | deny на запись профиля на проде | Вне кадра для Angelina long |
| Cemetery-fail | Слабая попытка dig обрывается через \`endAllActivities\` | Ожидаемо без награды |
| Duel-defeat | Экран «Поражение… отдыхай / Попробуй снова» | Показан намеренно (1-й раунд) |
| Audio-capture | Playwright MediaRecorder | См. \`music.wav\` / \`sfx.wav\`; голос NPC — только в mix при наличии |

${flowMeta?.notes || ""}
`;
  fs.writeFileSync(path.join(OUT, "KNOWN_BUGS.md"), bugs);
  fs.writeFileSync(path.join(OUT, "COMMIT.txt"), commit + "\n");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const marks = [];
  let t0 = 0;
  let lastMarkSec = -1;
  const mark = (label, extra = "") => {
    let sec = (Date.now() - t0) / 1000;
    if (sec <= lastMarkSec) sec = lastMarkSec + 0.25;
    lastMarkSec = sec;
    marks.push({ sec, label, extra });
    console.log(`[angelina] ${fmt(sec)} ${label} ${extra}`);
  };

  const base = process.env.PUNK_BASE || (await start());
  audioIngest.stop();
  const audioPort = await audioIngest.start(OUT);
  const rawDir = path.join(OUT, "capture-raw");
  fs.mkdirSync(rawDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } },
    locale: "ru-RU"
  });
  await context.addInitScript(() => {
    document.documentElement.classList.add("episode-capture", "angelina-host-safe");
    try {
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (e) {}
  });

  await injectMultiAudioBridge(context, audioPort);

  const page = await context.newPage();
  t0 = Date.now();
  mark("boot", "load solo");
  await H.bootSolo(page, base, "angelina-long", { episodeCapture: true });
  await H.pickCobaltUi(page);
  await page.evaluate(() => {
    document.getElementById("chapterIntro")?.classList.remove("active");
  });
  mark("char_select", "Cobalt");
  const audioMeta = await page.evaluate(() => window.__contentStartAudioCapture());
  if (!audioMeta?.ok) console.warn("audio capture failed", audioMeta);
  try {
    await Angelina.runAngelinaLong(page, mark);
  } catch (e) {
    mark("flow_error", String(e.message || e));
    console.error(e);
  }
  mark("capture_end", "stop");

  await page.evaluate(() => window.__contentStopAudioCapture?.());
  await H.sleep(22000);
  audioIngest.finalizeConcat();
  audioIngest.stop();
  await context.close();
  await browser.close();
  if (!process.env.PUNK_BASE) stop();

  const trimMark = marks.find(m => m.label === "char_select");
  const trimSec = trimMark ? Math.max(0, trimMark.sec - 0.2) : 0;
  let duration = 0;
  try {
    const fin = finalizeClipDir(OUT, { trimSec, basename: "gameplay-1080p" });
    duration = fin.duration;
    const mix = path.join(OUT, "gameplay-1080p-mix.mp4");
    const main = path.join(OUT, "angelina-long-1080p.mp4");
    if (fs.existsSync(mix)) fs.copyFileSync(mix, main);
  } catch (e) {
    console.error("finalize", e.message);
  }

  writeDocs(marks, trimSec, duration, { notes: "" });
  console.log("Done", OUT, "duration", duration);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
