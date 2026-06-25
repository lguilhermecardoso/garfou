/**
 * Computes whether a restaurant should be considered open right now based on
 * its weekly OperatingHours rows, evaluated in America/Sao_Paulo (BRT).
 */

export interface OperatingHourRule {
  dayOfWeek: number; // 0=Sun .. 6=Sat
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
  isClosed: boolean;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function nowInBrt(): { dayOfWeek: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  return { dayOfWeek: WEEKDAY_INDEX[weekday] ?? 0, minutes: hour * 60 + minute };
}

/**
 * Returns true if `now` falls within the given rule's range, accounting for
 * ranges that cross midnight (e.g. 22:00–02:00).
 */
function ruleCoversNow(rule: OperatingHourRule, nowMinutes: number, isToday: boolean): boolean {
  if (rule.isClosed) return false;
  const open = toMinutes(rule.openTime);
  const close = toMinutes(rule.closeTime);

  if (close > open) {
    return isToday && nowMinutes >= open && nowMinutes < close;
  }
  // Overnight range: only relevant "today" from open onward, or "yesterday"
  // bleeding into today before close.
  return isToday ? nowMinutes >= open : nowMinutes < close;
}

/** No rules configured means no schedule restriction — treated as open. */
export function isStoreOpenNow(hours: OperatingHourRule[]): boolean {
  if (!hours || hours.length === 0) return true;

  const { dayOfWeek, minutes } = nowInBrt();
  const yesterday = (dayOfWeek + 6) % 7;

  const todayRule = hours.find((h) => h.dayOfWeek === dayOfWeek);
  if (todayRule && ruleCoversNow(todayRule, minutes, true)) return true;

  const yesterdayRule = hours.find((h) => h.dayOfWeek === yesterday);
  if (yesterdayRule && ruleCoversNow(yesterdayRule, minutes, false)) return true;

  return false;
}

/**
 * Combines the manual `isOpen` switch with the automatic weekly schedule.
 * When `autoHours` is enabled, `isOpen` acts as a manual "pause" override —
 * it can force the store closed, but cannot force it open outside hours.
 */
export function getEffectiveIsOpen(
  isOpen: boolean,
  autoHours: boolean,
  hours: OperatingHourRule[]
): boolean {
  if (!autoHours) return isOpen;
  return isOpen && isStoreOpenNow(hours);
}
