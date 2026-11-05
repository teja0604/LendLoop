/**
 * Date validation and availability overlap engine for LendLoop.
 * Uses ISO date-only format (YYYY-MM-DD) and half-open intervals [startDate, endDate).
 */

/**
 * Validates whether a string is a legitimate calendar date in YYYY-MM-DD format.
 * Validates month limits, actual days per month, and leap years.
 */
export function isValidIsoDate(dateStr: string): boolean {
  if (typeof dateStr !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  const isLeapYear =
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  if (day > daysInMonth[month - 1]) return false;

  return true;
}

/**
 * Returns today's UTC calendar date string in YYYY-MM-DD format.
 */
export function getTodayUtcDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Validates a borrowing date range.
 * - Both dates must be valid ISO calendar dates.
 * - Start date must not be in the past (using UTC calendar day).
 * - End date must be strictly after start date.
 */
export function validateBorrowingDateRange(
  startDate: string,
  endDate: string
): { isValid: boolean; error?: string } {
  if (!isValidIsoDate(startDate)) {
    return {
      isValid: false,
      error: `Invalid start date: "${startDate}". Must be a valid YYYY-MM-DD calendar date.`,
    };
  }

  if (!isValidIsoDate(endDate)) {
    return {
      isValid: false,
      error: `Invalid end date: "${endDate}". Must be a valid YYYY-MM-DD calendar date.`,
    };
  }

  const today = getTodayUtcDateString();
  if (startDate < today) {
    return {
      isValid: false,
      error: `Start date "${startDate}" cannot be in the past (today is ${today}).`,
    };
  }

  if (endDate <= startDate) {
    return {
      isValid: false,
      error: `End date "${endDate}" must be later than start date "${startDate}".`,
    };
  }

  return { isValid: true };
}

/**
 * Determines whether two half-open intervals [aStart, aEnd) and [bStart, bEnd) overlap.
 * Overlap condition: aStart < bEnd && bStart < aEnd.
 * Adjacent intervals ([10, 15) and [15, 18)) do NOT overlap.
 */
export function doIntervalsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Determines whether an active loan is overdue.
 * In the half-open interval model [startDate, dueDate), dueDate is the exclusive return boundary.
 * An active loan becomes overdue on the exclusive due-date boundary (dueDate <= today).
 */
export function isOverdue(dueDate: string, today = getTodayUtcDateString()): boolean {
  return dueDate <= today;
}
