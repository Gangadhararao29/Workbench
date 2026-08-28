export type TimestampInputUnit =
  'auto' | 'seconds' | 'milliseconds' | 'microseconds' | 'nanoseconds' | 'iso' | 'relative';

export interface ParseResult {
  date: Date;
  detectedUnit:
    | 'auto'
    | 'seconds'
    | 'milliseconds'
    | 'microseconds'
    | 'nanoseconds'
    | 'iso'
    | 'relative'
    | 'custom-date';
  isValid: boolean;
  errorMessage?: string;
}

export interface TimezoneInfo {
  id: string;
  label: string;
  city: string;
  offsetFormatted: string; // e.g. UTC+05:30 or UTC-04:00
  offsetMinutes: number;
  formattedDateTime: string;
  isoString: string;
  isDst?: boolean;
}

export interface FormattedTimestampOutputs {
  unixSeconds: string;
  unixMilliseconds: string;
  unixMicroseconds: string;
  unixNanoseconds: string;
  isoUtc: string;
  isoLocal: string;
  utcString: string;
  rfc2822: string;
  localString: string;
  sqlUtc: string;
  sqlLocal: string;
  relativeTime: string;
  dayOfWeek: string;
  dayOfYear: number;
  totalDaysInYear: number;
  weekNumberIso: number;
  isLeapYear: boolean;
  timezoneName: string;
  utcOffset: string;
}

export interface DateDiffResult {
  totalMilliseconds: number;
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  totalDays: number;
  humanized: string;
  isPast: boolean;
}

export interface CodeSnippet {
  language: string;
  title: string;
  getTimestamp: string;
  parseTimestamp: string;
}

export const POPULAR_TIMEZONES: { id: string; label: string; city: string }[] = [
  { id: 'UTC', label: 'UTC / GMT (Coordinated Universal)', city: 'Universal' },
  { id: 'Europe/London', label: 'London, UK (GMT / BST)', city: 'London' },
  { id: 'America/New_York', label: 'New York (EST / EDT)', city: 'New York' },
  { id: 'America/Chicago', label: 'Chicago (CST / CDT)', city: 'Chicago' },
  { id: 'America/Denver', label: 'Denver (MST / MDT)', city: 'Denver' },
  { id: 'America/Los_Angeles', label: 'Los Angeles / SF (PST / PDT)', city: 'Los Angeles' },
  { id: 'America/Sao_Paulo', label: 'São Paulo (BRT)', city: 'São Paulo' },
  { id: 'Europe/Paris', label: 'Paris / Berlin (CET / CEST)', city: 'Paris' },
  { id: 'Europe/Athens', label: 'Athens / Cairo (EET / EEST)', city: 'Athens' },
  { id: 'Europe/Moscow', label: 'Moscow (MSK)', city: 'Moscow' },
  { id: 'Asia/Dubai', label: 'Dubai (GST)', city: 'Dubai' },
  { id: 'Asia/Kolkata', label: 'India Standard Time (IST)', city: 'New Delhi / Mumbai' },
  { id: 'Asia/Bangkok', label: 'Bangkok / Jakarta (ICT)', city: 'Bangkok' },
  { id: 'Asia/Singapore', label: 'Singapore / Hong Kong (SGT / HKT)', city: 'Singapore' },
  { id: 'Asia/Tokyo', label: 'Tokyo / Seoul (JST / KST)', city: 'Tokyo' },
  { id: 'Australia/Sydney', label: 'Sydney / Melbourne (AEST / AEDT)', city: 'Sydney' },
  { id: 'Pacific/Auckland', label: 'Auckland (NZST / NZDT)', city: 'Auckland' },
  { id: 'Pacific/Honolulu', label: 'Honolulu (HST)', city: 'Honolulu' },
];

/**
 * Parses user input into a Date object with smart auto-detection or specified unit.
 */
