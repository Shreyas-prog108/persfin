import { FinanceError } from "./errors";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since Unix epoch for a valid civil date, using UTC so time zones cannot shift the day. */
export function utcDayNumber(isoDate: string): number {
  const match = ISO_DATE.exec(isoDate);
  if (!match) {
    throw new FinanceError("Dates must use the YYYY-MM-DD format.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const check = new Date(timestamp);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new FinanceError(`${isoDate} is not a real calendar date.`);
  }
  return timestamp / 86_400_000;
}

export function daysBetween(startIso: string, endIso: string): number {
  return utcDayNumber(endIso) - utcDayNumber(startIso);
}

/** Actual days divided by 365. This matches the day-count basis used by the XIRR solver. */
export function yearFraction365(startIso: string, endIso: string): number {
  const days = daysBetween(startIso, endIso);
  if (days <= 0) {
    throw new FinanceError("The end date must be after the start date.");
  }
  return days / 365;
}
