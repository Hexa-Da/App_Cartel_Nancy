/**
 * @fileoverview Service pour la gestion des données éditables (editData) dans Firebase
 */

import { ref, onValue, set, update, get } from 'firebase/database';
import { database } from '../firebase';
import { Party, Hotel, Restaurant } from '../types/venue';
import {
  LEGACY_PARTY_NUM_TO_SLUG,
  LEGACY_PARC_EXPO_HALL_RESTAURANT_SLUG,
  LEGACY_REST_NUM_TO_SLUG,
} from '../config/planningVenueSlugs';
import logger from './Logger';

/** Firebase keys for partyResults (historical names kept for existing data) */
const PARTY_RESULT_FIREBASE_KEYS: Record<string, string> = {
  'parc-expo-pompom': 'parc-expo-pompoms',
  zenith: 'zenith-dj-contest'
};

const PARTY_SLUGS = ['defile', 'parc-expo-pompom', 'parc-expo-showcase', 'zenith'] as const;

function normalizePartyDescriptionSlug(partyId: string): string {
  if (partyId === 'place-stanislas') return 'defile';
  return LEGACY_PARTY_NUM_TO_SLUG[partyId] ?? partyId;
}

function normalizeRestaurantDescriptionSlug(restaurantId: string): string {
  if (restaurantId === 'salle-fetes-gentilly') return 'gentilly';
  return LEGACY_REST_NUM_TO_SLUG[restaurantId] ?? restaurantId;
}

export interface EditableDataCallbacks {
  onPartyResultsUpdate?: (partyId: string, result: string) => void;
  onPartyDescriptionUpdate?: (partyId: string, description: string) => void;
  onHotelDescriptionUpdate?: (hotelId: string, description: string) => void;
  onRestaurantDescriptionUpdate?: (restaurantId: string, description: string) => void;
  onAllDataLoaded?: () => void;
}

interface DescriptionNode {
  description?: string;
}

