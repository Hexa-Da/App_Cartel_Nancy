import type { HistoryAction as VenueHistoryAction } from '../services/VenueService';
import type { HistoryAction as MatchHistoryAction } from '../services/MatchService';

/** Combined undo stack entries for venue and match edits on the map */
export type MapHistoryAction = VenueHistoryAction | MatchHistoryAction;
