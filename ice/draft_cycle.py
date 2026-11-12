"""Build Buffer draft payloads. This module never calls Buffer.

A payload is included only for English copy on a connected business
channel, and only when the image URL is already public https.
Comedy packages stay in the library because no business reel channel
is connected. Danish stays out until native review is accepted.
No payload carries a date, and none asks Buffer to publish now.
"""

from __future__ import annotations

import json

from ice.library import LibraryError, assess_package, business_channels, package_text, week_packages
from ice.publishing_queue import build_payload, wire_payload


def draft_jobs(packages: list[dict] | None = None) -> list[dict]:
    packages = week_packages() if packages is None else packages
    business = business_channels()
    jobs = []
    for package in packages:
        decision = assess_package(package, "en")
        if not decision["may_create_buffer_draft"]:
            continue
        if decision["may_schedule"] or decision["may_publish"]:
            raise LibraryError("draft cycle refused a package that can leave draft")
        text = package_text(package, "en")
        media = package.get("media") or {}
        asset = {
            "verified": True,
            "kind": "image",
            "url": media["url"],
            "alt": media.get("alt") or package["title"],
        }
        for key in package.get("channels") or []:
            channel = business[key]
            job_id = package["id"] + "-" + channel["service"]
            payload = build_payload(
                job_id=job_id,
                text=text,
                channel={
                    "id": channel["id"],
                    "service": channel["service"],
                    "visual_required": True,
                },
                asset=asset,
                delivery="draft",
                title=package["title"],
            )
            wire = wire_payload(payload)
            if wire.get("saveToDraft") is not True or wire.get("mode") == "shareNow" or "dueAt" in wire:
                raise LibraryError("draft cycle tried to schedule")
            if not wire.get("assets"):
                raise LibraryError("draft cycle dropped the image")
            jobs.append(
                {
                    "package_id": package["id"],
                    "channel_key": key,
                    "job_id": job_id,
                    "language": "en",
                    "payload": wire,
                }
            )
    return jobs


def main() -> None:
    jobs = draft_jobs()
    summary = {
        "count": len(jobs),
        "job_ids": [item["job_id"] for item in jobs],
        "save_to_draft": all(item["payload"]["saveToDraft"] is True for item in jobs),
        "dated": any("dueAt" in item["payload"] for item in jobs),
        "buffer_called": False,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
