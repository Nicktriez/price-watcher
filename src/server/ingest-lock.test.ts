import { describe, expect, it } from "vite-plus/test";
import { createRunLock, isSchedulerEnabled } from "./ingest-lock.ts";

describe("isSchedulerEnabled", () => {
  it("is enabled by default", () => {
    expect(isSchedulerEnabled({})).toBe(true);
  });

  it("is disabled when DISABLE_INGEST_SCHEDULER=1", () => {
    expect(isSchedulerEnabled({ DISABLE_INGEST_SCHEDULER: "1" })).toBe(false);
  });

  it("is enabled for any other value", () => {
    expect(isSchedulerEnabled({ DISABLE_INGEST_SCHEDULER: "0" })).toBe(true);
    expect(isSchedulerEnabled({ DISABLE_INGEST_SCHEDULER: "true" })).toBe(true);
  });
});

describe("createRunLock", () => {
  it("acquires once, rejects overlap, and can be reused after release", () => {
    const lock = createRunLock();
    expect(lock.tryAcquire()).toBe(true);
    expect(lock.tryAcquire()).toBe(false);
    lock.release();
    expect(lock.tryAcquire()).toBe(true);
  });
});
