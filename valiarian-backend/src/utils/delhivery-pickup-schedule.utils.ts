const INDIA_TIME_ZONE = 'Asia/Kolkata';

function indiaDateTimeParts(now: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
} {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
  };
}

function formatUtcCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Delhivery same-day pickup is allowed only before 14:00 India time.
 * At 14:00 or later, the earliest pickup date is the next calendar day.
 */
export function earliestDelhiveryPickupDate(
  now = new Date(),
  cutoffHour = 14,
): string {
  const india = indiaDateTimeParts(now);
  const calendarDate = new Date(Date.UTC(india.year, india.month - 1, india.day));
  if (india.hour >= cutoffHour) calendarDate.setUTCDate(calendarDate.getUTCDate() + 1);
  return formatUtcCalendarDate(calendarDate);
}

export function delhiveryPickupDate(
  value: string,
): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
