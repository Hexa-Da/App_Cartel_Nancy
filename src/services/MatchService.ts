/**
 * @fileoverview Service pour la gestion des matches dans Firebase
 * 
 * Ce service gère toutes les opérations CRUD pour les matches :
 * - Création, mise à jour, suppression
 * - Gestion de l'historique des actions
 */

import { ref, set } from 'firebase/database';
import { database } from '../firebase';
import { Match, Venue } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface HistoryAction {
  type: 'ADD_MATCH' | 'UPDATE_MATCH' | 'DELETE_MATCH';
  data: any;
  undo: () => Promise<void>;
}

class MatchService {
  /**
   * Ajoute un nouveau match à un venue
   */
  async addMatch(
    venueId: string,
    venue: Venue,
    matchData: {
      date: string;
      teams: string;
      description: string;
      endTime?: string;
      result?: string;
    }
  ): Promise<Match> {
    const matchId = uuidv4();
    const match: Match = {
      id: matchId,
      name: `${venue.name} - Match`,
      description: matchData.description || '',
      address: venue.address,
      latitude: venue.latitude,
      longitude: venue.longitude,
      position: [venue.latitude, venue.longitude],
      date: matchData.date || '',
      type: 'match',
      teams: matchData.teams || '',
      sport: venue.sport,
      time: matchData.date ? new Date(matchData.date).toTimeString().split(' ')[0] : '',
      endTime: matchData.endTime || '',
      result: matchData.result || '',
      venueId: venue.id,
      emoji: venue.emoji
    };

    const venueRef = ref(database, `venues/${venueId}`);
    const updatedMatches = [...(venue.matches || []), match];
    
    await set(venueRef, {
      ...venue,
      matches: updatedMatches
    });

    return match;
  }

  /**
   * Met à jour un match existant
   */
  async updateMatch(
    venueId: string,
    venue: Venue,
    matchId: string,
    updatedData: Partial<Match>
  ): Promise<void> {
    const updatedMatches = venue.matches.map(match =>
      match.id === matchId ? { 
        ...match, 
        ...updatedData,
        endTime: updatedData.endTime || '' // Permettre une chaîne vide pour endTime
      } : match
    );
    
    const venueRef = ref(database, `venues/${venueId}`);
    await set(venueRef, {
      ...venue,
      matches: updatedMatches
    });
  }

  /**
   * Supprime un match
   */
  async deleteMatch(
    venueId: string,
    venue: Venue,
    matchId: string
  ): Promise<Match | null> {
    const matchToDelete = venue.matches.find(m => m.id === matchId);
    if (!matchToDelete) return null;

    const updatedMatches = venue.matches.filter(match => match.id !== matchId);
    const venueRef = ref(database, `venues/${venueId}`);
    await set(venueRef, {
      ...venue,
      matches: updatedMatches
    });

    return matchToDelete;
  }

  /**
   * Crée une action d'historique pour l'ajout d'un match
   */
  createAddHistoryAction(venueId: string, venue: Venue, match: Match): HistoryAction {
    return {
      type: 'ADD_MATCH',
      data: { venueId, match },
      undo: async () => {
        const venueRef = ref(database, `venues/${venueId}`);
        await set(venueRef, {
          ...venue,
          matches: venue.matches || []
        });
      }
    };
  }

  /**
   * Crée une action d'historique pour la mise à jour d'un match
   */
  createUpdateHistoryAction(
    venueId: string,
    venueBefore: Venue,
    matchId: string,
    matchBefore: Match,
    matchAfter: Match
  ): HistoryAction {
    return {
      type: 'UPDATE_MATCH',
      data: { venueId, matchId, before: matchBefore, after: matchAfter },
      undo: async () => {
        const venueRef = ref(database, `venues/${venueId}`);
        await set(venueRef, venueBefore);
      }
    };
  }

  /**
   * Crée une action d'historique pour la suppression d'un match
   */
  createDeleteHistoryAction(
    venueId: string,
    venueBefore: Venue,
    match: Match
  ): HistoryAction {
    return {
      type: 'DELETE_MATCH',
      data: { venueId, match },
      undo: async () => {
        const venueRef = ref(database, `venues/${venueId}`);
        const updatedMatches = [...(venueBefore.matches || []), match];
        await set(venueRef, {
          ...venueBefore,
          matches: updatedMatches
        });
      }
    };
  }
}

export const matchService = new MatchService();

