"""The case library stays local. Buffer is not called and schedules do not move."""

from __future__ import annotations

import unittest

from ice.library import (
    SECTIONS,
    assess_package,
    build_index,
    prepare_buffer_draft,
    protected_post_ids,
    reconciliation,
    week_packages,
)
from ice.quality import schedule_changed


class LibraryTests(unittest.TestCase):
    def test_week_is_a_library_draft_and_does_not_call_buffer(self):
        index = build_index()
        self.assertEqual(tuple(index.keys()), SECTIONS)
        self.assertEqual(len(index["case_library"]), 5)
        self.assertEqual(index["published_analytics"], [])
        for package in week_packages():
            decision = prepare_buffer_draft(package)
            self.assertFalse(decision["buffer_called"])
            self.assertFalse(decision["may_schedule"])
            self.assertFalse(decision["may_publish"])
            self.assertIn("pending_owner_approval", decision["blockers"])
            self.assertIsNone(next(row["dueAt"] for row in index["publishing_calendar"] if row["package_id"] == package["id"]))

    def test_visual_package_without_media_cannot_become_a_draft(self):
        package = dict(week_packages()[0])
        package["approval_state"] = "approved_by_owner"
        package["media"] = {"url": None, "buffer_confirmed": False}
        decision = assess_package(package)
        self.assertIn("media_unverified", decision["blockers"])
        self.assertFalse(decision["may_create_buffer_draft"])

    def test_children_channels_and_missing_reels_channel_are_blocked(self):
        comedy = next(item for item in week_packages() if item["id"] == "wk16-comedy-unlimited-liability")
        decision = assess_package(comedy)
        self.assertIn("channel_not_connected", decision["blockers"])
        leaked = dict(comedy)
        leaked["channels"] = ["youtube_punk"]
        leaked["approval_state"] = "approved_by_owner"
        leaked["media"] = {"url": "https://cdn.example/card.png", "buffer_confirmed": True}
        blocked = assess_package(leaked)
        self.assertIn("channel_not_connected", blocked["blockers"])

    def test_danish_copy_needs_native_review_and_banned_words_fail(self):
        package = next(item for item in week_packages() if item["id"] == "wk16-fca-incoterms")
        danish = assess_package(package, "da")
        self.assertIn("native_review_required", danish["blockers"])
        tainted = dict(package)
        tainted["texts"] = {"en": package["texts"]["en"] + "\nwww.contractbot.eu Premium"}
        tainted["approval_state"] = "approved_by_owner"
        tainted["media"] = {"url": "https://cdn.example/card.png", "buffer_confirmed": True}
        errors = assess_package(tainted)["blockers"]
        self.assertIn("banned:www.contractbot.eu", errors)
        self.assertIn("banned:premium", errors)

    def test_existing_buffer_rows_are_not_a_schedule_change(self):
        report = reconciliation()
        before = [
            {"id": item["id"], "channelId": item["channel_id"], "status": "scheduled", "dueAt": item["dueAt"], "shareMode": "schedule", "assets": []}
            for item in report["scheduled_missing_media"]
        ]
        self.assertEqual(schedule_changed(before, before), [])
        self.assertEqual(len(report["contract_drama_scheduled"]), 5)
        self.assertTrue(all(item["assets"] == 1 for item in report["contract_drama_scheduled"]))
        protected = protected_post_ids()
        self.assertIn("6af0b0a2229bf05dafc57a23", protected)
        self.assertIn("6aef7962d6bbae6fa1a777d8", protected)
        for package in week_packages():
            self.assertNotIn(package["id"], protected)

    def test_eligible_package_still_does_not_write_to_buffer(self):
        package = {
            "id": "wk16-local-only",
            "scenario_kind": "educational",
            "approval_state": "approved_by_owner",
            "channels": ["linkedin_inna"],
            "visual": True,
            "media": {"url": "https://cdn.example/card.png", "buffer_confirmed": True},
            "texts": {"en": "Educational scenario.\n\nInna Kragh\nM.Sc. in International Law · International Legal & EU Compliance Expert\n"},
        }
        decision = prepare_buffer_draft(package)
        self.assertTrue(decision["may_create_buffer_draft"])
        self.assertFalse(decision["buffer_called"])
        self.assertFalse(decision["may_schedule"])
        self.assertFalse(decision["may_publish"])


if __name__ == "__main__":
    unittest.main()
