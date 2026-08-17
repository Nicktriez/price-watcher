// Pure receipt-recovery policy for the worker (Task 038v). Kept dependency-free
// so the no-loop/stuck-state rules are unit-testable without the `~` alias or DB.

export const MAX_RECEIPT_RETRIES = 3;

export type RecoveryDecision = "leave" | "reset-to-pending" | "mark-failed";

export interface RecoveryInput {
  /** true when the row's status is `processing` */
  isProcessing: boolean;
  /**
   * true when the receipt's last heartbeat (`updated_at`) is older than the
   * staleness threshold — i.e. the worker that claimed it looks genuinely dead,
   * NOT merely slow (a live worker heartbeats every `RECEIPT_HEARTBEAT_MS`).
   */
  stale: boolean;
  /** how many times this receipt has already been resurrected from a stale claim */
  retryCount: number;
  maxRetries: number;
}

export function decideReceiptRecovery(input: RecoveryInput): RecoveryDecision {
  if (!input.isProcessing || !input.stale) return "leave";
  if (input.retryCount >= input.maxRetries) return "mark-failed";
  return "reset-to-pending";
}
