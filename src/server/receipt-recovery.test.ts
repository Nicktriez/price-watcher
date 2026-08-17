import { describe, expect, it } from "vite-plus/test";
import { decideReceiptRecovery, MAX_RECEIPT_RETRIES } from "./receipt-recovery.ts";

describe("decideReceiptRecovery", () => {
  it("leaves a non-processing receipt alone", () => {
    expect(
      decideReceiptRecovery({
        isProcessing: false,
        stale: true,
        retryCount: 0,
        maxRetries: MAX_RECEIPT_RETRIES,
      }),
    ).toBe("leave");
  });

  it("leaves a processing receipt whose heartbeat is fresh (slow OCR, NOT dead — the 038v no-loop case)", () => {
    // A slow-but-alive OCR (>10 min) heartbeats updated_at, so it is NOT stale.
    expect(
      decideReceiptRecovery({
        isProcessing: true,
        stale: false,
        retryCount: 0,
        maxRetries: MAX_RECEIPT_RETRIES,
      }),
    ).toBe("leave");
  });

  it("resets a genuinely-dead claim to pending when retries remain (038s orphan recovery preserved)", () => {
    expect(
      decideReceiptRecovery({
        isProcessing: true,
        stale: true,
        retryCount: 0,
        maxRetries: MAX_RECEIPT_RETRIES,
      }),
    ).toBe("reset-to-pending");
  });

  it("marks a receipt failed once it has been resurrected the max number of times (retry cap, bounded)", () => {
    expect(
      decideReceiptRecovery({
        isProcessing: true,
        stale: true,
        retryCount: MAX_RECEIPT_RETRIES,
        maxRetries: MAX_RECEIPT_RETRIES,
      }),
    ).toBe("mark-failed");
    expect(
      decideReceiptRecovery({
        isProcessing: true,
        stale: true,
        retryCount: MAX_RECEIPT_RETRIES + 1,
        maxRetries: MAX_RECEIPT_RETRIES,
      }),
    ).toBe("mark-failed");
  });

  it("allows the final retry before capping (retryCount == maxRetries - 1 still resets)", () => {
    expect(
      decideReceiptRecovery({
        isProcessing: true,
        stale: true,
        retryCount: MAX_RECEIPT_RETRIES - 1,
        maxRetries: MAX_RECEIPT_RETRIES,
      }),
    ).toBe("reset-to-pending");
  });
});
