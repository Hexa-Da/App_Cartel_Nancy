import { describe, it, expect } from 'vitest';
import { formatLocalTimeHM } from './formatLocalTime';

describe('formatLocalTimeHM', () => {
  it('returns empty string for invalid input', () => {
    expect(formatLocalTimeHM('not-a-date')).toBe('');
  });

  it('formats ISO string to HH:mm in local timezone', () => {
    const s = '2026-04-08T14:05:00.000Z';
    const d = new Date(s);
    const expected = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    expect(formatLocalTimeHM(s)).toBe(expected);
  });
});
