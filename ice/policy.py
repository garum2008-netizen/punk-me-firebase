"""Channel profiles and campaign holds. Kids settings never follow the business profile."""

from __future__ import annotations

import json
from pathlib import Path

PACKAGE = Path(__file__).resolve().parent


class PolicyError(Exception):
    pass


class AuthBlocked(PolicyError):
    pass


def load_json(name: str) -> dict | list:
    return json.loads((PACKAGE / "config" / name).read_text(encoding="utf-8"))


def load_policy() -> dict:
    raw = load_json("authorization.json")
    raw["channel_index"] = {item["key"]: item for item in raw["channels"]}
    raw["campaign_index"] = {item["key"]: item for item in raw["campaigns"]}
    if len(raw["channel_index"]) != len(raw["channels"]):
        raise PolicyError("duplicate channel")
    if len(raw["campaign_index"]) != len(raw["campaigns"]):
        raise PolicyError("duplicate campaign")
    if raw.get("share_now"):
        raise PolicyError("shareNow is disabled")
    if raw.get("publish_permission"):
        raise PolicyError("publish permission must stay off in the saved policy")
    return raw


def channel_profile(channel: dict) -> dict:
    kids = channel.get("audience") == "kids"
    return {
        "audience": "kids" if kids else "business",
        "generate_text": bool(channel.get("generate")) and not kids,
        "generate_media": bool(channel.get("generate")) and not kids,
        "media_kind": channel.get("media_kind"),
        "visual_required": bool(channel.get("visual_required")),
        "publication": channel.get("publication"),
    }


def require_assignment(policy: dict, campaign_key: str, channel_key: str) -> tuple[dict, dict]:
    try:
        campaign = dict(policy["campaign_index"][campaign_key])
    except KeyError as exc:
        raise AuthBlocked("unknown campaign") from exc
    try:
        channel = dict(policy["channel_index"][channel_key])
    except KeyError as exc:
        raise AuthBlocked("unknown channel") from exc
    if channel_key not in campaign["channels"]:
        raise AuthBlocked("campaign is not allowed on this channel")
    if not channel.get("connected", False):
        raise AuthBlocked("channel is disconnected")
    profile = channel_profile(channel)
    if not profile["generate_text"]:
        raise AuthBlocked("channel keeps its existing queue and does not take new generated copy")
    return campaign, channel


def retirement_plan() -> list[dict]:
    data = load_json("ownership.json")
    return [
        {
            "name": item["name"],
            "responsibility_now": item["responsibility_now"],
            "transferred": bool(item.get("transferred")),
            "disabled": False,
            "reason": item.get("reason", ""),
        }
        for item in data["legacy"]
    ]


def known_drafts() -> list[dict]:
    return list(load_json("known_drafts.json"))
