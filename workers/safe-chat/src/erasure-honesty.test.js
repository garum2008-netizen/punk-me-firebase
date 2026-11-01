import { describe, it, expect } from "vitest";
import { erasureBatchStartIndex } from "./erasure.js";
import { mapBatchToJobStatus, erasureJobMayDeleteFromBatch } from "./erasure-jobs.js";

describe("erasure honesty: mapBatchToJobStatus stays queued when allOwnRemaining is unknown", () => {
  it("returns queued when complete flag set but allOwnRemaining is null", () => {
    expect(
      mapBatchToJobStatus({
        ok: true,
        complete: true,
        allOwnRemaining: null,
        remainingDeletable: 0
      })
    ).toBe("queued");
  });

  it("returns queued when complete flag set but allOwnRemaining > 0", () => {
    expect(
      mapBatchToJobStatus({
        ok: true,
        complete: true,
        allOwnRemaining: 3,
        remainingDeletable: 0
      })
    ).toBe("queued");
  });

  it("returns complete only with zero tallies", () => {
    expect(
      mapBatchToJobStatus({
        ok: true,
        complete: true,
        allOwnRemaining: 0,
        remainingDeletable: 0
      })
    ).toBe("complete");
  });
});

describe("erasure honesty: erasureJobMayDeleteFromBatch requires batch.complete true", () => {
  it("refuses delete when mapBatch says complete but batch.complete is false", () => {
    expect(
      erasureJobMayDeleteFromBatch({
        ok: true,
        complete: false,
        allOwnRemaining: 0,
        remainingDeletable: 0
      })
    ).toBe(false);
  });

  it("allows delete when batch and tallies are honest", () => {
    expect(
      erasureJobMayDeleteFromBatch({
        ok: true,
        complete: true,
        allOwnRemaining: 0,
        remainingDeletable: 0
      })
    ).toBe(true);
  });
});

describe("erasure honesty: erasureBatchStartIndex resumes at cursor without skipping earlier ids incorrectly", () => {
  it("starts at cursor id position in sorted entries", () => {
    const entries = [
      ["a", {}],
      ["b", {}],
      ["c", {}]
    ];
    expect(erasureBatchStartIndex(entries, "c")).toBe(2);
    expect(erasureBatchStartIndex(entries, "a")).toBe(0);
    expect(erasureBatchStartIndex(entries, null)).toBe(0);
  });

  it("does not use skip-until-cursor semantics that leave index 0 when cursor is later", () => {
    const entries = [
      ["m1", {}],
      ["m2", {}],
      ["m3", {}]
    ];
    const start = erasureBatchStartIndex(entries, "m3");
    expect(start).toBe(2);
    expect(entries[start][0]).toBe("m3");
  });
});
