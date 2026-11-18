"""Operator commands. They prepare a draft and do not schedule or publish."""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

from ice.buffer_api import BufferAPI
from ice.pipeline import open_pipeline
from ice.policy import known_drafts, retirement_plan
from ice.publishing_queue import BufferError, OutboxBuffer, wire_payload


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
    send = sub.add_parser("send-draft", parents=[parent])
    send.add_argument("--job-id", required=True)
    verify = sub.add_parser("verify-draft", parents=[parent])
    verify.add_argument("--job-id", required=True)
    verify.add_argument("--buffer-id")
    args = parser.parse_args(argv)

    db_path = Path(args.db)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if args.command in {"send-draft", "verify-draft"}:
        token = os.environ.get("ICE_BUFFER_API_KEY", "").strip()
        if not token:
            parser.error("ICE_BUFFER_API_KEY is required for Buffer commands")
        pipeline = open_pipeline(db_path, BufferAPI(token), probe=probe or live_probe)
        try:
            if args.command == "send-draft":
                result = pipeline.send_draft(args.job_id)
            else:
                result = pipeline.verify_draft(args.job_id, args.buffer_id)
        except (BufferError, KeyError, ValueError) as exc:
            print(json.dumps({"job_id": args.job_id, "error": str(exc)}))
            return 1
        finally:
            pipeline.store.close()
        print(json.dumps(result, indent=2))
        return 0 if result["status"] == "DRAFT" else 1

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
    result = pipeline.process(queued["id"])
    intent = None
    if outbox.payloads:
        intent = {"jobId": result["id"], "delivery": "draft", "createPost": wire_payload(outbox.payloads[-1])}
        destination = Path(args.out)
        destination.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=destination.parent, delete=False) as temporary:
            temporary_path = Path(temporary.name)
            try:
                json.dump(intent, temporary, indent=2)
                temporary.close()
                temporary_path.replace(destination)
            finally:
                temporary_path.unlink(missing_ok=True)
    json.dump({"job": result, "intent": str(args.out) if intent else None}, sys.stdout, indent=2)
    sys.stdout.write("\n")
    pipeline.store.close()
    return 0 if intent or result["status"] == "DRAFT" else 1


if __name__ == "__main__":
    raise SystemExit(main())