export function parseTimestampInput(input: string, unit: TimestampInputUnit = 'auto'): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      date: new Date(),
      detectedUnit: 'auto',
      isValid: false,
      errorMessage: 'Please enter a timestamp, date string, or relative keyword.',
    };
  }

  // 1. Relative keyword parser (now, today, yesterday, tomorrow, +2h, -30m, etc.)
  const relativeMatch = parseRelativeKeywords(trimmed);
  if (relativeMatch && (unit === 'auto' || unit === 'relative')) {
    return {
      date: relativeMatch,
      detectedUnit: 'relative',
      isValid: true,
    };
  }

  // 2. Pure Numeric String checking
  const isPureNumber = /^-?\d+(\.\d+)?$/.test(trimmed);

  if (unit === 'seconds' || (unit === 'auto' && isPureNumber && trimmed.length <= 11)) {
    const num = Number(trimmed);
    const date = new Date(num * 1000);
    if (!Number.isNaN(date.getTime())) {
      return { date, detectedUnit: 'seconds', isValid: true };
    }
  }

  if (
    unit === 'milliseconds' ||
    (unit === 'auto' && isPureNumber && trimmed.length > 11 && trimmed.length <= 14)
  ) {
    const num = Number(trimmed);
    const date = new Date(num);
    if (!Number.isNaN(date.getTime())) {
      return { date, detectedUnit: 'milliseconds', isValid: true };
    }
  }

  if (
    unit === 'microseconds' ||
    (unit === 'auto' && isPureNumber && trimmed.length > 14 && trimmed.length <= 17)
  ) {
    const num = Number(trimmed) / 1000;
    const date = new Date(num);
    if (!Number.isNaN(date.getTime())) {
      return { date, detectedUnit: 'microseconds', isValid: true };
    }
  }

  if (unit === 'nanoseconds' || (unit === 'auto' && isPureNumber && trimmed.length > 17)) {
    const num = Number(trimmed) / 1000000;
    const date = new Date(num);
    if (!Number.isNaN(date.getTime())) {
      return { date, detectedUnit: 'nanoseconds', isValid: true };
    }
  }

  // 3. Date string parser (ISO 8601, RFC 2822, YYYY-MM-DD, etc.)
  // Handle space separator in 'YYYY-MM-DD HH:mm:ss'
  let parseableStr = trimmed;
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}(:\d{2}(\.\d+)?)?/.test(trimmed)) {
    parseableStr = trimmed.replace(' ', 'T');
  }

  const parsedDate = new Date(parseableStr);
  if (!Number.isNaN(parsedDate.getTime())) {
    const isIso = /^\d{4}-\d{2}-\d{2}(T|\s)/i.test(trimmed);
    return {
      date: parsedDate,
      detectedUnit: isIso ? 'iso' : 'custom-date',
      isValid: true,
    };
  }

  // Fallback direct attempt with Number
  if (isPureNumber) {
    const num = Number(trimmed);
    // Determine reasonable epoch size
    const secDate = new Date(num * 1000);
    if (!Number.isNaN(secDate.getTime())) {
      return { date: secDate, detectedUnit: 'seconds', isValid: true };
    }
  }

  return {
    date: new Date(),
    detectedUnit: unit === 'auto' ? 'iso' : unit,
    isValid: false,
    errorMessage: `Unable to parse "${trimmed}" as a timestamp or valid date format.`,
  };
}

/**
 * Parses relative expressions like:
 * 'now', 'today', 'yesterday', 'tomorrow'
 * '+1h', '-2d', '+30m', '-5s', '+1w', '-1y', '+1M'
 * 'in 2 hours', '3 days ago', 'start of today', 'end of today'
 */
