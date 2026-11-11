"""Module 2. A visual post is not transferable until the asset is public and matches the channel."""

from __future__ import annotations

from typing import Callable

Probe = Callable[[str], dict]


class MediaValidation:
    def __init__(self, probe: Probe):
        self.probe = probe

    def validate(self, candidate: dict | None, channel: dict, topics: list[str]) -> dict:
        if not channel.get("visual_required"):
            return {"ok": True, "status": "text_only", "asset": None}
        if not candidate:
            return self._block("blocked_missing_media", "visual post has no media candidate")
        if candidate.get("kind") != channel.get("media_kind"):
            return self._block("blocked_channel_mismatch", "media kind does not match the channel")
        if not set(candidate.get("topics") or []) & set(topics):
            return self._block("blocked_topic_mismatch", "media does not match the post")
        url = str(candidate.get("url") or "")
        if not url.startswith("https://"):
            return self._block("blocked_not_public", "local or non-https media cannot be sent")
        if candidate.get("kind") == "image" and not str(candidate.get("alt") or "").strip():
            return self._block("blocked_format", "image alt text is required")
        probed = self.probe(url)
        if not probed.get("ok") or int(probed.get("bytes") or 0) <= 1024:
            return self._block("blocked_unreachable", "media URL is not reachable")
        ctype = str(probed.get("content_type") or "")
        expected = "image/" if candidate["kind"] == "image" else "video/"
        if not ctype.startswith(expected):
            return self._block("blocked_format", "content type does not match the channel")
        asset = dict(candidate)
        asset["verified"] = True
        asset["content_type"] = ctype
        return {"ok": True, "status": "media_verified", "asset": asset}

    def confirm_buffer_attachment(self, post: dict) -> dict:
        """After a draft exists, Buffer itself must still show the asset."""
        assets = post.get("assets") or []
        if post.get("status") != "draft":
            return self._block("blocked_unconfirmed_media", "checkpoint is not a draft")
        if post.get("dueAt"):
            return self._block("blocked_unconfirmed_media", "draft has a schedule time")
        if not assets:
            return self._block("blocked_unconfirmed_media", "Buffer returned no assets")
        first = assets[0]
        source = first.get("source") or (first.get("image") or {}).get("url") or ""
        if not str(source).startswith("https://"):
            return self._block("blocked_unconfirmed_media", "Buffer asset is not a public URL")
        return {"ok": True, "status": "media_confirmed", "assets": len(assets), "source": source}

    @staticmethod
    def _block(status: str, reason: str) -> dict:
        return {"ok": False, "status": status, "reason": reason, "asset": None}
