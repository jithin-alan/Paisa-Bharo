/**
 * Daily Streak & Timezone Utilities
 * Provides consistent date, timezone, and streak status calculation across the application.
 */

export const DAILY_REWARDS_MAP = [0, 20, 30, 45, 60, 80, 100, 150];

/**
 * Returns the detected user browser IANA timezone or 'UTC'
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Formats a date into YYYY-MM-DD in the given timezone (or user's local timezone)
 */
export function getTodayString(timezone?: string): string {
  const tz = timezone || getUserTimezone();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

/**
 * Calculates calendar day difference (dateStr2 - dateStr1) in integer days.
 * E.g., ('2026-11-10', '2026-11-11') => 1 day
 */
export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1 + 'T00:00:00Z');
  const d2 = new Date(dateStr2 + 'T00:00:00Z');
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export interface StreakStatus {
  effectiveStreak: number;
  isCheckedInToday: boolean;
  isStreakBroken: boolean;
  daysSinceLastCheckIn: number | null;
  currentCycleDay: number; // 0 to 7 (0 if broken or not started)
  nextRewardDay: number;   // 1 to 7
  nextRewardBonus: number; // coin reward for next claim
  todayString: string;
  userTimezone: string;
}

/**
 * Computes the real-time streak status for a user based on their last check-in date
 * and current calendar date in their timezone.
 */
export function calculateStreakStatus(
  lastCheckInDate?: string | null,
  streakDays?: number | null,
  timezone?: string
): StreakStatus {
  const userTimezone = timezone || getUserTimezone();
  const todayString = getTodayString(userTimezone);
  const storedStreak = streakDays || 0;

  if (!lastCheckInDate) {
    return {
      effectiveStreak: 0,
      isCheckedInToday: false,
      isStreakBroken: false,
      daysSinceLastCheckIn: null,
      currentCycleDay: 0,
      nextRewardDay: 1,
      nextRewardBonus: DAILY_REWARDS_MAP[1],
      todayString,
      userTimezone,
    };
  }

  const diffDays = getDaysDifference(lastCheckInDate, todayString);

  if (diffDays <= 0) {
    // Already claimed today (or later due to time travel/clock adjust)
    const effectiveStreak = Math.max(1, storedStreak);
    const currentCycleDay = ((effectiveStreak - 1) % 7) + 1;
    const nextRewardDay = (currentCycleDay % 7) + 1;
    return {
      effectiveStreak,
      isCheckedInToday: true,
      isStreakBroken: false,
      daysSinceLastCheckIn: 0,
      currentCycleDay,
      nextRewardDay,
      nextRewardBonus: DAILY_REWARDS_MAP[nextRewardDay],
      todayString,
      userTimezone,
    };
  }

  if (diffDays === 1) {
    // Claimed yesterday, waiting to claim today -> streak is active!
    const effectiveStreak = Math.max(1, storedStreak);
    const currentCycleDay = ((effectiveStreak - 1) % 7) + 1;
    const nextRewardDay = (currentCycleDay % 7) + 1;
    return {
      effectiveStreak,
      isCheckedInToday: false,
      isStreakBroken: false,
      daysSinceLastCheckIn: 1,
      currentCycleDay,
      nextRewardDay,
      nextRewardBonus: DAILY_REWARDS_MAP[nextRewardDay],
      todayString,
      userTimezone,
    };
  }

  // Missed yesterday (diffDays > 1) -> streak is broken!
  return {
    effectiveStreak: 0,
    isCheckedInToday: false,
    isStreakBroken: true,
    daysSinceLastCheckIn: diffDays,
    currentCycleDay: 0,
    nextRewardDay: 1,
    nextRewardBonus: DAILY_REWARDS_MAP[1],
    todayString,
    userTimezone,
  };
}
