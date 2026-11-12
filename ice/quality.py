"""Text checks and schedule snapshots. Existing Buffer slots are compared, not edited."""

from __future__ import annotations

import hashlib
import re
from typing import Iterable, Mapping

BANNED_PHRASES = ("contractbot.eu", "contractbot scan")
ALLOWED_EMAIL = "legal@contractbot.dk"
EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}")
HASHTAG_RE = re.compile(r"#[\w]+", re.UNICODE)
ICE_REF_RE = re.compile(r"ICE-REF:\s*\S+")


def normalize_text(text: str) -> str:
    without_ref = ICE_REF_RE.sub(" ", text or "")
    return re.sub(r"\s+", " ", without_ref.lower()).strip()


def text_hash(text: str) -> str:
    return hashlib.sha256(normalize_text(text).encode("utf-8")).hexdigest()


def quality_errors(text: str) -> list[str]:
    errors: list[str] = []
    if not text or not text.strip():
        errors.append("empty")
        return errors
    lowered = text.lower()
    for phrase in BANNED_PHRASES:
        if phrase in lowered:
            errors.append("banned:" + phrase)
    for email in EMAIL_RE.findall(text):
        if email.lower() != ALLOWED_EMAIL:
            errors.append("email:" + email)
    if len(HASHTAG_RE.findall(text)) > 3:
        errors.append("hashtags")
    return errors


def schedule_rows(posts: Iterable[Mapping]) -> tuple:
    rows = []
    for post in posts:
        assets = post.get("assets") or []
        rows.append(
            (
                post.get("id"),
                post.get("channelId"),
                post.get("status"),
                post.get("dueAt"),
                post.get("shareMode"),
                len(assets) if isinstance(assets, list) else int(assets),
            )
        )
    return tuple(sorted(rows, key=lambda row: (row[0] or "", row[3] or "")))


def schedule_changed(before: Iterable[Mapping], after: Iterable[Mapping]) -> list[tuple]:
    previous = set(schedule_rows(before))
    current = set(schedule_rows(after))
    return sorted(previous.symmetric_difference(current))
