/**
 * @fileoverview Hook pour gérer la logique du formulaire de venue
 * 
 * Ce hook gère :
 * - L'ajout d'un nouveau venue
 * - La mise à jour d'un venue existant
 * - La suppression d'un venue
 * - Le géocodage des adresses
 */

import { ref, push, set, get } from 'firebase/database';
import { database } from '../firebase';
import { firebaseLogger } from '../services/FirebaseLogger';
import logger from '../services/Logger';

interface VenueFormData {
  name: string;
  description: string;
  address: string;
  sport: string;
  emoji: string;
  eventType?: string;
  indicationType?: string;
  placeType: string;
}

interface UseVenueFormProps {
  isAdmin: boolean;
  tempMarker: [number, number] | null;
  venueData: VenueFormData;
  editingVenue: { id: string | null; venue: any | null };
  onSuccess: () => void;
  onError: (message: string) => void;
}

export const useVenueForm = ({
  isAdmin,
  tempMarker,
  venueData,
  editingVenue,
  onSuccess,
  onError
}: UseVenueFormProps) => {
  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
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
      logger.error('Erreur de géocodage:', error);
      return null;
    }
  };

  const handleAddVenue = async () => {
    if (!isAdmin) return;

    let coordinates: [number, number] | null = null;
    
    if (tempMarker) {
      coordinates = tempMarker;
    } else if (venueData.address) {
      const geocoded = await geocodeAddress(venueData.address);
      coordinates = geocoded || [48.6921, 6.1844]; // Coordonnées par défaut (Nancy)
    } else {
      coordinates = [48.6921, 6.1844]; // Coordonnées par défaut (Nancy)
    }

    const venuesRef = ref(database, 'venues');
    const newVenueRef = push(venuesRef);
    const newVenue: any = {
      name: venueData.name || '',
      position: coordinates,
      description: venueData.description || '',
      address: venueData.address || `${coordinates[0]}, ${coordinates[1]}`,
      matches: [],
      sport: venueData.sport || 'Football',
      date: '',
      latitude: coordinates[0],
      longitude: coordinates[1],
      emoji: venueData.emoji || '⚽',
      type: 'venue',
      placeType: venueData.placeType || 'sport'
    };
    
    // Ajouter les champs spécifiques selon le type
    if (venueData.placeType === 'soirée') {
      newVenue.eventType = venueData.eventType;
    }
    if (venueData.placeType === 'indication') {
      newVenue.indicationType = venueData.indicationType;
    }

    try {
      await firebaseLogger.wrapOperation(
        () => set(newVenueRef, newVenue),
        'write:venue',
        'venues'
      );
      
      onSuccess();
    } catch (error) {
      onError('Une erreur est survenue lors de l\'ajout du lieu.');
    }
  };

  const handleUpdateVenue = async () => {
    if (!isAdmin || !editingVenue.id) return;

    const coordinates: [number, number] = tempMarker || [
      editingVenue.venue?.latitude || 0,
      editingVenue.venue?.longitude || 0
    ];
    
    const venueRef = ref(database, `venues/${editingVenue.id}`);
    const updatedVenue: any = {
      ...editingVenue.venue,
      name: venueData.name,
      description: venueData.description,
      address: venueData.address || `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`,
      sport: venueData.sport || editingVenue.venue?.sport || 'Football',
      latitude: coordinates[0],
      longitude: coordinates[1],
      position: coordinates,
      emoji: venueData.emoji || editingVenue.venue?.emoji || '⚽',
      placeType: venueData.placeType || editingVenue.venue?.placeType || 'sport'
    };
    
    // Ajouter les champs spécifiques selon le type
    if (venueData.placeType === 'soirée') {
      updatedVenue.eventType = venueData.eventType;
    } else {
      delete updatedVenue.eventType;
    }
    
    if (venueData.placeType === 'indication') {
      updatedVenue.indicationType = venueData.indicationType;
    } else {
      delete updatedVenue.indicationType;
    }

    try {
      await firebaseLogger.wrapOperation(
        () => set(venueRef, updatedVenue),
        'update:venue',
        `venues/${editingVenue.id}`
      );
      
      onSuccess();
    } catch (error) {
      onError('Une erreur est survenue lors de la mise à jour du lieu.');
    }
  };

  const deleteVenue = async (id: string) => {
    if (!isAdmin) return;

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce lieu ? Cette action est irréversible.')) {
      return;
    }

    try {
      const venueRef = ref(database, `venues/${id}`);
      await firebaseLogger.wrapOperation(
        () => set(venueRef, null),
        'delete:venue',
        `venues/${id}`
      );
    } catch (error) {
      onError('Une erreur est survenue lors de la suppression du lieu.');
    }
  };

  return {
    handleAddVenue,
    handleUpdateVenue,
    deleteVenue
  };
};

