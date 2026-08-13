const BASE_POINTS = 10;
const MAX_CLEAN_BONUS = 10;
const STREAK_BONUS = 5;

export function computeAward(recoveryRatio: number, streakBonus: number): number {
  const cleanBonus = Math.round(Math.max(0, Math.min(1, recoveryRatio)) * MAX_CLEAN_BONUS);
  return BASE_POINTS + cleanBonus + streakBonus;
}

export interface StreakResult {
  streak: number;
  streakBonus: number;
}

function startOfDay(isoDate: string): Date {
  const d = new Date(isoDate);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function computeStreak(
  currentStreak: number,
  lastReceiptDate: string | null,
  receiptDate: string,
): StreakResult {
  const rd = startOfDay(receiptDate);
  const last = lastReceiptDate ? startOfDay(lastReceiptDate) : null;

  let streak: number;
  if (!last) {
    streak = 1;
  } else {
    const diffDays = Math.round((rd.getTime() - last.getTime()) / 86_400_000);
    if (diffDays === 0) {
      streak = currentStreak;
    } else if (diffDays === 1) {
      streak = currentStreak + 1;
    } else {
      streak = 1;
    }
  }

  return { streak, streakBonus: streak >= 2 ? STREAK_BONUS : 0 };
}
