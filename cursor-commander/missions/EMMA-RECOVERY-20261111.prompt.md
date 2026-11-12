**EMMA RECOVERY — EXECUTE ON MAC ONLY**

Before any recovery work:

1. Confirm `uname -s` is `Darwin` and this run's `privateWorkerId` is `d9254d28-f188-40bb-bd12-e5dd1104add2` (worker `inna-mac`).
2. Verify `/Applications/Inna Audiobook.app` and `~/Developer/emma-mystical-stories/` exist.
3. If execution is Linux or `privateWorkerId` is null, stop immediately.

When Mac execution is confirmed:

4. Inspect the application, project files, and existing checkpoints under `~/Developer/emma-mystical-stories/.cursor-checkpoints/`.
5. Recover prior work without overwriting originals (compare sizes and mtimes; copy into a dated checkpoint folder first).
6. Create or update the local checkpoint only after verifying the actual files.
7. Copy verified non-publishable manuscripts and audio into `inna-ai-backend/private/emma-recovery-backup/` on a branch, commit, and push to the private GitHub repo — never publish that content publicly.
8. Return verified file counts, application version, checkpoint location, backup commit SHA, and remaining blockers.

Mission id: `EMMA-RECOVERY-20261111`