function parseRelativeKeywords(text: string): Date | null {
  const q = text.toLowerCase().trim();
  const now = new Date();

  if (q === 'now') return new Date();
  if (q === 'today' || q === 'start of today') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (q === 'end of today') {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }
  if (q === 'yesterday') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (q === 'tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (q === 'start of month') {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (q === 'start of year') {
    const d = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    return d;
  }

  // Short offset matching: +10s, -5m, +2h, -3d, +1w, +2M, -1y
  const shortRegex =
    /^([+-]?\d+)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?|d|days?|w|weeks?|M|months?|y|yr|years?)$/i;
  const shortMatch = q.match(shortRegex);
  if (shortMatch) {
    const amount = parseInt(shortMatch[1], 10);
    const unitChar = shortMatch[2].toLowerCase();
    const d = new Date(now.getTime());

    if (unitChar.startsWith('s')) d.setSeconds(d.getSeconds() + amount);
    else if (unitChar.startsWith('m') && !unitChar.startsWith('mo'))
      d.setMinutes(d.getMinutes() + amount);
    else if (unitChar.startsWith('h')) d.setHours(d.getHours() + amount);
    else if (unitChar.startsWith('d')) d.setDate(d.getDate() + amount);
    else if (unitChar.startsWith('w')) d.setDate(d.getDate() + amount * 7);
    else if (unitChar.startsWith('mo') || shortMatch[2] === 'M') d.setMonth(d.getMonth() + amount);
    else if (unitChar.startsWith('y')) d.setFullYear(d.getFullYear() + amount);

    return d;
  }

  // Natural language matching: "in 2 hours", "5 days ago", "10 minutes ago"
  const inRegex = /^in\s+(\d+)\s+(second|minute|hour|day|week|month|year)s?$/i;
  const inMatch = q.match(inRegex);
  if (inMatch) {
    const amount = parseInt(inMatch[1], 10);
    const u = inMatch[2].toLowerCase();
    const d = new Date(now.getTime());
    if (u === 'second') d.setSeconds(d.getSeconds() + amount);
    else if (u === 'minute') d.setMinutes(d.getMinutes() + amount);
    else if (u === 'hour') d.setHours(d.getHours() + amount);
    else if (u === 'day') d.setDate(d.getDate() + amount);
    else if (u === 'week') d.setDate(d.getDate() + amount * 7);
    else if (u === 'month') d.setMonth(d.getMonth() + amount);
    else if (u === 'year') d.setFullYear(d.getFullYear() + amount);
    return d;
  }

  const agoRegex = /^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i;
  const agoMatch = q.match(agoRegex);
  if (agoMatch) {
    const amount = -parseInt(agoMatch[1], 10);
    const u = agoMatch[2].toLowerCase();
    const d = new Date(now.getTime());
    if (u === 'second') d.setSeconds(d.getSeconds() + amount);
    else if (u === 'minute') d.setMinutes(d.getMinutes() + amount);
    else if (u === 'hour') d.setHours(d.getHours() + amount);
    else if (u === 'day') d.setDate(d.getDate() + amount);
    else if (u === 'week') d.setDate(d.getDate() + amount * 7);
    else if (u === 'month') d.setMonth(d.getMonth() + amount);
    else if (u === 'year') d.setFullYear(d.getFullYear() + amount);
    return d;
  }

  return null;
}

/**
 * Formats a Date object into various developer-focused representations.
 */
export function formatAllTimestampOutputs(date: Date): FormattedTimestampOutputs {
  const ms = date.getTime();
  const sec = Math.floor(ms / 1000);
  const us = `${sec}${String(ms % 1000).padStart(3, '0')}000`;
  const ns = `${sec}${String(ms % 1000).padStart(3, '0')}000000`;

  const isoUtc = date.toISOString();

  // Local ISO with offset
  const localIso = formatLocalIsoWithOffset(date);

  // UTC / GMT
  const utcString = date.toUTCString();

  // RFC 2822 format (e.g. "Fri, 28 Aug 2026 11:44:18 +0530")
  const rfc2822 = formatRfc2822(date);

  // Local String with Timezone
  const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  const utcOffset = getFormattedUtcOffset(date);
  const localString = `${date.toLocaleString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })} (${utcOffset}, ${timezoneName})`;

  // SQL Datetimes
  const sqlUtc = formatSqlDateTime(date, true);
  const sqlLocal = formatSqlDateTime(date, false);

  // Relative Time (e.g. 5 minutes ago, in 2 hours)
  const relativeTime = getHumanizedRelativeTime(date);

  // Calendar details
  const dayOfWeek = date.toLocaleDateString(undefined, { weekday: 'long' });
  const dayOfYear = getDayOfYear(date);
  const totalDaysInYear = isLeapYear(date.getFullYear()) ? 366 : 365;
  const weekNumberIso = getIsoWeekNumber(date);
  const leapYear = isLeapYear(date.getFullYear());

  return {
    unixSeconds: sec.toString(),
    unixMilliseconds: ms.toString(),
    unixMicroseconds: us,
    unixNanoseconds: ns,
    isoUtc,
    isoLocal: localIso,
    utcString,
    rfc2822,
    localString,
    sqlUtc,
    sqlLocal,
    relativeTime,
    dayOfWeek,
    dayOfYear,
    totalDaysInYear,
    weekNumberIso,
    isLeapYear: leapYear,
    timezoneName,
    utcOffset,
  };
}

