"""Operator commands. They prepare a draft and do not schedule or publish."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

from ice.pipeline import open_pipeline
from ice.policy import known_drafts, retirement_plan
from ice.publishing_queue import OutboxBuffer, wire_payload


def live_probe(url: str) -> dict:
    if not url.startswith("https://"):
        return {"ok": False, "content_type": "", "bytes": 0}
    request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "ice-media-check"})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return {
                "ok": response.status == 200,
                "content_type": (response.headers.get("content-type") or "").split(";")[0].strip().lower(),
                "bytes": int(response.headers.get("content-length") or 0),
            }
    except (urllib.error.URLError, TimeoutError, ValueError):
        return {"ok": False, "content_type": "", "bytes": 0}


def main(argv: list[str] | None = None, probe=None) -> int:
    parser = argparse.ArgumentParser(prog="ice")
    sub = parser.add_subparsers(dest="command", required=True)
    parent = argparse.ArgumentParser(add_help=False)
    parent.add_argument("--db", default="ice/state/ice.db")
    sub.add_parser("health", parents=[parent])
    sub.add_parser("report", parents=[parent])
    prepare = sub.add_parser("prepare-draft", parents=[parent])
    prepare.add_argument("--campaign", required=True)
    prepare.add_argument("--channel", required=True)
    prepare.add_argument("--kind", default="post")
    prepare.add_argument("--brief")
    prepare.add_argument("--out", required=True)
    args = parser.parse_args(argv)

    db_path = Path(args.db)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    outbox = OutboxBuffer()
    pipeline = open_pipeline(db_path, outbox, probe=probe or live_probe)
    if args.command == "health":
        json.dump(pipeline.health(), sys.stdout, indent=2)
        sys.stdout.write("\n")
        pipeline.store.close()
        return 0
    if args.command == "report":
        json.dump(
            {"health": pipeline.health(), "retirement": retirement_plan(), "known_drafts": known_drafts()},
            sys.stdout,
            indent=2,
        )
        sys.stdout.write("\n")
        pipeline.store.close()
        return 0

    queued = pipeline.enqueue(
        campaign=args.campaign,
        channel=args.channel,
        kind=args.kind,
        brief=args.brief,
    )
    result = queued if queued.get("duplicate") else pipeline.process(queued["id"])
    intent = None
    if outbox.payloads:
        intent = {"jobId": result["id"], "delivery": "draft", "createPost": wire_payload(outbox.payloads[-1])}
        destination = Path(args.out)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(intent, indent=2), encoding="utf-8")
    json.dump({"job": result, "intent": str(args.out) if intent else None}, sys.stdout, indent=2)
    sys.stdout.write("\n")
    pipeline.store.close()
    return 0 if result["status"] in {"READY", "DRAFT"} or result.get("duplicate") else 1


if __name__ == "__main__":
    raise SystemExit(main())
