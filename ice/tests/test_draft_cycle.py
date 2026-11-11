"""The draft cycle prepares five English business payloads and stops there."""

from __future__ import annotations

import unittest

from ice.draft_cycle import draft_jobs
from ice.library import week_packages


class DraftCycleTests(unittest.TestCase):
    def test_only_english_business_drafts_are_prepared(self):
        jobs = draft_jobs()
        ids = [item["job_id"] for item in jobs]
        self.assertEqual(
            ids,
            [
                "wk16-fca-incoterms-linkedin",
                "wk16-fca-incoterms-facebook",
                "wk16-saas-integration-linkedin",
                "wk16-eidas-signature-linkedin",
                "wk16-eidas-signature-facebook",
            ],
        )
        comedy = {item["id"] for item in week_packages() if not item["channels"]}
        self.assertTrue(comedy)
        self.assertTrue(all(item["package_id"] not in comedy for item in jobs))
        allowed = {"6a9d9227cd8b9c702c197a40", "6a9d9398cd8b9c702c1981cd"}
        for item in jobs:
            payload = item["payload"]
            self.assertTrue(payload["saveToDraft"])
            self.assertEqual(payload["schedulingType"], "automatic")
            self.assertEqual(payload["mode"], "addToQueue")
            self.assertNotIn("dueAt", payload)
            self.assertNotEqual(payload["mode"], "shareNow")
            self.assertEqual(len(payload["assets"]), 1)
            self.assertTrue(payload["assets"][0]["image"]["url"].startswith("https://"))
            self.assertIn("ICE-REF:" + item["job_id"], payload["text"])
            self.assertNotIn("Undervisning", payload["text"])
            self.assertIn(payload["channelId"], allowed)
            if payload["channelId"] == "6a9d9398cd8b9c702c1981cd":
                self.assertEqual(payload["metadata"]["facebook"]["type"], "post")
            else:
                self.assertEqual(payload["metadata"]["linkedin"], {})


if __name__ == "__main__":
    unittest.main()
