export interface ReceiptFingerprint {
  userId: string;
  storeName: string | null;
  receiptDate: string | null;
  total: number | null;
  itemCount: number;
}

export function receiptFingerprint(fp: ReceiptFingerprint): string {
  return [
    fp.userId,
    (fp.storeName ?? "").toLowerCase(),
    fp.receiptDate ?? "",
    fp.total ?? "",
    fp.itemCount,
  ].join("|");
}

export type DedupDecision = "new" | "replace" | "keep" | "duplicate";

export interface DedupComparison {
  existingCleanCount: number;
  incomingCleanCount: number;
  existingItemCount: number;
  incomingItemCount: number;
}

export function decideDedup(comparison: DedupComparison): DedupDecision {
  if (comparison.incomingCleanCount > comparison.existingCleanCount) return "replace";
  if (comparison.incomingCleanCount < comparison.existingCleanCount) return "keep";
  if (comparison.incomingItemCount === comparison.existingItemCount) return "duplicate";
  return "keep";
}
