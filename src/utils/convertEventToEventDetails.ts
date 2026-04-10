import type { Event as EventDetailsEvent } from '../components/EventDetails';
import { formatLocalTimeHM } from './formatLocalTime';

/** Single source of truth for the EventsTab list row shape */
export interface IEventsTabRow {
  id: string;
  name: string;
  date: string;
  endTime?: string;
  description: string;
  address: string;
  location: [number, number];
  type: 'match' | 'party';
  teams?: string;
  venue?: string;
  venueId?: string;
  isPassed: boolean;
  sport?: string;
  result?: string;
}

export const mapEventsTabRowToEventDetails = (event: IEventsTabRow): EventDetailsEvent => {
  const dateOnly = typeof event.date === 'string' ? event.date.split('T')[0] : '';

  return {
    id: event.id,
    type: event.type,
    time: formatLocalTimeHM(event.date),
    endTime: event.endTime ? formatLocalTimeHM(event.endTime) : undefined,
    date: dateOnly,
    name: event.type === 'match' ? (event.teams || event.name) : event.name,
    teams: event.teams,
    description: event.description,
    color: event.type === 'party' ? '#9C27B0' : '#4CAF50',
    sport: event.sport,
    venue: event.venue || event.address,
    result: event.result,
    partyVenueId: event.type === 'party' ? event.venueId : undefined
  };
};