/**
 * Returns formatted local ISO string with offset (e.g. 2026-08-28T11:44:18.000+05:30)
 */
export function formatLocalIsoWithOffset(date: Date): string {
  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const millis = pad(date.getMilliseconds(), 3);

  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMin);
  const offH = pad(Math.floor(absOffset / 60));
  const offM = pad(absOffset % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}${sign}${offH}:${offM}`;
}

/**
 * Returns RFC 2822 formatted string (e.g. Fri, 28 Aug 2026 11:44:18 +0530)
 */
export function formatRfc2822(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const pad = (n: number) => String(n).padStart(2, '0');

  const dayName = days[date.getDay()];
  const day = pad(date.getDate());
  const mon = months[date.getMonth()];
  const year = date.getFullYear();
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());

  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMin);
  const offH = pad(Math.floor(absOffset / 60));
  const offM = pad(absOffset % 60);

  return `${dayName}, ${day} ${mon} ${year} ${h}:${m}:${s} ${sign}${offH}${offM}`;
}

/**
 * Returns formatted SQL standard datetime (YYYY-MM-DD HH:MM:SS)
 */
export function formatSqlDateTime(date: Date, utc = false): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = utc ? date.getUTCFullYear() : date.getFullYear();
  const mo = pad((utc ? date.getUTCMonth() : date.getMonth()) + 1);
  const d = pad(utc ? date.getUTCDate() : date.getDate());
  const h = pad(utc ? date.getUTCHours() : date.getHours());
  const mi = pad(utc ? date.getUTCMinutes() : date.getMinutes());
  const s = pad(utc ? date.getUTCSeconds() : date.getSeconds());
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}

/**
 * Returns formatted UTC offset string (e.g. UTC+05:30, UTC-08:00, UTC+00:00)
 */
export function getFormattedUtcOffset(date: Date): string {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMin);
  const h = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const m = String(absOffset % 60).padStart(2, '0');
  return `UTC${sign}${h}:${m}`;
}

/**
 * Formats time relative to current moment.
 */
export function getHumanizedRelativeTime(date: Date, baseDate = new Date()): string {
  const diffMs = date.getTime() - baseDate.getTime();
  const isFuture = diffMs > 0;
  const absMs = Math.abs(diffMs);
  const absSec = Math.floor(absMs / 1000);
  const absMin = Math.floor(absSec / 60);
  const absHour = Math.floor(absMin / 60);
  const absDay = Math.floor(absHour / 24);

  if (absSec < 5) return 'Just now';

  let text = '';
  if (absSec < 60) text = `${absSec} second${absSec === 1 ? '' : 's'}`;
  else if (absMin < 60) text = `${absMin} minute${absMin === 1 ? '' : 's'}`;
  else if (absHour < 24) text = `${absHour} hour${absHour === 1 ? '' : 's'}`;
  else if (absDay < 30) text = `${absDay} day${absDay === 1 ? '' : 's'}`;
  else if (absDay < 365) {
    const months = Math.floor(absDay / 30);
    text = `${months} month${months === 1 ? '' : 's'}`;
  } else {
    const years = Math.floor(absDay / 365);
    text = `${years} year${years === 1 ? '' : 's'}`;
  }

  return isFuture ? `in ${text}` : `${text} ago`;
}

/**
 * Calculates Day of the Year (1..366)
 */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff =
    date.getTime() -
    start.getTime() +
    (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Checks if a given year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Computes ISO 8601 week number.
 */
export function getIsoWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Computes timezone representations for a given Date.
 */
export function getTimezoneConversions(date: Date, timezones = POPULAR_TIMEZONES): TimezoneInfo[] {
  return timezones.map((tz) => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz.id,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZoneName: 'shortOffset',
      });

      const parts = formatter.formatToParts(date);
      const tzOffsetPart = parts.find((p) => p.type === 'timeZoneName')?.value || '';

      const isoFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz.id,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      return {
        id: tz.id,
        label: tz.label,
        city: tz.city,
        offsetFormatted: tzOffsetPart.startsWith('GMT')
          ? tzOffsetPart.replace('GMT', 'UTC')
          : tzOffsetPart || 'UTC',
        offsetMinutes: 0,
        formattedDateTime: formatter.format(date),
        isoString: isoFormatter.format(date).replace(', ', 'T'),
      };
    } catch {
      return {
        id: tz.id,
        label: tz.label,
        city: tz.city,
        offsetFormatted: 'UTC',
        offsetMinutes: 0,
        formattedDateTime: date.toUTCString(),
        isoString: date.toISOString(),
      };
    }
  });
}

/**
 * Calculates date arithmetic (add / subtract values)
 */
export function applyDateArithmetic(
  date: Date,
  params: {
    years?: number;
    months?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
  },
): Date {
  const res = new Date(date.getTime());
  if (params.years) res.setFullYear(res.getFullYear() + params.years);
  if (params.months) res.setMonth(res.getMonth() + params.months);
  if (params.days) res.setDate(res.getDate() + params.days);
  if (params.hours) res.setHours(res.getHours() + params.hours);
  if (params.minutes) res.setMinutes(res.getMinutes() + params.minutes);
  if (params.seconds) res.setSeconds(res.getSeconds() + params.seconds);
  return res;
}

/**
 * Calculates exact duration / difference between two dates.
 */
export function calculateDateDifference(dateA: Date, dateB: Date): DateDiffResult {
  const diffMs = dateB.getTime() - dateA.getTime();
  const absMs = Math.abs(diffMs);
  const totalSeconds = Math.floor(absMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  const days = totalDays;
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return {
    totalMilliseconds: absMs,
    totalSeconds,
    totalMinutes,
    totalHours,
    totalDays,
    humanized: parts.join(' '),
    isPast: diffMs < 0,
  };
}

/**
 * Generates developer code snippets across popular languages.
 */
export function getDeveloperCodeSnippets(date: Date): CodeSnippet[] {
  const sec = Math.floor(date.getTime() / 1000);
  const ms = date.getTime();
  const iso = date.toISOString();

  return [
    {
      language: 'JavaScript / TypeScript',
      title: 'JavaScript / Node.js (Temporal)',
      getTimestamp: `// Requires a Temporal-supporting runtime, or the\n// polyfill: npm i @js-temporal/polyfill\n\n// Current instant (Temporal API)\nconst now = Temporal.Now.instant();\n\n// Unix timestamp in milliseconds / seconds\nconst timestampMs = now.epochMilliseconds;\nconst timestampSec = now.epochSeconds;\n\n// ISO 8601 string, ready to drop into a JSON payload\nconst isoString = now.toJSON(); // "${iso}"`,
      parseTimestamp: `// From Unix milliseconds\nconst instant = Temporal.Instant.fromEpochMilliseconds(${ms});\n\n// Parse an ISO 8601 string\nconst parsed = Temporal.Instant.from("${iso}");\n\n// Back to an ISO string for a payload\nconst isoString = instant.toJSON(); // "${iso}"\n\n// View in a specific timezone\nconst zoned = instant.toZonedDateTimeISO("UTC");`,
    },
    {
      language: 'C# / .NET',
      title: 'C# (.NET 6 / 7 / 8 / 9)',
      getTimestamp: `// Current Unix timestamp in seconds\nlong unixSec = DateTimeOffset.UtcNow.ToUnixTimeSeconds();\n\n// Current Unix timestamp in milliseconds\nlong unixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();`,
      parseTimestamp: `// From Unix seconds\nDateTimeOffset dtoSec = DateTimeOffset.FromUnixTimeSeconds(${sec});\nDateTime utcDate = dtoSec.UtcDateTime;\n\n// From Unix milliseconds\nDateTimeOffset dtoMs = DateTimeOffset.FromUnixTimeMilliseconds(${ms});\n\n// From ISO 8601 string\nDateTimeOffset parsed = DateTimeOffset.Parse("${iso}");`,
    },
    {
      language: 'Python',
      title: 'Python 3',
      getTimestamp: `import time\nfrom datetime import datetime, timezone\n\n# Current Unix timestamp (seconds as float / int)\nunix_sec = int(time.time())\n\n# Current UTC timestamp\nutc_now = datetime.now(timezone.utc)`,
      parseTimestamp: `from datetime import datetime, timezone\n\n# From Unix seconds to UTC datetime\ndt = datetime.fromtimestamp(${sec}, tz=timezone.utc)\nprint(dt.isoformat()) # ${iso}\n\n# From ISO 8601 string\nparsed_dt = datetime.fromisoformat("${iso}".replace("Z", "+00:00"))`,
    },
    {
      language: 'Go',
      title: 'Go (Golang)',
      getTimestamp: `package main\nimport (\n    "fmt"\n    "time"\n)\n\nfunc main() {\n    // Current Unix seconds & milliseconds\n    sec := time.Now().Unix()\n    ms := time.Now().UnixMilli()\n    fmt.Println(sec, ms)\n}`,
      parseTimestamp: `// From Unix seconds\nt := time.Unix(${sec}, 0).UTC()\nfmt.Println(t.Format(time.RFC3339)) // ${iso}\n\n// Parse ISO 8601 / RFC 3339\nparsed, err := time.Parse(time.RFC3339, "${iso}")`,
    },
    {
      language: 'Java',
      title: 'Java 8+ (java.time)',
      getTimestamp: `import java.time.Instant;\n\n// Current Unix timestamp in seconds\nlong unixSec = Instant.now().getEpochSecond();\n\n// Current Unix timestamp in milliseconds\nlong unixMs = Instant.now().toEpochMilli();`,
      parseTimestamp: `import java.time.Instant;\nimport java.time.ZoneOffset;\nimport java.time.ZonedDateTime;\n\n// From Unix seconds\nInstant instant = Instant.ofEpochSecond(${sec});\nZonedDateTime utcTime = instant.atZone(ZoneOffset.UTC);\n\n// From ISO 8601 string\nInstant parsed = Instant.parse("${iso}");`,
    },
    {
      language: 'SQL',
      title: 'SQL (PostgreSQL / MySQL / SQL Server / SQLite)',
      getTimestamp: `-- PostgreSQL\nSELECT EXTRACT(EPOCH FROM NOW());\n\n-- MySQL\nSELECT UNIX_TIMESTAMP();\n\n-- SQL Server\nSELECT DATEDIFF_BIG(SECOND, '1970-01-01 00:00:00', SYSUTCDATETIME());\n\n-- SQLite\nSELECT strftime('%s', 'now');`,
      parseTimestamp: `-- PostgreSQL (from seconds)\nSELECT to_timestamp(${sec});\n\n-- MySQL (from seconds)\nSELECT FROM_UNIXTIME(${sec});\n\n-- SQL Server (from seconds)\nSELECT DATEADD(SECOND, ${sec}, '1970-01-01 00:00:00');\n\n-- SQLite (from seconds)\nSELECT datetime(${sec}, 'unixepoch');`,
    },
    {
      language: 'PHP',
      title: 'PHP',
      getTimestamp: `// Current Unix timestamp in seconds\n$timestamp = time();\n\n// Current milliseconds\n$ms = round(microtime(true) * 1000);`,
      parseTimestamp: `// Convert Unix seconds to ISO / RFC 3339\n$date = date(DATE_ATOM, ${sec});\n\n// DateTime object from Unix timestamp\n$dt = new DateTime("@${sec}");\necho $dt->format(DateTime::RFC3339);`,
    },
    {
      language: 'Rust',
      title: 'Rust (std::time / chrono)',
      getTimestamp: `use std::time::{SystemTime, UNIX_EPOCH};\n\nlet now = SystemTime::now();\nlet sec = now.duration_since(UNIX_EPOCH).unwrap().as_secs();\nlet ms = now.duration_since(UNIX_EPOCH).unwrap().as_millis();`,
      parseTimestamp: `use chrono::{DateTime, Utc};\n\n// Using chrono crate\nlet dt = DateTime::from_timestamp(${sec}, 0).unwrap();\nprintln!("{}", dt.to_rfc3339()); // ${iso}`,
    },
    {
      language: 'Bash / Shell',
      title: 'Bash / Shell',
      getTimestamp: `# Current timestamp in seconds\ndate +%s\n\n# Current timestamp in milliseconds\ndate +%s%3N`,
      parseTimestamp: `# Convert seconds to UTC string (Linux)\ndate -u -d @${sec} +"%Y-%m-%dT%H:%M:%SZ"\n\n# Convert seconds to UTC string (macOS / BSD)\ndate -u -r ${sec} +"%Y-%m-%dT%H:%M:%SZ"`,
    },
  ];
}
