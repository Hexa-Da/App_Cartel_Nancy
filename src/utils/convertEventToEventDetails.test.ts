import { describe, it, expect } from 'vitest';
import { mapEventsTabRowToEventDetails } from './convertEventToEventDetails';

const baseRow = {
  id: 'evt-1',
  name: 'Final',
  date: '2026-04-08T18:30:00.000Z',
  description: '',
  address: 'Stade',
  location: [48.69, 6.18] as [number, number],
  type: 'match' as const,
  isPassed: false,
};

describe('mapEventsTabRowToEventDetails', () => {
  it('maps match row with teams and id', () => {
    const r = mapEventsTabRowToEventDetails({
      ...baseRow,
      teams: 'A vs B',
    });
    expect(r.id).toBe('evt-1');
    expect(r.type).toBe('match');
    expect(r.name).toBe('A vs B');
    expect(r.date).toBe('2026-04-08');
    expect(r.color).toBe('#4CAF50');
  });

  it('maps party row', () => {
    const r = mapEventsTabRowToEventDetails({
      ...baseRow,
      type: 'party',
      name: 'Soirée',
    });
    expect(r.type).toBe('party');
    expect(r.name).toBe('Soirée');
    expect(r.color).toBe('#9C27B0');
  });
});
