"""Module 1. Produces text and a media candidate. It does not validate or publish."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from ice.policy import PACKAGE, channel_profile
from ice.pngcard import write_brand_card
from ice.quality import quality_errors, text_hash

KINDS = ("post", "article", "caption", "script")


class ProductionError(Exception):
    pass


class DuplicateCopy(ProductionError):
    pass


class CostDenied(ProductionError):
    pass


class ContentProduction:
    def __init__(self, templates: dict, library: list[dict], costs, card_dir: Path):
        self.templates = templates
        self.library = library
        self.costs = costs
        self.card_dir = card_dir

    @classmethod
    def load(cls, costs, card_dir: Path) -> "ContentProduction":
        templates = json.loads((PACKAGE / "config" / "templates.json").read_text(encoding="utf-8"))
        library = json.loads((PACKAGE / "config" / "media_library.json").read_text(encoding="utf-8"))
        return cls(templates, library, costs, card_dir)

    def produce(
        self,
        *,
        campaign: str,
        kind: str,
        brief: str | None,
        channel: dict,
        blocked_hashes: set[str],
        model: str = "template",
        job_id: str | None = None,
        supplied_media: dict | None = None,
    ) -> tuple[dict, dict | None]:
        profile = channel_profile(channel)
        if not profile["generate_text"]:
            raise ProductionError("this channel profile does not generate new copy")
        if model != "template":
            self.costs.deny(model)
        if kind not in KINDS:
            raise ProductionError("unknown kind")
        piece = self._text(campaign, kind, brief, blocked_hashes, job_id)
        media = None
        if profile["generate_media"]:
            if supplied_media:
                media = dict(supplied_media)
                media["verified"] = False
                media["origin"] = "supplied"
            else:
                media = self._media(campaign, piece["topics"], profile["media_kind"], job_id or "card")
        return piece, media

    def _text(self, campaign: str, kind: str, brief: str | None, blocked: set[str], job_id: str | None) -> dict:
        try:
            options = list(self.templates[campaign][kind])
        except KeyError as exc:
            raise ProductionError("no template for campaign") from exc
        ordered = _rotate(options, brief or campaign + ":" + kind)
        if brief:
            exact = [item for item in ordered if item["id"] == brief]
            ordered = exact + [item for item in ordered if item["id"] != brief]
        saw_duplicate = False
        saw_quality = False
        for item in ordered:
            if quality_errors(item["text"]):
                saw_quality = True
                continue
            if text_hash(item["text"]) in blocked:
                saw_duplicate = True
                continue
            self.costs.charge(engine="content_production", model="template", job_id=job_id)
            return {
                "id": item["id"],
                "language": item["language"],
                "title": item["title"],
                "topics": list(item["topics"]),
                "text": item["text"],
                "kind": kind,
            }
        if saw_duplicate:
            raise DuplicateCopy("every usable template matches an existing post")
        if saw_quality:
            raise ProductionError("every template failed quality")
        raise ProductionError("no template for campaign")

    def _media(self, campaign: str, topics: list[str], kind: str, job_id: str) -> dict | None:
        wanted = set(topics)
        for asset in self.library:
            allowed = asset.get("campaigns") or []
            if allowed and campaign not in allowed:
                continue
            if asset.get("kind") != kind:
                continue
            if not wanted & set(asset.get("topics") or []):
                continue
            self.costs.charge(engine="content_production", model="library", job_id=job_id)
            return {
                "id": asset["id"],
                "url": asset["url"],
                "kind": asset["kind"],
                "topics": list(asset["topics"]),
                "alt": asset.get("alt") or "",
                "origin": "library",
                "verified": False,
            }
        if kind != "image":
            return None
        path = write_brand_card(self.card_dir / (job_id + ".png"))
        self.costs.charge(engine="content_production", model="local-card", units=1, job_id=job_id)
        return {
            "id": path.stem,
            "url": path.resolve().as_uri(),
            "kind": "image",
            "topics": list(topics),
            "alt": "Solid ContractBot card, no portrait",
            "origin": "local-card",
            "verified": False,
        }


def _rotate(options: list[dict], seed: str) -> list[dict]:
    if len(options) < 2:
        return options
    start = int(hashlib.sha256(seed.encode("utf-8")).hexdigest()[:8], 16) % len(options)
    return options[start:] + options[:start]


class CostLedger:
    def __init__(self, store, policy: dict):
        self.store = store
        self.policy = policy

    def charge(self, *, engine: str, model: str, units: int = 0, usd_micros: int = 0, job_id: str | None = None) -> None:
        self._guard(model, usd_micros)
        self.store.add_cost(engine, model, units, usd_micros, False, job_id)

    def deny(self, model: str) -> None:
        self.store.add_cost("content_production", model, 0, 0, True, None)
        raise CostDenied("paid model refused: " + model)

    def _guard(self, model: str, usd_micros: int) -> None:
        name = (model or "").lower()
        allowed = {"template", "library", "local-card", "none"}
        if name.startswith("grok") or name not in allowed:
            self.deny(model)
        cap = int(self.policy.get("daily_paid_cap_micros", 0))
        if usd_micros > 0 and self.store.cost_micros() + usd_micros > cap:
            raise CostDenied("daily cost cap")


def stamp(moment: datetime | None = None) -> str:
    current = moment or datetime.now(timezone.utc)
    return current.replace(microsecond=0).isoformat()
