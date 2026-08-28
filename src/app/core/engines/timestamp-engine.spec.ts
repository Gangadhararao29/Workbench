import { describe, it, expect } from 'vitest';
import {
  parseTimestampInput,
  formatAllTimestampOutputs,
  formatLocalIsoWithOffset,
  formatRfc2822,
  formatSqlDateTime,
  getFormattedUtcOffset,
  getHumanizedRelativeTime,
  getDayOfYear,
  isLeapYear,
  getIsoWeekNumber,
  getTimezoneConversions,
  applyDateArithmetic,
  calculateDateDifference,
  getDeveloperCodeSnippets,
} from './timestamp-engine';

describe('timestamp-engine', () => {
  it('parses unix seconds string', () => {
    const res = parseTimestampInput('1724825600', 'seconds');
    expect(res.isValid).toBe(true);
    expect(res.detectedUnit).toBe('seconds');
    expect(Math.floor(res.date.getTime() / 1000)).toBe(1724825600);
  });

  it('auto-detects unix seconds and milliseconds', () => {
    const resSec = parseTimestampInput('1724825600');
    expect(resSec.isValid).toBe(true);
    expect(resSec.detectedUnit).toBe('seconds');

    const resMs = parseTimestampInput('1724825600000');
    expect(resMs.isValid).toBe(true);
    expect(resMs.detectedUnit).toBe('milliseconds');
  });

  it('parses ISO 8601 strings', () => {
    const res = parseTimestampInput('2026-08-28T11:44:18.000Z');
    expect(res.isValid).toBe(true);
    expect(res.detectedUnit).toBe('iso');
    expect(res.date.toISOString()).toBe('2026-08-28T11:44:18.000Z');
  });

  it('parses space-separated standard datetime strings', () => {
    const res = parseTimestampInput('2026-08-28 11:44:18');
    expect(res.isValid).toBe(true);
  });

  it('parses relative keywords like "now", "+2h", "-1d"', () => {
    const resNow = parseTimestampInput('now');
    expect(resNow.isValid).toBe(true);
    expect(resNow.detectedUnit).toBe('relative');

    const resOffset = parseTimestampInput('+2h');
    expect(resOffset.isValid).toBe(true);
    expect(resOffset.detectedUnit).toBe('relative');
    const diff = resOffset.date.getTime() - Date.now();
    expect(Math.round(diff / (1000 * 60 * 60))).toBe(2);
  });

  it('handles invalid inputs gracefully', () => {
    const res = parseTimestampInput('invalid-nonsense-xyz');
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toBeDefined();
  });

  it('formats all developer timestamp outputs correctly', () => {
    const testDate = new Date('2026-08-28T06:14:18.000Z');
    const outputs = formatAllTimestampOutputs(testDate);
    expect(outputs.isoUtc).toBe('2026-08-28T06:14:18.000Z');
    expect(outputs.unixSeconds).toBe(Math.floor(testDate.getTime() / 1000).toString());
    expect(outputs.unixMilliseconds).toBe(testDate.getTime().toString());
    expect(outputs.sqlUtc).toBe('2026-08-28 06:14:18');
    expect(outputs.dayOfWeek).toBeDefined();
    expect(outputs.totalDaysInYear).toBe(365);
    expect(outputs.isLeapYear).toBe(false);
  });

  it('computes leap years accurately', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
  });

  it('calculates timezone conversions', () => {
    const testDate = new Date('2026-08-28T06:14:18.000Z');
    const tzList = getTimezoneConversions(testDate);
    expect(tzList.length).toBeGreaterThan(5);
    const utc = tzList.find((t) => t.id === 'UTC');
    expect(utc).toBeDefined();
  });

  it('applies date arithmetic', () => {
    const base = new Date('2026-08-28T06:00:00.000Z');
    const result = applyDateArithmetic(base, { days: 2, hours: 3 });
    expect(result.toISOString()).toBe('2026-08-30T09:00:00.000Z');
  });

  it('calculates date difference', () => {
    const a = new Date('2026-08-28T06:00:00.000Z');
    const b = new Date('2026-08-29T08:30:15.000Z');
    const diff = calculateDateDifference(a, b);
    expect(diff.totalDays).toBe(1);
    expect(diff.humanized).toBe('1d 2h 30m 15s');
    expect(diff.isPast).toBe(false);
  });

  it('generates multi-language code snippets', () => {
    const testDate = new Date('2026-08-28T06:14:18.000Z');
    const snippets = getDeveloperCodeSnippets(testDate);
    expect(snippets.length).toBeGreaterThanOrEqual(8);
    const csharp = snippets.find((s) => s.language === 'C# / .NET');
    expect(csharp).toBeDefined();
    expect(csharp?.parseTimestamp).toContain('DateTimeOffset.FromUnixTimeSeconds');
  });
});
