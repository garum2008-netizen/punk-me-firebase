"""Flat ICE cards. Graphite, silver, and milk. No people and no symbols."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

GRAPHITE = (43, 45, 48)
MILK = (244, 241, 234)
SILVER = (196, 198, 196)
WIDTH = 1080
HEIGHT = 1350
REGULAR = "/usr/share/fonts/truetype/macos/Inter-Regular.ttf"
BOLD = "/usr/share/fonts/truetype/macos/Inter-Bold.ttf"

CARDS = (
    ("wk16-fca-incoterms", "Who bears the risk after handover?"),
    ("wk16-comedy-unlimited-liability", "Three pages. Unlimited liability."),
    ("wk16-saas-integration", "The integration that never arrived."),
    ("wk16-comedy-nda", "An NDA without a definition."),
    ("wk16-eidas-signature", "When does an e-signature hold?"),
)


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        current = ""
        for word in words:
            trial = word if not current else current + " " + word
            if draw.textlength(trial, font=font) <= width:
                current = trial
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def render_card(title: str) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), GRAPHITE)
    draw = ImageDraw.Draw(image)
    label = ImageFont.truetype(REGULAR, 28)
    headline = ImageFont.truetype(BOLD, 72)
    foot = ImageFont.truetype(REGULAR, 26)
    draw.text((80, 88), "INNA KRAGH", font=label, fill=SILVER)
    draw.rectangle((80, 146, 280, 148), fill=SILVER)
    lines = _wrap(draw, title, headline, WIDTH - 160)
    y = 220
    for line in lines:
        draw.text((80, y), line, font=headline, fill=MILK)
        y += 88
    draw.rectangle((80, HEIGHT - 180, 280, HEIGHT - 178), fill=SILVER)
    draw.text((80, HEIGHT - 150), "M.Sc. in International Law", font=foot, fill=SILVER)
    draw.text((80, HEIGHT - 112), "International Legal & EU Compliance Expert", font=foot, fill=SILVER)
    return image


def write_cards(directory: Path) -> list[Path]:
    directory.mkdir(parents=True, exist_ok=True)
    written = []
    for key, title in CARDS:
        path = directory / f"{key}.png"
        render_card(title).save(path, format="PNG", optimize=True)
        written.append(path)
    return written


if __name__ == "__main__":
    root = Path(__file__).resolve().parent / "media"
    for path in write_cards(root):
        print(path.name, path.stat().st_size)
