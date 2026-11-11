"""One content library for ICE. Nothing here schedules or publishes.

A package stays in the library until the owner approves that exact text,
the channel is a connected business channel, and a visual post has a
Buffer-confirmed image. Children's channels are never a destination.
"""

from __future__ import annotations

import json
from pathlib import Path

PACKAGE = Path(__file__).resolve().parent

SECTIONS = (
    "case_library",
    "research_notes",
    "content_ideas",
    "scripts_articles",
    "media_assets",
    "drafts_approvals",
    "publishing_calendar",
    "published_analytics",
)

BANNED = (
    "contractbot.eu",
    "www.contractbot.eu",
    "/ai-architect",
    "/ask-inna",
    "premium",
    "17 years",
    "clarges",
)


class LibraryError(Exception):
    pass


def _load(name: str) -> dict:
    return json.loads((PACKAGE / "config" / name).read_text(encoding="utf-8"))


def channel_map() -> dict:
    return _load("channel_map.json")


def week_packages() -> list[dict]:
    packages = list(_load("week-2026-11-16.json")["packages"])
    ids = [item["id"] for item in packages]
    if len(ids) != len(set(ids)):
        raise LibraryError("duplicate package")
    return packages


def reconciliation() -> dict:
    return _load("buffer_reconciliation.json")


def _business_ids() -> dict[str, dict]:
    mapped = channel_map()["business"]
    return {item["key"]: item for item in mapped}


def _kids_ids() -> set[str]:
    return {item["id"] for item in channel_map()["separated"]}


def package_text(package: dict, language: str) -> str:
    texts = package.get("texts") or {}
    return str(texts.get(language) or "")


def assess_package(package: dict, language: str = "en") -> dict:
    """Return the gate for one package. Publication is off in every result."""
    blockers: list[str] = []
    kind = package.get("scenario_kind")
    if kind not in {"educational", "fictional"}:
        blockers.append("scenario_not_labeled")
    if package.get("approval_state") != "approved_by_owner":
        blockers.append("pending_owner_approval")
    text = package_text(package, language)
    if not text.strip():
        blockers.append("missing_text")
    lowered = text.lower()
    for phrase in BANNED:
        if phrase in lowered:
            blockers.append("banned:" + phrase)
    if "€" in text or "EUR" in text or "DKK" in text:
        blockers.append("price_or_currency")
    if language != "en" and package.get("native_review", {}).get(language) != "accepted":
        blockers.append("native_review_required")
    channel_keys = list(package.get("channels") or [])
    business = _business_ids()
    if not channel_keys:
        blockers.append("channel_not_connected")
    for key in channel_keys:
        channel = business.get(key)
        if channel is None:
            blockers.append("channel_not_connected")
            continue
        if channel["id"] in _kids_ids() or channel.get("audience") != "business":
            blockers.append("children_channel_blocked")
    media = package.get("media") or {}
    visual = package.get("visual", True)
    if visual and not (media.get("buffer_confirmed") and str(media.get("url") or "").startswith("https://")):
        blockers.append("media_unverified")
    return {
        "package_id": package["id"],
        "language": language,
        "library_status": "draft",
        "may_create_buffer_draft": not blockers,
        "may_schedule": False,
        "may_publish": False,
        "blockers": blockers,
    }


def prepare_buffer_draft(package: dict, language: str = "en") -> dict:
    """Decide whether a Buffer draft is allowed. This build never calls Buffer."""
    decision = assess_package(package, language)
    decision["buffer_called"] = False
    if decision["may_create_buffer_draft"]:
        decision["may_create_buffer_draft"] = False
        decision["hold"] = "buffer_write_disabled_until_a_separate_scheduling_go"
    return decision


def build_index() -> dict:
    packages = week_packages()
    notes = _load("week-2026-11-16.json").get("research_notes") or []
    media = reconciliation().get("verified_media") or []
    calendar = [
        {
            "package_id": item["id"],
            "proposed_day": item["proposed_day"],
            "channels": item.get("channels") or [],
            "status": "proposed_not_scheduled",
            "dueAt": None,
        }
        for item in packages
    ]
    return {
        "case_library": [
            {
                "id": item["id"],
                "title": item["title"],
                "scenario_kind": item["scenario_kind"],
                "source": item["source"],
                "owner": "Inna Kragh",
                "approval_state": item["approval_state"],
            }
            for item in packages
        ],
        "research_notes": notes,
        "content_ideas": [{"id": item["id"], "title": item["title"]} for item in packages],
        "scripts_articles": [
            {"id": item["id"], "languages": sorted((item.get("texts") or {}).keys())} for item in packages
        ],
        "media_assets": media,
        "drafts_approvals": [assess_package(item) for item in packages],
        "publishing_calendar": calendar,
        "published_analytics": [],
    }


def protected_post_ids() -> set[str]:
    report = reconciliation()
    groups = (
        report.get("contract_drama_scheduled") or [],
        report.get("scheduled_missing_media") or [],
        report.get("drafts_missing_media") or [],
        report.get("known_drafts") or [],
    )
    return {item["id"] for group in groups for item in group}
