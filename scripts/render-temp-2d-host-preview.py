#!/usr/bin/env python3
"""
TEMP2DHOSTPREVIEW — local prototype 2D idle animation from shipped Angelina portraits.
NOT gameplay, not final voice, not shipped assets. Procedural blink/mouth on single-layer art.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
STORE = Path(os.environ.get("TEMP2D_HOST_PREVIEW_STORE", "/cursor/stores/self/t196-2d-host-preview"))
SHIPPED = ROOT / "assets/ui/angelina-skins/shipped"
LABEL_TOP = "TEMP2DHOSTPREVIEW — NOT GAMEPLAY — NOT FINAL VOICE"
FPS = 24
DURATION_S = 8.0

SKINS = [
    ("A", "angelina-teen-A-portrait.webp"),
    ("B", "angelina-teen-B-portrait.webp"),
    ("C-v2", "angelina-teen-C-v2-portrait.webp"),
]

# Portrait-space ROI (normalized); no separate eye/mouth assets — heuristic only.
EYE_Y = (0.10, 0.24)
EYE_X = (0.22, 0.78)
MOUTH_C = (0.50, 0.56)
MOUTH_R = (0.055, 0.035)


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    h.update(p.read_bytes())
    return h.hexdigest()


def git_head() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    except Exception:
        return "unknown"


def load_rgba(name: str) -> tuple[Image.Image, dict]:
    path = SHIPPED / name
    if not path.is_file():
        raise SystemExit(f"missing shipped asset: {path}")
    im = Image.open(path).convert("RGBA")
    return im, {"path": str(path), "sha256": sha256_file(path), "size": im.size}


def breathe_scale(t: float, period: float = 2.6) -> float:
    phase = (t % period) / period
    return 1.0 + 0.018 * np.sin(phase * 2 * np.pi)


def blink_amount(t: float, period: float = 4.2, close_dur: float = 0.12) -> float:
    """0 open, 1 closed."""
    phase = (t % period) / period
    if phase < 1.0 - close_dur / period:
        return 0.0
    x = (phase - (1.0 - close_dur / period)) / (close_dur / period)
    if x < 0.5:
        return x * 2
    return (1 - x) * 2


def mouth_shape(t: float, emotion: str) -> tuple[float, float, float]:
    """width_mul, height_mul, smile_curve -1..1."""
    cycle = (t * 2.3) % 1.0
    if emotion == "neutral":
        w, h = 1.0, 0.85 + 0.15 * np.sin(cycle * 2 * np.pi)
        return w, h, 0.0
    if emotion == "smile":
        return 1.08, 0.55, 0.65
    if emotion == "attentive":
        w = 0.92 + 0.08 * np.sin(cycle * 2 * np.pi)
        return w, 1.15, -0.15
    return 1.0, 1.0, 0.0


def emotion_at_time(t: float) -> str:
    if t < 2.4:
        return "neutral"
    if t < 4.8:
        return "smile"
    if t < 7.2:
        return "attentive"
    return "neutral"


def skin_at_time(t: float) -> int:
    if t < 2.66:
        return 0
    if t < 5.33:
        return 1
    return 2


def draw_blink_overlay(base: Image.Image, amount: float) -> Image.Image:
    if amount <= 0.01:
        return base
    out = base.copy()
    w, h = out.size
    draw = ImageDraw.Draw(out, "RGBA")
    y0, y1 = int(h * EYE_Y[0]), int(h * EYE_Y[1])
    x0, x1 = int(w * EYE_X[0]), int(w * EYE_X[1])
    lid_h = max(2, int((y1 - y0) * amount * 0.95))
    alpha = int(200 * min(1.0, amount))
    draw.rectangle([x0, y0, x1, y0 + lid_h], fill=(24, 18, 28, alpha))
    return out


def draw_mouth_overlay(base: Image.Image, mw: float, mh: float, smile: float) -> Image.Image:
    out = base.copy()
    w, h = out.size
    draw = ImageDraw.Draw(out, "RGBA")
    cx, cy = int(w * MOUTH_C[0]), int(h * MOUTH_C[1])
    rw, rh = int(w * MOUTH_R[0] * mw), int(h * MOUTH_R[1] * mh)
    if smile > 0.3:
        box = [cx - rw, cy - rh // 2, cx + rw, cy + rh]
        draw.arc(box, 200, 340, fill=(120, 70, 85, 45), width=max(2, rw // 8))
    elif smile < -0.1:
        draw.ellipse([cx - rw, cy - rh, cx + rw, cy + rh // 2], fill=(95, 60, 72, 55))
    else:
        draw.ellipse([cx - rw, cy - rh // 2, cx + rw, cy + rh], fill=(100, 65, 78, 40))
    return out


def composite_frame(
    portrait: Image.Image,
    canvas_w: int,
    canvas_h: int,
    t: float,
    skin_label: str,
    emotion: str,
    safe_bottom: int,
) -> Image.Image:
    scale = breathe_scale(t)
    pw, ph = portrait.size
    target_h = int(canvas_h * 0.72)
    target_w = int(pw * target_h / ph)
    if target_w > canvas_w * 0.55:
        target_w = int(canvas_w * 0.55)
        target_h = int(ph * target_w / pw)
    sw, sh = int(target_w * scale), int(target_h * scale)
    img = portrait.resize((sw, sh), Image.Resampling.LANCZOS)
    blink = blink_amount(t)
    img = draw_blink_overlay(img, blink)
    mw, mh, sm = mouth_shape(t, emotion)
    img = draw_mouth_overlay(img, mw, mh, sm)
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (18, 16, 24, 255))
    x = (canvas_w - sw) // 2
    y = canvas_h - safe_bottom - sh + int(8 * np.sin(t * 0.9))
    canvas.paste(img, (x, y), img)
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
        font_s = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    except OSError:
        font = ImageFont.load_default()
        font_s = font
    draw.rectangle([0, 0, canvas_w, 44], fill=(12, 10, 18, 220))
    draw.text((16, 10), LABEL_TOP, fill=(255, 210, 120), font=font_s)
    draw.text((16, canvas_h - safe_bottom + 12), f"Skin {skin_label} · {emotion}", fill=(200, 200, 210), font=font)
    draw.text(
        (16, canvas_h - safe_bottom + 40),
        "Procedural blink/mouth on approved portrait (no rig layers)",
        fill=(140, 140, 155),
        font=font_s,
    )
    return canvas


def render_sequence(out_dir: Path, canvas_w: int, canvas_h: int, aspect: str, safe_bottom: int) -> Path:
    skins = [load_rgba(fn) for _, fn in SKINS]
    frames_dir = out_dir / f"frames_{aspect}"
    frames_dir.mkdir(parents=True, exist_ok=True)
    n_frames = int(DURATION_S * FPS)
    for i in range(n_frames):
        t = i / FPS
        si = skin_at_time(t)
        portrait, _ = skins[si]
        label = SKINS[si][0]
        emotion = emotion_at_time(t)
        frame = composite_frame(portrait, canvas_w, canvas_h, t, label, emotion, safe_bottom)
        frame.convert("RGB").save(frames_dir / f"frame_{i:05d}.png")
    mp4 = out_dir / f"temp2d-host-preview-{aspect}.mp4"
    cmd = [
        "ffmpeg",
        "-y",
        "-framerate",
        str(FPS),
        "-i",
        str(frames_dir / "frame_%05d.png"),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(mp4),
    ]
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return mp4


def ffprobe_meta(path: Path) -> dict:
    raw = subprocess.check_output(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        text=True,
    )
    return json.loads(raw)


def decode_qa(path: Path) -> dict:
    r = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    return {"decodeExit": r.returncode, "stderr": (r.stderr or "").strip()[:500]}


def main() -> None:
    if os.environ.get("FIREBASE_EMULATOR") not in ("1", "true"):
        print("WARN: set FIREBASE_EMULATOR=1 for policy compliance", file=sys.stderr)
    STORE.mkdir(parents=True, exist_ok=True)
    provenance = {
        "label": "TEMP2DHOSTPREVIEW",
        "notGameplay": True,
        "notFinalVoice": True,
        "pipelineGitSha": git_head(),
        "script": str(ROOT / "scripts/render-temp-2d-host-preview.py"),
        "scriptSha256": sha256_file(ROOT / "scripts/render-temp-2d-host-preview.py"),
        "durationSec": DURATION_S,
        "fps": FPS,
        "limitations": (
            "Single-layer shipped portrait WebPs only; blink/mouth/expressions are procedural "
            "overlays at estimated ROIs — not anatomically rigged. No TTS; silent MP4."
        ),
        "skins": [],
    }
    for sid, fn in SKINS:
        p = SHIPPED / fn
        provenance["skins"].append({"id": sid, "file": fn, "sha256": sha256_file(p)})
    mp4_16 = render_sequence(STORE, 1280, 720, "16x9", safe_bottom=88)
    mp4_9 = render_sequence(STORE, 720, 1280, "9x16", safe_bottom=120)
    acceptance = {
        "verdict": "READY_FOR_OWNER_BUFFER_REVIEW",
        "automatedQa": {
            "16x9": {"path": str(mp4_16), "ffprobe": ffprobe_meta(mp4_16), "decode": decode_qa(mp4_16)},
            "9x16": {"path": str(mp4_9), "ffprobe": ffprobe_meta(mp4_9), "decode": decode_qa(mp4_9)},
        },
        "provenance": provenance,
        "firebaseEmulatorPolicy": os.environ.get("FIREBASE_EMULATOR", "unset"),
    }
    for k in ("16x9", "9x16"):
        st = acceptance["automatedQa"][k]
        st["sha256"] = sha256_file(Path(st["path"]))
        dur = float(st["ffprobe"].get("format", {}).get("duration", 0))
        st["durationSec"] = dur
        st["decodePass"] = st["decode"]["decodeExit"] == 0 and 5 <= dur <= 11
    acceptance["decodePass"] = all(acceptance["automatedQa"][k]["decodePass"] for k in ("16x9", "9x16"))
    (STORE / "provenance.json").write_text(json.dumps(provenance, indent=2), encoding="utf-8")
    (STORE / "acceptance.json").write_text(json.dumps(acceptance, indent=2), encoding="utf-8")
    readme = f"""# TEMP 2D Host Preview (t196)

{LABEL_TOP}

- **8s** @ 24fps — blink, mouth shapes, 3 gentle emotions (neutral → smile → attentive) on skins **A → B → C-v2**
- Assets: shipped portrait WebPs only (hashes in `provenance.json`)
- **Silent** — placeholder audio not included

## Files
- `temp2d-host-preview-16x9.mp4`
- `temp2d-host-preview-9x16.mp4`
- `acceptance.json` — ffprobe + decode QA

Not merged, not shipped, not public host.
"""
    (STORE / "README.md").write_text(readme, encoding="utf-8")
    print(json.dumps({"store": str(STORE), "acceptance": acceptance}, indent=2))


if __name__ == "__main__":
    main()