class EditableDataService {
  loadEditableData(callbacks: EditableDataCallbacks): (() => void)[] {
    try {
      const editableDataRef = ref(database, 'editableData');
      const unsubscribe = onValue(editableDataRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          callbacks.onAllDataLoaded?.();
          return;
        }

        if (data.partyResults && callbacks.onPartyResultsUpdate) {
          const pr = data.partyResults;
          const pompomRes = pr['parc-expo-pompoms']?.result ?? pr['parc-expo-pompom']?.result;
          if (pompomRes) {
            callbacks.onPartyResultsUpdate('parc-expo-pompom', pompomRes);
          }
          if (pr['zenith-dj-contest']?.result) {
            callbacks.onPartyResultsUpdate('zenith', pr['zenith-dj-contest'].result);
          }
        }

        if (data.hotelDescriptions && callbacks.onHotelDescriptionUpdate) {
          const hotelDescriptions = data.hotelDescriptions as Record<string, DescriptionNode>;
          Object.entries(hotelDescriptions).forEach(([hotelId, hotelData]) => {
            if (hotelData.description) {
              callbacks.onHotelDescriptionUpdate!(hotelId, hotelData.description);
            }
          });
        }

        if (data.restaurantDescriptions && callbacks.onRestaurantDescriptionUpdate) {
          const restaurantDescriptions = data.restaurantDescriptions as Record<string, DescriptionNode>;
          Object.entries(restaurantDescriptions).forEach(
            ([restaurantId, restaurantData]) => {
              if (!restaurantData.description) return;
              if (restaurantId === LEGACY_PARC_EXPO_HALL_RESTAURANT_SLUG) {
                callbacks.onRestaurantDescriptionUpdate!('parc-expo-jeudi', restaurantData.description);
                callbacks.onRestaurantDescriptionUpdate!('parc-expo-vendredi', restaurantData.description);
                return;
              }
              const slug = normalizeRestaurantDescriptionSlug(restaurantId);
              callbacks.onRestaurantDescriptionUpdate!(slug, restaurantData.description);
            }
          );
        }

        if (data.partyDescriptions && callbacks.onPartyDescriptionUpdate) {
          const partyDescriptions = data.partyDescriptions as Record<string, DescriptionNode>;
          Object.entries(partyDescriptions).forEach(([partyId, partyData]) => {
            if (partyData.description) {
              const slug = normalizePartyDescriptionSlug(partyId);
              callbacks.onPartyDescriptionUpdate!(slug, partyData.description);
            }
          });
        }

        callbacks.onAllDataLoaded?.();
      });
      return [unsubscribe];
    } catch (error) {
      logger.error('[EditableDataService] Erreur chargement editableData:', error);
      callbacks.onAllDataLoaded?.();
      return [];
    }
  }

  async savePartyResult(partyId: string, result: string): Promise<void> {
    try {
      const slug = LEGACY_PARTY_NUM_TO_SLUG[partyId] ?? partyId;
      const fbSegment = PARTY_RESULT_FIREBASE_KEYS[slug];
      if (!fbSegment) {
        logger.warn(`[EditableDataService] ID de soirée non reconnu pour résultat: ${partyId}`);
        return;
      }

      const firebaseKey = `editableData/partyResults/${fbSegment}`;
      const dbRef = ref(database, firebaseKey);
      await set(dbRef, { result, updatedAt: new Date().toISOString() });
    } catch (error) {
      logger.error('[EditableDataService] Erreur sauvegarde partyResult:', error);
      throw error;
    }
  }

  async savePartyDescription(partyId: string, description: string): Promise<void> {
    try {
      const slug = normalizePartyDescriptionSlug(LEGACY_PARTY_NUM_TO_SLUG[partyId] ?? partyId);
      const dbRef = ref(database, `editableData/partyDescriptions/${slug}`);
      await set(dbRef, { description, updatedAt: new Date().toISOString() });
    } catch (error) {
      logger.error('[EditableDataService] Erreur sauvegarde partyDescription:', error);
      throw error;
    }
  }

  async saveHotelDescription(hotelId: string, description: string): Promise<void> {
    try {
      const dbRef = ref(database, `editableData/hotelDescriptions/${hotelId}`);
      await set(dbRef, { description, updatedAt: new Date().toISOString() });
    } catch (error) {
      logger.error('[EditableDataService] Erreur sauvegarde hotelDescription:', error);
      throw error;
    }
  }

  async saveRestaurantDescription(restaurantId: string, description: string): Promise<void> {
    try {
      const slug = normalizeRestaurantDescriptionSlug(LEGACY_REST_NUM_TO_SLUG[restaurantId] ?? restaurantId);
      const dbRef = ref(database, `editableData/restaurantDescriptions/${slug}`);
      await set(dbRef, { description, updatedAt: new Date().toISOString() });
    } catch (error) {
      logger.error('[EditableDataService] Erreur sauvegarde restaurantDescription:', error);
      throw error;
    }
  }

  async initializeEditableDataBranch(
    parties: Party[],
    hotels: Hotel[],
    restaurants: Restaurant[]
  ): Promise<void> {
    try {
      const editableDataRef = ref(database, 'editableData');

      const generateHotelDescriptions = () => {
        const hotelDescriptions: Record<string, { description: string; updatedAt: string }> = {};
        hotels.forEach((hotel) => {
          hotelDescriptions[hotel.id] = {
            description: hotel.description || '',
            updatedAt: new Date().toISOString()
          };
        });
        return hotelDescriptions;
      };

      const generateRestaurantDescriptions = () => {
        const restaurantDescriptions: Record<string, { description: string; updatedAt: string }> = {};
        restaurants.forEach((restaurant) => {
          restaurantDescriptions[restaurant.id] = {
            description: restaurant.description || '',
            updatedAt: new Date().toISOString()
          };
        });
        return restaurantDescriptions;
      };

      const pStan = parties.find((p) => p.id === 'defile');
      const pPompom = parties.find((p) => p.id === 'parc-expo-pompom');
      const pShow = parties.find((p) => p.id === 'parc-expo-showcase');
      const pZen = parties.find((p) => p.id === 'zenith');

      const initialStructure = {
        partyResults: {
          'parc-expo-pompoms': {
            result: pPompom?.result || '',
            updatedAt: new Date().toISOString()
          },
          'zenith-dj-contest': {
            result: pZen?.result || '',
            updatedAt: new Date().toISOString()
          }
        },
        hotelDescriptions: generateHotelDescriptions(),
        restaurantDescriptions: generateRestaurantDescriptions(),
        partyDescriptions: {
          defile: {
            description:
              pStan?.description || 'Défilé 14h–16h30 (informations sur place dès midi)',
            updatedAt: new Date().toISOString()
          },
          'parc-expo-pompom': {
            description: pPompom?.description || 'Soirée Pompoms du 16 avril, 21h-3h',
            updatedAt: new Date().toISOString()
          },
          'parc-expo-showcase': {
            description: pShow?.description || 'Soirée Showcase 17 avril, 20h-4h',
            updatedAt: new Date().toISOString()
          },
          zenith: {
            description: pZen?.description || 'Soirée DJ Contest 18 avril, 20h-4h',
            updatedAt: new Date().toISOString()
          }
        }
      };

      const snapshot = await get(editableDataRef);
      if (!snapshot.exists()) {
        await set(editableDataRef, initialStructure);
      } else {
        const existingData = snapshot.val();
        const updates: Record<string, unknown> = {};

        if (!existingData.partyResults) {
          updates.partyResults = initialStructure.partyResults;
        } else {
          if (!existingData.partyResults['parc-expo-pompoms']) {
            updates['partyResults/parc-expo-pompoms'] = initialStructure.partyResults['parc-expo-pompoms'];
          }

          if (!existingData.partyResults['zenith-dj-contest']) {
            updates['partyResults/zenith-dj-contest'] = initialStructure.partyResults['zenith-dj-contest'];
          }
        }

        if (!existingData.hotelDescriptions) {
          updates.hotelDescriptions = initialStructure.hotelDescriptions;
        } else {
          hotels.forEach((hotel) => {
            if (!existingData.hotelDescriptions[hotel.id]) {
              updates[`hotelDescriptions/${hotel.id}`] = initialStructure.hotelDescriptions[hotel.id];
            }
          });
        }

        if (!existingData.restaurantDescriptions) {
          updates.restaurantDescriptions = initialStructure.restaurantDescriptions;
        } else {
          restaurants.forEach((restaurant) => {
            if (!existingData.restaurantDescriptions[restaurant.id]) {
              updates[`restaurantDescriptions/${restaurant.id}`] =
                initialStructure.restaurantDescriptions[restaurant.id];
            }
          });
        }

        if (!existingData.partyDescriptions) {
          updates.partyDescriptions = initialStructure.partyDescriptions;
        } else {
          PARTY_SLUGS.forEach((slug) => {
            if (!existingData.partyDescriptions[slug]) {
              updates[`partyDescriptions/${slug}`] =
                initialStructure.partyDescriptions[slug as keyof typeof initialStructure.partyDescriptions];
            }
          });
        }

        if (Object.keys(updates).length > 0) {
          await update(editableDataRef, updates);
        }
      }
    } catch (error) {
      logger.error('[EditableDataService] Erreur initialisation editableData:', error);
      throw error;
    }
  }
}

export const editableDataService = new EditableDataService();
