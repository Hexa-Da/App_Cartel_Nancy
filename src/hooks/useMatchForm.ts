/**
 * @fileoverview Hook pour gérer la logique du formulaire de match
 * 
 * Ce hook gère :
 * - L'ajout d'un nouveau match
 * - La mise à jour d'un match existant
 * - La suppression d'un match
 */

import { ref, get, set } from 'firebase/database';
import { database } from '../firebase';
import { firebaseLogger } from '../services/FirebaseLogger';
import { v4 as uuidv4 } from 'uuid';
import { Match } from '../types';

interface MatchFormData {
  date: string;
  teams: string;
  description: string;
  endTime?: string;
  result?: string;
}

interface UseMatchFormProps {
  isAdmin: boolean;
  venueId: string;
  matchData: MatchFormData;
  editingMatch: { venueId: string | null; match: Match | null };
  onSuccess: () => void;
  onError: (message: string) => void;
}

export const useMatchForm = ({
  isAdmin,
  venueId,
  matchData,
  editingMatch,
  onSuccess,
  onError
}: UseMatchFormProps) => {
  const handleAddMatch = async () => {
    if (!isAdmin) return;

    const venueRef = ref(database, `venues/${venueId}`);
    
    try {
      const snapshot = await firebaseLogger.wrapOperation(
        () => get(venueRef),
        'read:venue',
        `venues/${venueId}`
      );
      const venue = snapshot.val();
      if (!venue) return;

      // Extraire latitude/longitude de position si non définis
      const lat = venue.latitude ?? (venue.position ? venue.position[0] : 0);
      const lng = venue.longitude ?? (venue.position ? venue.position[1] : 0);

      const matchId = uuidv4();
      const match = {
        id: matchId,
        name: `${venue.name} - Match`,
        description: matchData.description || '',
        date: matchData.date || '',
        teams: matchData.teams || '',
        endTime: matchData.endTime || '',
        result: matchData.result || ''
      };

      const updatedMatches = [...(venue.matches || []), match];
      
      await firebaseLogger.wrapOperation(
        () => set(venueRef, {
          ...venue,
          matches: updatedMatches
        }),
        'write:match',
        `venues/${venueId}/matches`
      );

      onSuccess();
    } catch (error) {
      onError('Une erreur est survenue lors de l\'ajout du match.');
    }
  };

  const handleUpdateMatch = async (matchId: string, updatedData: Partial<Match>) => {
    if (!isAdmin) return;
    
    const venueRef = ref(database, `venues/${venueId}`);
    
    try {
      const snapshot = await firebaseLogger.wrapOperation(
        () => get(venueRef),
        'read:venue',
        `venues/${venueId}`
      );
      const venue = snapshot.val();
      if (!venue) return;

      const updatedMatches = venue.matches.map((match: Match) =>
        match.id === matchId ? { ...match, ...updatedData } : match
      );
      
      await firebaseLogger.wrapOperation(
        () => set(venueRef, {
          ...venue,
          matches: updatedMatches
        }),
        'update:match',
        `venues/${venueId}/matches/${matchId}`
      );
      
      onSuccess();
    } catch (error) {
      onError('Une erreur est survenue lors de la mise à jour du match.');
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!isAdmin) return;

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce match ? Cette action est irréversible.')) {
      return;
    }
    
    const venueRef = ref(database, `venues/${venueId}`);
    
    try {
      const snapshot = await firebaseLogger.wrapOperation(
        () => get(venueRef),
        'read:venue',
        `venues/${venueId}`
      );
      const venue = snapshot.val();
      if (!venue) return;

      const updatedMatches = venue.matches.filter((match: Match) => match.id !== matchId);
      
      await firebaseLogger.wrapOperation(
        () => set(venueRef, {
          ...venue,
          matches: updatedMatches
        }),
        'delete:match',
        `venues/${venueId}/matches/${matchId}`
      );
    } catch (error) {
      onError('Une erreur est survenue lors de la suppression du match.');
    }
  };

  return {
    handleAddMatch,
    handleUpdateMatch,
    deleteMatch
  };
};

