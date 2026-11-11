"""Three ICE modules. No network and no second Buffer post."""

from __future__ import annotations

import contextlib
import io
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from ice.content_production import ContentProduction, CostLedger
from ice.media_validation import MediaValidation
from ice.pipeline import HAPPY_PATH, Pipeline, checkpoint_hashes, open_pipeline
from ice.policy import AuthBlocked, channel_profile, known_drafts, load_policy, retirement_plan
from ice.publishing_queue import MemoryBuffer, QueueStore
from ice.quality import quality_errors, schedule_changed
from ice.__main__ import main

CLOCK = lambda: datetime(2026, 11, 11, 9, 0, tzinfo=timezone.utc)
ROOT = Path(__file__).resolve().parents[1]


def probe_ok(url: str) -> dict:
    if url.startswith("https://") and "cdn" in url:
        return {"ok": True, "content_type": "image/jpeg", "bytes": 349178}
    return {"ok": False, "content_type": "", "bytes": 0}


class FactoryTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def pipeline(self, buffer=None, hashes=None, go_grants=None, policy=None, library=None):
        policy = policy or load_policy()
        store = QueueStore(Path(self.tmp.name) / (str(id(buffer)) + ".db"))
        self.addCleanup(store.close)
        costs = CostLedger(store, policy)
        if library is None:
            production = ContentProduction.load(costs, Path(self.tmp.name) / "cards")
        else:
            templates = json.loads((ROOT / "config" / "templates.json").read_text(encoding="utf-8"))
            production = ContentProduction(templates, library, costs, Path(self.tmp.name) / "cards")
        blocked = set(checkpoint_hashes())
        if hashes is not None:
            blocked = set(hashes)
        return Pipeline(
            store,
            policy,
            production,
            MediaValidation(probe_ok),
            buffer or MemoryBuffer(),
            external_hashes=blocked,
            go_grants=go_grants,
            clock=CLOCK,
        )

    def test_business_draft_passes_all_three_modules(self):
        buffer = MemoryBuffer()
        pipe = self.pipeline(buffer, hashes=set())
        job = pipe.enqueue(campaign="contractbot_eu", channel="facebook_legal", kind="post", brief="eu-law-venue")
        result = pipe.process(job["id"])
        self.assertEqual(result["status"], "DRAFT")
        payload = buffer.calls[-1]["payload"]
        self.assertTrue(payload["saveToDraft"])
        self.assertEqual(payload["mode"], "addToQueue")
        self.assertNotIn("dueAt", payload)
        self.assertNotEqual(payload["mode"], "shareNow")
        self.assertTrue(payload["assets"][0]["image"]["url"].startswith("https://"))
        self.assertTrue(payload["assets"][0]["image"]["metadata"]["altText"])
        actions = [event["action"] for event in pipe.store.events(job["id"])]
        self.assertEqual(
            actions,
            ["enqueued", "content_production", "media_validation", "ready_for_draft", "buffer_draft_created"],
        )
        states = [event["state"] for event in pipe.store.events(job["id"])]
        self.assertEqual(states, ["PENDING", "GENERATING", "VALIDATING", "READY", "DRAFT"])
        self.assertEqual(list(HAPPY_PATH[:5]), states)
        self.assertEqual(pipe.health()["cost_micros"], 0)
        self.assertFalse(pipe.health()["publish_permission"])
        again = pipe.process(job["id"])
        self.assertEqual(again["external_id"], result["external_id"])
        self.assertEqual(len([call for call in buffer.calls if call["ok"]]), 1)

    def test_known_checkpoint_is_not_duplicated(self):
        buffer = MemoryBuffer()
        pipe = self.pipeline(buffer)
        job = pipe.enqueue(campaign="contractbot_dk", channel="facebook_legal", brief="dk-inspection-en")
        result = pipe.process(job["id"])
        self.assertEqual(result["status"], "DRAFT")
        text = buffer.calls[-1]["payload"]["text"]
        self.assertNotIn("Pipeline check only", text)
        self.assertEqual(known_drafts()[0]["bufferId"], "6af0e14bd6bbae6fa10f1ce0")
        self.assertIsNone(known_drafts()[0]["dueAt"])
        self.assertEqual(known_drafts()[0]["assetsConfirmed"], 1)

    def test_missing_unreachable_and_bad_format_never_call_buffer(self):
        buffer = MemoryBuffer()
        empty = self.pipeline(buffer, library=[])
        missing = empty.enqueue(campaign="contractbot_eu", channel="linkedin_inna", brief="eu-caption")
        self.assertEqual(empty.process(missing["id"])["status"], "BLOCKED")
        self.assertEqual(buffer.calls, [])

        blocked = MediaValidation(lambda url: {"ok": False, "content_type": "", "bytes": 0})
        store = QueueStore(Path(self.tmp.name) / "unreachable.db")
        self.addCleanup(store.close)
        policy = load_policy()
        costs = CostLedger(store, policy)
        pipe = Pipeline(
            store,
            policy,
            ContentProduction.load(costs, Path(self.tmp.name) / "cards2"),
            blocked,
            buffer,
            external_hashes=set(),
            clock=CLOCK,
        )
        job = pipe.enqueue(campaign="contractbot_eu", channel="facebook_legal", brief="eu-liability-cap")
        self.assertEqual(pipe.process(job["id"])["error"], "media URL is not reachable")
        self.assertEqual(buffer.calls, [])

        html = MediaValidation(lambda url: {"ok": True, "content_type": "text/html", "bytes": 5000})
        store2 = QueueStore(Path(self.tmp.name) / "format.db")
        self.addCleanup(store2.close)
        pipe2 = Pipeline(
            store2,
            policy,
            ContentProduction.load(CostLedger(store2, policy), Path(self.tmp.name) / "cards3"),
            html,
            buffer,
            external_hashes=set(),
            clock=CLOCK,
        )
        bad = pipe2.enqueue(campaign="contractbot_dk", channel="linkedin_inna", brief="dk-caption")
        self.assertEqual(pipe2.process(bad["id"])["error"], "content type does not match the channel")
        self.assertEqual(buffer.calls, [])

    def test_channel_mismatch_and_kids_profiles(self):
        validator = MediaValidation(probe_ok)
        image = {
            "url": "https://cdn.example.test/a.jpg",
            "kind": "image",
            "topics": ["contracts"],
            "alt": "A contract page",
        }
        verdict = validator.validate(image, {"visual_required": True, "media_kind": "video"}, ["contracts"])
        self.assertEqual(verdict["status"], "blocked_channel_mismatch")
        policy = load_policy()
        business = channel_profile(policy["channel_index"]["facebook_legal"])
        kids = channel_profile(policy["channel_index"]["youtube_angel"])
        self.assertTrue(business["generate_text"] and business["generate_media"])
        self.assertFalse(kids["generate_text"] or kids["generate_media"])
        self.assertEqual(kids["media_kind"], "video")
        pipe = self.pipeline()
        for channel in ("youtube_punk", "youtube_angel", "instagram_angelina"):
            with self.assertRaises(AuthBlocked):
                pipe.enqueue(campaign="contractbot_dk", channel=channel)

    def test_book_stays_draft_and_cannot_be_scheduled(self):
        cover = {
            "url": "https://cdn.example.test/book.jpg",
            "kind": "image",
            "topics": ["book", "media"],
            "alt": "Book cover placeholder, no portrait",
        }
        buffer = MemoryBuffer()
        pipe = self.pipeline(buffer)
        bare = pipe.enqueue(campaign="who_owns_the_truth", channel="linkedin_inna", brief="wott-hold")
        self.assertEqual(pipe.process(bare["id"])["status"], "BLOCKED")
        self.assertEqual(buffer.calls, [])

        held = pipe.enqueue(
            campaign="who_owns_the_truth",
            channel="facebook_legal",
            brief="wott-hold",
            supplied_media=cover,
        )
        drafted = pipe.process(held["id"])
        self.assertEqual(drafted["status"], "DRAFT")
        self.assertTrue(buffer.calls[-1]["payload"]["saveToDraft"])
        self.assertEqual(pipe.approve(held["id"], permission=True)["status"], "DRAFT")
        pipe.policy["publish_permission"] = True
        self.assertEqual(pipe.schedule(held["id"], permission=True, execute=True)["status"], "DRAFT")
        self.assertEqual(len([call for call in buffer.calls if call["ok"]]), 1)

    def test_schedule_requires_permission_and_does_not_create_a_second_post(self):
        buffer = MemoryBuffer()
        pipe = self.pipeline(buffer, hashes=set())
        job = pipe.enqueue(campaign="contractbot_dk", channel="linkedin_inna", brief="dk-article-currency", kind="article")
        drafted = pipe.process(job["id"])
        self.assertEqual(drafted["status"], "DRAFT")
        self.assertEqual(pipe.schedule(job["id"], permission=True, execute=True)["status"], "DRAFT")
        approved = pipe.approve(job["id"], permission=False)
        self.assertEqual(approved["status"], "DRAFT")
        approved = pipe.approve(job["id"], permission=True)
        self.assertEqual(approved["status"], "APPROVED")
        self.assertEqual(pipe.schedule(job["id"], permission=False, execute=True)["status"], "APPROVED")
        pipe.policy["publish_permission"] = True
        noted = pipe.schedule(job["id"], permission=True, execute=False)
        self.assertEqual(noted["status"], "APPROVED")
        scheduled = pipe.schedule(job["id"], permission=True, execute=True)
        self.assertEqual(scheduled["status"], "SCHEDULED")
        self.assertEqual(scheduled["external_id"], drafted["external_id"])
        self.assertEqual(len([call for call in buffer.calls if call["ok"]]), 1)

    def test_retry_and_ambiguous_failure(self):
        flaky = MemoryBuffer(fail_times=1)
        pipe = self.pipeline(flaky, hashes=set())
        job = pipe.enqueue(campaign="contractbot_eu", channel="linkedin_inna", brief="eu-script", kind="script")
        self.assertEqual(pipe.process(job["id"])["status"], "FAILED")
        self.assertEqual(pipe.recover(), 1)
        self.assertEqual(pipe.process(job["id"])["status"], "DRAFT")
        self.assertEqual(len([call for call in flaky.calls if call["ok"]]), 1)

        ambiguous = MemoryBuffer(fail_times=1, ambiguous_failure=True)
        other = self.pipeline(ambiguous, hashes=set())
        stuck = other.enqueue(campaign="contractbot_eu", channel="facebook_legal", brief="eu-caption", kind="caption")
        failed = other.process(stuck["id"])
        self.assertEqual(failed["status"], "FAILED")
        self.assertFalse(failed["retryable"])
        self.assertEqual(other.recover(), 0)
        self.assertEqual(other.run(), [])
        self.assertEqual([event["action"] for event in other.store.events(stuck["id"]) if event["action"] == "needs_reconcile"], ["needs_reconcile"])

    def test_paid_model_quality_and_schedule_snapshot(self):
        buffer = MemoryBuffer()
        pipe = self.pipeline(buffer, hashes=set())
        job = pipe.enqueue(campaign="contractbot_dk", channel="facebook_legal", brief="dk-caption", model="grok-4")
        refused = pipe.process(job["id"])
        self.assertEqual(refused["status"], "FAILED")
        self.assertEqual(buffer.calls, [])
        self.assertGreaterEqual(pipe.health()["denied_charges"], 1)
        templates = json.loads((ROOT / "config" / "templates.json").read_text(encoding="utf-8"))
        for campaign in templates.values():
            for items in campaign.values():
                for item in items:
                    self.assertEqual(quality_errors(item["text"]), [])
        before = [{"id": "kept", "channelId": "c", "status": "scheduled", "dueAt": "2026-11-12T09:00:00.000Z", "shareMode": "customScheduled", "assets": [{}]}]
        self.assertEqual(schedule_changed(before, before), [])
        self.assertTrue(schedule_changed(before, [{**before[0], "dueAt": "2026-11-13T09:00:00.000Z"}]))
        self.assertFalse(hasattr(buffer, "update"))
        self.assertFalse(hasattr(buffer, "delete"))
        plan = retirement_plan()
        self.assertTrue(all(item["disabled"] is False and item["transferred"] for item in plan))

    def test_checkpoint_attachment_and_prepare_command(self):
        confirmed = MediaValidation(probe_ok).confirm_buffer_attachment(
            {
                "status": "draft",
                "dueAt": None,
                "assets": [{"source": "https://cdn.prod.website-files.com/6891077f866efdab43774e6f/6ac3c81c4ac2199aff03d0ee_13-review-euro-port-web.jpg"}],
            }
        )
        self.assertEqual(confirmed["status"], "media_confirmed")
        empty = MediaValidation(probe_ok).confirm_buffer_attachment({"status": "draft", "dueAt": None, "assets": []})
        self.assertFalse(empty["ok"])
        out = Path(self.tmp.name) / "intent.json"
        with contextlib.redirect_stdout(io.StringIO()):
            code = main(
                [
                    "prepare-draft",
                    "--db",
                    str(Path(self.tmp.name) / "cli.db"),
                    "--campaign",
                    "contractbot_eu",
                    "--channel",
                    "linkedin_inna",
                    "--brief",
                    "eu-law-venue",
                    "--out",
                    str(out),
                ],
                probe=probe_ok,
            )
        self.assertEqual(code, 0)
        intent = json.loads(out.read_text(encoding="utf-8"))
        wire = intent["createPost"]
        self.assertTrue(wire["saveToDraft"])
        self.assertNotIn("dueAt", wire)
        self.assertNotIn("idempotencyKey", wire)
        self.assertTrue(wire["assets"])
        self.assertNotIn("Pipeline check only", wire["text"])

    def test_open_pipeline_uses_the_checkpoint(self):
        buffer = MemoryBuffer()
        pipe = open_pipeline(Path(self.tmp.name) / "open.db", buffer, probe=probe_ok, clock=CLOCK)
        self.addCleanup(pipe.store.close)
        self.assertIn("6af0e14bd6bbae6fa10f1ce0", pipe.health()["known_drafts"])
        self.assertEqual(pipe.health()["modules"], ["content_production", "media_validation", "publishing_queue"])
        job = pipe.enqueue(campaign="contractbot_dk", channel="facebook_legal", brief="dk-inspection-en")
        pipe.process(job["id"])
        self.assertNotIn("Pipeline check only", buffer.calls[-1]["payload"]["text"])


if __name__ == "__main__":
    unittest.main()
