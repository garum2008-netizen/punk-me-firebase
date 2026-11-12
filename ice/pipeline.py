"""Runs the three modules in order and stops at a Buffer draft unless scheduling is explicitly executed."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from ice.content_production import ContentProduction, CostDenied, CostLedger, DuplicateCopy, ProductionError, stamp
from ice.media_validation import MediaValidation
from ice.policy import AuthBlocked, known_drafts, load_policy, require_assignment
from ice.publishing_queue import (
    BufferError,
    QueueStore,
    build_payload,
    fingerprint,
    new_job_id,
    view,
)
from ice.quality import text_hash

HAPPY_PATH = ("PENDING", "GENERATING", "VALIDATING", "READY", "DRAFT", "APPROVED", "SCHEDULED")


class Pipeline:
    def __init__(self, store, policy, production, validation, buffer, *, external_hashes=None, go_grants=None, clock=None):
        self.store = store
        self.policy = policy
        self.production = production
        self.validation = validation
        self.buffer = buffer
        self.external_hashes = set(external_hashes or ())
        self.go_grants = set(go_grants or ())
        self.clock = clock or (lambda: datetime.now(timezone.utc))

    def enqueue(self, *, campaign: str, channel: str, kind: str = "post", brief: str | None = None, model: str = "template", supplied_media: dict | None = None) -> dict:
        require_assignment(self.policy, campaign, channel)
        day = self.clock().date().isoformat()
        digest = fingerprint(campaign, channel, kind, brief, day)
        existing = self.store.find_fingerprint(digest)
        if existing is not None:
            return {**view(existing), "duplicate": True}
        job_id = new_job_id(self.clock)
        now = self._now()
        self.store.insert_job(
            {
                "id": job_id,
                "fingerprint": digest,
                "campaign": campaign,
                "channel_key": channel,
                "kind": kind,
                "brief": brief,
                "status": "PENDING",
                "attempts": 0,
                "max_attempts": int(self.policy.get("max_attempts", 3)),
                "retryable": 0,
                "text_hash": None,
                "external_id": None,
                "payload": json.dumps({"model": model, "supplied_media": supplied_media}),
                "last_error": None,
                "created_at": now,
                "updated_at": now,
            }
        )
        self._log(job_id, "PENDING", "enqueued")
        return {**view(self.store.get(job_id)), "duplicate": False}

    def recover(self) -> int:
        moved = 0
        for job in self.store.failed_retryable():
            self._save(job["id"], status="PENDING", retryable=0, last_error=None)
            self._log(job["id"], "PENDING", "retry")
            moved += 1
        return moved

    def run(self) -> list[dict]:
        self.recover()
        return [self.process(job["id"]) for job in list(self.store.pending())]

    def process(self, job_id: str) -> dict:
        job = self.store.get(job_id)
        if job is None:
            raise KeyError(job_id)
        if job["status"] != "PENDING":
            return view(job)
        payload = json.loads(job["payload"] or "{}")
        supplied_media = payload.get("supplied_media")
        try:
            campaign, channel = require_assignment(self.policy, job["campaign"], job["channel_key"])
        except AuthBlocked as exc:
            return self._finish(job, "BLOCKED", "channel_blocked", str(exc))

        self._save(job_id, status="GENERATING")
        self._log(job_id, "GENERATING", "content_production")
        try:
            piece, candidate = self.production.produce(
                campaign=job["campaign"],
                kind=job["kind"],
                brief=job["brief"],
                channel=channel,
                blocked_hashes=set(self.external_hashes),
                model=payload.get("model") or "template",
                job_id=job_id,
                supplied_media=supplied_media,
            )
        except CostDenied as exc:
            return self._finish(job, "FAILED", "paid_model_refused", str(exc), retryable=False)
        except DuplicateCopy as exc:
            return self._finish(job, "BLOCKED", "duplicate_copy", str(exc))
        except ProductionError as exc:
            return self._finish(job, "FAILED", "production_failed", str(exc), retryable=False)

        digest = text_hash(piece["text"])
        clash = self.store.text_in_use(digest)
        if clash is not None and clash["id"] != job_id:
            return self._finish(job, "BLOCKED", "duplicate_copy", "text already in the queue", text_hash=digest)

        self._save(job_id, status="VALIDATING", text_hash=digest)
        self._log(job_id, "VALIDATING", "media_validation")
        verdict = self.validation.validate(candidate, channel, piece["topics"])
        if not verdict["ok"]:
            return self._finish(
                job,
                "BLOCKED",
                verdict["status"],
                verdict.get("reason"),
                text_hash=digest,
                payload_extra={"model": payload.get("model"), "piece": piece, "candidate": candidate},
            )

        asset = verdict["asset"]
        buffer_payload = build_payload(
            job_id=job_id,
            text=piece["text"],
            channel=channel,
            asset=asset,
            delivery="draft",
            title=piece["title"],
        )
        if channel.get("visual_required") and not buffer_payload["assets"]:
            return self._finish(job, "BLOCKED", "blocked_missing_media", "verified asset missing", text_hash=digest)
        self._save(
            job_id,
            status="READY",
            text_hash=digest,
            payload=json.dumps({"piece": piece, "asset": asset, "buffer": buffer_payload, "campaign": campaign}),
        )
        self._log(job_id, "READY", "ready_for_draft")
        try:
            result = self.buffer.create(buffer_payload)
        except BufferError as exc:
            attempts = int(job["attempts"]) + 1
            if exc.ambiguous:
                return self._finish(job, "FAILED", "needs_reconcile", str(exc), attempts=attempts, retryable=False, text_hash=digest)
            retryable = bool(exc.retryable) and attempts < int(job["max_attempts"])
            return self._finish(job, "FAILED", "buffer_error", str(exc), attempts=attempts, retryable=retryable, text_hash=digest)
        if result.get("held"):
            return self._finish(job, "READY", "draft_held", None, text_hash=digest)
        return self._finish(
            job,
            "DRAFT",
            "buffer_draft_created",
            None,
            text_hash=digest,
            external_id=result.get("id"),
            payload_extra={"piece": piece, "asset": asset, "buffer": buffer_payload, "result": result, "campaign": campaign},
        )

    def approve(self, job_id: str, *, permission: bool) -> dict:
        job = self._require(job_id)
        if job["status"] != "DRAFT":
            self._log(job_id, job["status"], "approve_refused", "job is not a draft")
            return view(job)
        campaign = json.loads(job["payload"] or "{}").get("campaign") or {}
        if campaign.get("go_required") and job["campaign"] not in self.go_grants:
            self._log(job_id, "DRAFT", "approve_refused", "book campaign waits for a separate GO")
            return view(job)
        if not permission:
            self._log(job_id, "DRAFT", "approve_refused", "approval permission is off")
            return view(job)
        self._save(job_id, status="APPROVED", last_error=None)
        self._log(job_id, "APPROVED", "approved")
        return view(self.store.get(job_id))

    def schedule(self, job_id: str, *, permission: bool, execute: bool = False) -> dict:
        """Scheduling is a second step. The default runner never executes it."""
        job = self._require(job_id)
        if job["status"] != "APPROVED":
            self._log(job_id, job["status"], "schedule_refused", "job is not approved")
            return view(job)
        if job["campaign"] not in self.go_grants and (json.loads(job["payload"] or "{}").get("campaign") or {}).get("go_required"):
            self._log(job_id, "APPROVED", "schedule_refused", "book campaign waits for a separate GO")
            return view(job)
        if not permission or not self.policy.get("publish_permission"):
            self._log(job_id, "APPROVED", "schedule_refused", "publish permission is off")
            return view(job)
        if not execute:
            self._log(job_id, "APPROVED", "schedule_not_executed", "permission noted; live scheduling stays closed")
            return view(job)
        payload = json.loads(job["payload"] or "{}")
        buffer_payload = dict(payload.get("buffer") or {})
        buffer_payload["saveToDraft"] = False
        buffer_payload["mode"] = "addToQueue"
        buffer_payload.pop("dueAt", None)
        result = self.buffer.create(buffer_payload)
        self._save(job_id, status="SCHEDULED", external_id=job["external_id"] or result.get("id"), last_error=None)
        self._log(job_id, "SCHEDULED", "scheduled", None)
        return view(self.store.get(job_id))

    def health(self) -> dict:
        counts = self.store.counts()
        book = self.policy["campaign_index"]["who_owns_the_truth"]
        return {
            "modules": ["content_production", "media_validation", "publishing_queue"],
            "states": list(HAPPY_PATH),
            "publish_permission": bool(self.policy.get("publish_permission")),
            "book_draft_only": book.get("publication") == "draft_only" and bool(book.get("go_required")),
            "grok_delegation": bool(self.policy.get("grok_delegation", False)),
            "cost_micros": self.store.cost_micros(),
            "denied_charges": self.store.denied_charges(),
            "counts": counts,
            "known_drafts": [item["bufferId"] for item in known_drafts()],
        }

    def _finish(self, job, status, action, error, *, attempts=None, retryable=False, text_hash=None, external_id=None, payload_extra=None) -> dict:
        fields = {"status": status, "last_error": error, "retryable": 1 if retryable else 0}
        if attempts is not None:
            fields["attempts"] = attempts
        if text_hash is not None:
            fields["text_hash"] = text_hash
        if external_id is not None:
            fields["external_id"] = external_id
        if payload_extra is not None:
            fields["payload"] = json.dumps(payload_extra)
        self._save(job["id"], **fields)
        self._log(job["id"], status, action, error)
        return view(self.store.get(job["id"]))

    def _save(self, job_id: str, **fields) -> None:
        fields["updated_at"] = self._now()
        self.store.update(job_id, **fields)

    def _log(self, job_id: str, state: str, action: str, error: str | None = None) -> None:
        self.store.add_event(job_id, state, action, error, self._now())

    def _now(self) -> str:
        return stamp(self.clock())

    def _require(self, job_id: str):
        job = self.store.get(job_id)
        if job is None:
            raise KeyError(job_id)
        return job


def checkpoint_hashes() -> set[str]:
    templates = json.loads((Path(__file__).resolve().parent / "config" / "templates.json").read_text(encoding="utf-8"))
    hashes = set()
    for item in known_drafts():
        campaign = templates.get(item["campaign"], {})
        for items in campaign.values():
            for template in items:
                if template["id"] == item["templateId"]:
                    hashes.add(text_hash(template["text"]))
    return hashes


def open_pipeline(db_path: Path, buffer, *, probe, external_hashes=None, go_grants=None, clock=None) -> Pipeline:
    policy = load_policy()
    store = QueueStore(db_path)
    costs = CostLedger(store, policy)
    production = ContentProduction.load(costs, db_path.parent / "cards")
    hashes = set(checkpoint_hashes())
    hashes.update(external_hashes or ())
    return Pipeline(
        store,
        policy,
        production,
        MediaValidation(probe),
        buffer,
        external_hashes=hashes,
        go_grants=go_grants,
        clock=clock,
    )
