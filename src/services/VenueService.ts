/**
 * @fileoverview Service pour la gestion des venues (lieux) dans Firebase
 * 
 * Ce service gère toutes les opérations CRUD pour les venues :
 * - Création, lecture, mise à jour, suppression
 * - Géocodage d'adresses
 * - Gestion de l'historique des actions
 */

import { ref, set, push, remove } from 'firebase/database';
import { database } from '../firebase';
import { Venue } from '../types';

export interface HistoryAction {
  type: 'ADD_VENUE' | 'UPDATE_VENUE' | 'DELETE_VENUE';
  data: any;
  undo: () => Promise<void>;
}

class VenueService {
  /**
   * Géocode une adresse en coordonnées GPS
   */
  async geocodeAddress(address: string): Promise<[number, number] | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
      return null;
    } catch (error) {
      console.error('Erreur de géocodage:', error);
      return null;
    }
  }

  /**
   * Ajoute un nouveau venue
   */
  async addVenue(
    venueData: {
      name: string;
      description: string;
      address: string;
      coordinates: [number, number];
      sport: string;
      emoji: string;
      placeType: string;
      eventType?: string;
      indicationType?: string;
    }
  ): Promise<string> {
    const venuesRef = ref(database, 'venues');
    const newVenueRef = push(venuesRef);
    
    const newVenue: any = {
      name: venueData.name || '',
      position: venueData.coordinates,
      description: venueData.description || '',
      address: venueData.address || `${venueData.coordinates[0]}, ${venueData.coordinates[1]}`,
      matches: [],
      sport: venueData.sport || 'Football',
      date: '',
      latitude: venueData.coordinates[0],
      longitude: venueData.coordinates[1],
      emoji: venueData.emoji || '⚽',
      type: 'venue',
      placeType: venueData.placeType || 'sport'
    };
    
    // Ajouter les champs spécifiques selon le type
    if (venueData.placeType === 'soirée' && venueData.eventType) {
      newVenue.eventType = venueData.eventType;
    }
    if (venueData.placeType === 'indication' && venueData.indicationType) {
      newVenue.indicationType = venueData.indicationType;
    }

    await set(newVenueRef, newVenue);
    return newVenueRef.key || '';
  }

  /**
   * Met à jour un venue existant
   */
  async updateVenue(venueId: string, venueData: Partial<Venue>): Promise<void> {
    const venueRef = ref(database, `venues/${venueId}`);
    await set(venueRef, venueData);
  }

  /**
   * Supprime un venue
   */
  async deleteVenue(venueId: string): Promise<void> {
    const venueRef = ref(database, `venues/${venueId}`);
    await set(venueRef, null);
  }

  /**
   * Crée une action d'historique pour l'ajout d'un venue
   */
  createAddHistoryAction(venueId: string, venueData: any): HistoryAction {
    return {
      type: 'ADD_VENUE',
      data: { ...venueData, id: venueId },
      undo: async () => {
        await this.deleteVenue(venueId);
      }
    };
  }

  /**
   * Crée une action d'historique pour la mise à jour d'un venue
   */
  createUpdateHistoryAction(venueId: string, before: Venue, after: Venue): HistoryAction {
    return {
      type: 'UPDATE_VENUE',
      data: { before, after },
      undo: async () => {
        await this.updateVenue(venueId, before);
      }
    };
  }

  /**
   * Crée une action d'historique pour la suppression d'un venue
   */
  createDeleteHistoryAction(venueId: string, venue: Venue): HistoryAction {
    return {
      type: 'DELETE_VENUE',
      data: venue,
      undo: async () => {
        await this.updateVenue(venueId, venue);
      }
    };
  }
}

export const venueService = new VenueService();

