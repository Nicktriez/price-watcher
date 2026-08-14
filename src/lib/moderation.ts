export type FlagReason = "wrong-price" | "spam" | "other";

export const FLAG_HIDE_THRESHOLD = 3; // distinct flaggers to hide a report
export const FLAG_MUTE_THRESHOLD = 2; // flag-hidden reports before the reporter is auto-muted
export const CROWD_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // single + unverified expiry

export const FLAG_REASONS: { value: FlagReason; label: string }[] = [
  { value: "wrong-price", label: "Wrong price" },
  { value: "spam", label: "Spam / fake" },
  { value: "other", label: "Other" },
];

/**
 * Anti-gaming guard (parity with Task 030's distinct-user rule): a price is
 * demoted only after N DISTINCT flaggers — one user flagging repeatedly
 * counts as one flag, never COUNT(*).
 */
export function distinctFlaggers(flags: { flaggerUserId: string }[]): number {
  return new Set(flags.map((f) => f.flaggerUserId)).size;
}

export function isFlagHidden(flags: { flaggerUserId: string }[]): boolean {
  return distinctFlaggers(flags) >= FLAG_HIDE_THRESHOLD;
}

/** A reporter is auto-muted once enough of their reports were flag-hidden. */
export function shouldAutoMute(hiddenReportCount: number): boolean {
  return hiddenReportCount >= FLAG_MUTE_THRESHOLD;
}

/** A Single (unverified) report older than the expiry window is expired. */
export function isExpiredSingle(
  reportedAt: string | Date,
  tier: "single" | "community" | null,
  now: Date = new Date(),
): boolean {
  if (tier !== "single") return false;
  return now.getTime() - new Date(reportedAt).getTime() > CROWD_EXPIRY_MS;
}
