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
    OutboxBuffer,
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
        inserted = self.store.insert_job(
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
        if not inserted:
            return {**view(self.store.find_fingerprint(digest)), "duplicate": True}
        self._log(job_id, "PENDING", "enqueued")
        return {**view(self.store.get(job_id)), "duplicate": False}

    def recover(self) -> int:
        moved = 0
        for job in self.store.failed_retryable():
            if self.store.claim(job["id"], "FAILED", "PENDING", self._now()):
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
        if job["status"] == "READY":
            return self.send_draft(job_id)
        if job["status"] != "PENDING":
            return view(job)
        payload = json.loads(job["payload"] or "{}")
        if payload.get("buffer"):
            if self.store.claim(job_id, "PENDING", "READY", self._now()):
                return self.send_draft(job_id)
            return view(self._require(job_id))
        supplied_media = payload.get("supplied_media")
        try:
            campaign, channel = require_assignment(self.policy, job["campaign"], job["channel_key"])
        except AuthBlocked as exc:
            return self._finish(job, "BLOCKED", "channel_blocked", str(exc))

        if not self.store.claim(job_id, "PENDING", "GENERATING", self._now()):
            return view(self._require(job_id))
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
        if not self.store.reserve_text(job_id, digest, self._now()):
            return self._finish(job, "BLOCKED", "duplicate_copy", "text already in the queue", text_hash=digest)

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
        return self.send_draft(job_id, revalidate=False)

    def send_draft(self, job_id: str, *, revalidate: bool = True) -> dict:
        job = self._require(job_id)
        if job["status"] == "FAILED" and job["retryable"] and job["attempts"] < job["max_attempts"]:
            self.store.claim(job_id, "FAILED", "READY", self._now())
            job = self._require(job_id)
        if job["status"] != "READY":
            return view(job)
        draft = json.loads(job["payload"])
        buffer_payload = draft["buffer"]
        if isinstance(self.buffer, OutboxBuffer):
            self.buffer.create(buffer_payload)
            return view(job)
        if not self.store.claim(job_id, "READY", "SUBMITTING", self._now()):
            return view(self._require(job_id))
        try:
            _, channel = require_assignment(self.policy, job["campaign"], job["channel_key"])
        except AuthBlocked as exc:
            return self._finish(job, "BLOCKED", "channel_blocked", str(exc))
        if channel["id"] != buffer_payload["channelId"]:
            return self._finish(job, "BLOCKED", "channel_changed", "saved draft belongs to a different channel")
        if revalidate:
            verdict = self.validation.validate(draft["asset"], channel, draft["piece"]["topics"])
            if not verdict["ok"]:
                return self._finish(job, "BLOCKED", verdict["status"], verdict.get("reason"))
        try:
            result = self.buffer.create(buffer_payload)
        except BufferError as exc:
            attempts = int(job["attempts"]) + 1
            if exc.ambiguous:
                return self._finish(job, "NEEDS_RECONCILE", "needs_reconcile", str(exc), attempts=attempts, external_id=exc.post_id)
            retryable = bool(exc.retryable) and attempts < int(job["max_attempts"])
            return self._finish(job, "FAILED", "buffer_error", str(exc), attempts=attempts, retryable=retryable)
        return self._confirm_draft(job, draft, result, created_id=result.get("id"))

    def verify_draft(self, job_id: str, post_id: str | None) -> dict:
        job = self._require(job_id)
        if job["status"] not in {"SUBMITTING", "NEEDS_RECONCILE"}:
            return view(job)
        known_id = job["external_id"]
        if known_id and post_id and known_id != post_id:
            raise ValueError("Buffer ID does not match the one saved with this job")
        post_id = known_id or post_id
        if not post_id:
            raise ValueError("an existing Buffer draft ID is required")
        result = self.buffer.get_post(post_id)
        if result.get("id") != post_id:
            raise ValueError("Buffer did not return the requested draft")
        return self._confirm_draft(job, json.loads(job["payload"]), result)

    def _confirm_draft(self, job, draft: dict, result: dict, *, created_id: str | None = None) -> dict:
        payload = draft["buffer"]
        valid = (
            result.get("id") and result.get("status") == "draft" and not result.get("dueAt")
            and result.get("channelId") == payload["channelId"]
            and text_hash(result.get("text") or "") == text_hash(payload["text"])
        )
        if valid and payload["visualRequired"]:
            valid = self.validation.confirm_buffer_attachment(result, draft["asset"]["kind"])["ok"]
        if not valid:
            # An unknown or unrelated readback must never replace the known Buffer ID.
            return self._finish(job, "NEEDS_RECONCILE", "needs_reconcile", "Buffer draft or media not confirmed", external_id=created_id)
        return self._finish(job, "DRAFT", "buffer_draft_created", None, external_id=result["id"], payload_extra={**draft, "result": result})

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
        self._log(job_id, "APPROVED", "schedule_refused", "scheduling an existing Buffer draft is not available in this runner")
        return view(job)

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
