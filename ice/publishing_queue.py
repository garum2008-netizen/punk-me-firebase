"""Module 3. Queue, journal, retries and the only Buffer write: create a draft."""

from __future__ import annotations

import hashlib
import json
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

from ice.content_production import stamp

STATES = (
    "PENDING",
    "GENERATING",
    "VALIDATING",
    "READY",
    "DRAFT",
    "APPROVED",
    "SCHEDULED",
    "FAILED",
    "BLOCKED",
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  fingerprint TEXT UNIQUE,
  campaign TEXT NOT NULL,
  channel_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  brief TEXT,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  retryable INTEGER NOT NULL DEFAULT 0,
  text_hash TEXT,
  external_id TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT,
  state TEXT NOT NULL,
  action TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT,
  engine TEXT NOT NULL,
  model TEXT NOT NULL,
  units INTEGER NOT NULL,
  usd_micros INTEGER NOT NULL,
  denied INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
"""


class BufferError(Exception):
    def __init__(self, message: str, *, retryable: bool = True, ambiguous: bool = False):
        super().__init__(message)
        self.retryable = retryable
        self.ambiguous = ambiguous


class MemoryBuffer:
    """create() is the only write. Existing scheduled posts cannot be updated here."""

    def __init__(self, fail_times: int = 0, ambiguous_failure: bool = False):
        self.fail_times = fail_times
        self.ambiguous_failure = ambiguous_failure
        self.calls: list[dict] = []
        self._done: dict[str, dict] = {}

    def create(self, payload: dict) -> dict:
        key = payload["idempotencyKey"]
        if key in self._done:
            return dict(self._done[key], duplicate=True)
        if payload.get("mode") == "shareNow" or "dueAt" in payload:
            raise BufferError("refusing a schedule mutation", retryable=False)
        if self.fail_times > 0:
            self.fail_times -= 1
            self.calls.append({"payload": payload, "ok": False})
            raise BufferError(
                "temporary buffer failure",
                retryable=not self.ambiguous_failure,
                ambiguous=self.ambiguous_failure,
            )
        if payload.get("visualRequired") and not payload.get("assets"):
            raise BufferError("media missing", retryable=False)
        post_id = "mem_" + key.replace("-", "")[:12]
        result = {
            "id": post_id,
            "status": "draft" if payload.get("saveToDraft") else "scheduled",
            "duplicate": False,
        }
        self._done[key] = result
        self.calls.append({"payload": payload, "ok": True, "id": post_id})
        return result


class OutboxBuffer:
    """Holds a draft payload. It does not call Buffer."""

    def __init__(self):
        self.payloads: list[dict] = []

    def create(self, payload: dict) -> dict:
        if payload.get("saveToDraft") is not True:
            raise BufferError("outbox accepts drafts only", retryable=False)
        self.payloads.append(payload)
        return {"id": None, "held": True, "status": "ready"}


class QueueStore:
    def __init__(self, path: Path | str):
        self.conn = sqlite3.connect(str(path))
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)

    def close(self) -> None:
        self.conn.close()

    def insert_job(self, row: dict) -> None:
        columns = list(row)
        sql = "INSERT INTO jobs ({}) VALUES ({})".format(
            ", ".join(columns), ", ".join("?" for _ in columns)
        )
        self.conn.execute(sql, [row[name] for name in columns])
        self.conn.commit()

    def find_fingerprint(self, fingerprint: str):
        return self.conn.execute("SELECT * FROM jobs WHERE fingerprint = ?", (fingerprint,)).fetchone()

    def get(self, job_id: str):
        return self.conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()

    def update(self, job_id: str, **fields) -> None:
        assignments = ", ".join(f"{name} = ?" for name in fields)
        self.conn.execute(
            f"UPDATE jobs SET {assignments} WHERE id = ?",
            [*fields.values(), job_id],
        )
        self.conn.commit()

    def pending(self) -> list:
        return list(self.conn.execute("SELECT * FROM jobs WHERE status = 'PENDING' ORDER BY created_at, id"))

    def failed_retryable(self) -> list:
        return list(
            self.conn.execute(
                """
                SELECT * FROM jobs
                WHERE status = 'FAILED' AND retryable = 1 AND attempts < max_attempts
                ORDER BY created_at, id
                """
            )
        )

    def text_in_use(self, digest: str):
        return self.conn.execute(
            """
            SELECT * FROM jobs
            WHERE text_hash = ?
              AND status NOT IN ('FAILED', 'BLOCKED')
            """,
            (digest,),
        ).fetchone()

    def counts(self) -> dict[str, int]:
        rows = self.conn.execute("SELECT status, COUNT(*) AS n FROM jobs GROUP BY status").fetchall()
        return {row["status"]: row["n"] for row in rows}

    def add_event(self, job_id: str | None, state: str, action: str, error: str | None, when: str) -> None:
        self.conn.execute(
            "INSERT INTO events (job_id, state, action, error, created_at) VALUES (?, ?, ?, ?, ?)",
            (job_id, state, action, error, when),
        )
        self.conn.commit()

    def events(self, job_id: str) -> list[dict]:
        rows = self.conn.execute(
            "SELECT state, action, error, created_at FROM events WHERE job_id = ? ORDER BY id",
            (job_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def add_cost(self, engine: str, model: str, units: int, usd_micros: int, denied: bool, job_id: str | None) -> None:
        self.conn.execute(
            """
            INSERT INTO costs (job_id, engine, model, units, usd_micros, denied, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (job_id, engine, model, units, usd_micros, 1 if denied else 0, stamp()),
        )
        self.conn.commit()

    def cost_micros(self) -> int:
        return int(self.conn.execute("SELECT COALESCE(SUM(usd_micros), 0) AS n FROM costs").fetchone()["n"])

    def denied_charges(self) -> int:
        return int(self.conn.execute("SELECT COUNT(*) AS n FROM costs WHERE denied = 1").fetchone()["n"])


def new_job_id(clock) -> str:
    return "ICE-" + clock().strftime("%Y%m%d") + "-" + uuid.uuid4().hex[:8]


def fingerprint(campaign: str, channel: str, kind: str, brief: str | None, day: str) -> str:
    raw = "|".join([campaign, channel, kind, brief or "", day])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def build_payload(*, job_id: str, text: str, channel: dict, asset: dict | None, delivery: str, title: str) -> dict:
    if delivery not in {"draft", "queue"}:
        raise BufferError("unknown delivery", retryable=False)
    payload = {
        "channelId": channel["id"],
        "schedulingType": "automatic",
        "text": text if "ICE-REF:" in text else text.rstrip() + "\n\nICE-REF:" + job_id,
        "mode": "addToQueue",
        "saveToDraft": delivery == "draft",
        "idempotencyKey": job_id,
        "assets": [],
        "metadata": {},
        "visualRequired": bool(channel.get("visual_required")),
    }
    if asset and asset.get("verified"):
        if asset["kind"] == "image":
            payload["assets"].append({"image": {"url": asset["url"], "metadata": {"altText": asset["alt"]}}})
        elif asset["kind"] == "video":
            payload["assets"].append({"video": {"url": asset["url"]}})
    service = channel["service"]
    if service == "facebook":
        media_type = "reel" if asset and asset.get("kind") == "video" else "post"
        payload["metadata"]["facebook"] = {"type": media_type}
    elif service == "linkedin":
        payload["metadata"]["linkedin"] = {}
    elif service == "instagram":
        media_type = "reel" if asset and asset.get("kind") == "video" else "post"
        payload["metadata"]["instagram"] = {"type": media_type, "shouldShareToFeed": True}
    elif service == "youtube":
        payload["metadata"]["youtube"] = {
            "title": title[:100],
            "categoryId": "22",
            "privacy": "public",
            "madeForKids": bool(channel.get("made_for_kids", False)),
        }
    if payload["mode"] == "shareNow" or "dueAt" in payload:
        raise BufferError("schedule guard failed", retryable=False)
    return payload


def wire_payload(payload: dict) -> dict:
    hidden = {"visualRequired", "idempotencyKey"}
    return {key: value for key, value in payload.items() if key not in hidden}


def view(job) -> dict:
    return {
        "id": job["id"],
        "status": job["status"],
        "campaign": job["campaign"],
        "channel": job["channel_key"],
        "attempts": job["attempts"],
        "retryable": bool(job["retryable"]),
        "external_id": job["external_id"],
        "error": job["last_error"],
        "duplicate": False,
    }
