const WEEKDAY_MAP = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Returns current day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * and minutes elapsed from midnight in Asia/Kolkata (IST).
 *
 * @param {Date} [date=new Date()]
 * @returns {{ dayOfWeek: number, minutesNow: number }}
 */
export function getTodayIST(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  let weekdayStr = 'Sun';
  let hour = 0;
  let minute = 0;

  for (const part of parts) {
    if (part.type === 'weekday') {
      weekdayStr = part.value;
    } else if (part.type === 'hour') {
      hour = parseInt(part.value, 10);
    } else if (part.type === 'minute') {
      minute = parseInt(part.value, 10);
    }
  }

  const dayOfWeek = WEEKDAY_MAP[weekdayStr] ?? 0;
  const minutesNow = hour * 60 + minute;

  return { dayOfWeek, minutesNow };
}

/**
 * Converts a "HH:mm" string into minutes from midnight.
 * e.g., "16:30" -> 990
 *
 * @param {string} timeStr
 * @returns {number}
 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Determines whether a student can join a specific class slot.
 * Join opens 10 minutes before start time and closes at end time on the slot's day of week.
 *
 * @param {{ dayOfWeek: number, startTime: string, endTime: string }} slot
 * @param {number} currentDay
 * @param {number} currentMin
 * @returns {boolean}
 */
export function isSlotJoinable(slot, currentDay, currentMin) {
  if (!slot || slot.dayOfWeek !== currentDay) return false;
  const start = timeToMinutes(slot.startTime);
  const end = timeToMinutes(slot.endTime);
  return currentMin >= start - 10 && currentMin <= end;
}

/**
 * Checks if any slot in a batch's schedule is currently joinable.
 *
 * @param {Array<{ dayOfWeek: number, startTime: string, endTime: string }>} schedule
 * @param {number} currentDay
 * @param {number} currentMin
 * @returns {boolean}
 */
export function isBatchJoinable(schedule, currentDay, currentMin) {
  if (!Array.isArray(schedule) || schedule.length === 0) return false;
  return schedule.some((slot) => isSlotJoinable(slot, currentDay, currentMin));
}

/**
 * Finds the nearest class slot after current time, wrapping to future days of the week.
 *
 * @param {Array<{ dayOfWeek: number, startTime: string, endTime: string }>} schedule
 * @param {number} currentDay
 * @param {number} currentMin
 * @returns {{ dayOfWeek: number, startTime: string, endTime: string } | null}
 */
export function getNextClass(schedule, currentDay, currentMin) {
  if (!Array.isArray(schedule) || schedule.length === 0) return null;

  let nearestSlot = null;
  let minDelta = Infinity;

  for (const slot of schedule) {
    if (!slot || slot.dayOfWeek === undefined || !slot.startTime) continue;

    const slotStartMin = timeToMinutes(slot.startTime);
    const dayDiff = (slot.dayOfWeek - currentDay + 7) % 7;
    let delta;

    if (dayDiff === 0) {
      if (slotStartMin >= currentMin) {
        delta = slotStartMin - currentMin;
      } else {
        // Already started today, next occurrence is 7 days away
        delta = 7 * 24 * 60 + (slotStartMin - currentMin);
      }
    } else {
      delta = dayDiff * 24 * 60 + (slotStartMin - currentMin);
    }

    if (delta < minDelta) {
      minDelta = delta;
      nearestSlot = slot;
    }
  }

  return nearestSlot;
}
