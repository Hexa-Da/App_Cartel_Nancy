import type { Venue, Match } from '../types';

/** Venue editor state — canonical shape for FormContext and AppPanels facade */
export interface IEditingVenueState {
  id: string | null;
  venue: Venue | null;
}

/** Match editor state — canonical shape for FormContext and AppPanels facade */
export interface IEditingMatchState {
  venueId: string | null;
  match: Match | null;
}
