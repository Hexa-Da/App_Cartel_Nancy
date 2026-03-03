/**
 * @fileoverview Service pour la gestion des données éditables (editData) dans Firebase
 * 
 * Ce service gère toutes les opérations pour les données éditables :
 * - Chargement en temps réel depuis Firebase
 * - Sauvegarde des modifications
 * - Initialisation de la structure Firebase
 * - Gestion des descriptions et résultats pour parties, hôtels et restaurants
 * 
 * Nécessaire car :
 * - Centralise la logique de gestion des editData
 * - Allège le composant App.tsx
 * - Facilite la maintenance et les tests
 * - Assure la cohérence des opérations Firebase
 */

import { ref, onValue, set, update, get } from 'firebase/database';
import { database } from '../firebase';
import { Party, Hotel, Restaurant } from '../types/venue';
import logger from './Logger';

export interface EditableDataCallbacks {
  onPartyResultsUpdate?: (partyId: string, result: string) => void;
  onPartyDescriptionUpdate?: (partyId: string, description: string) => void;
  onHotelDescriptionUpdate?: (hotelId: string, description: string) => void;
  onRestaurantDescriptionUpdate?: (restaurantId: string, description: string) => void;
  onAllDataLoaded?: () => void;
}

class EditableDataService {
  /**
   * Charge les données éditables depuis Firebase avec des callbacks pour mettre à jour l'état React
   */
  loadEditableData(callbacks: EditableDataCallbacks): (() => void)[] {
    const unsubscribeFunctions: (() => void)[] = [];
    let loadedCount = 0;
    const totalSources = 4; // partyResults, hotelDescriptions, restaurantDescriptions, partyDescriptions

    const checkAllDataLoaded = () => {
      loadedCount++;
      if (loadedCount === totalSources && callbacks.onAllDataLoaded) {
        callbacks.onAllDataLoaded();
      }
    };

    // Charger les résultats des soirées
    try {
      const partyResultsRef = ref(database, 'editableData/partyResults');
      const unsubscribePartyResults = onValue(partyResultsRef, (snapshot) => {
        const data = snapshot.val();
        if (data && callbacks.onPartyResultsUpdate) {
          if (data['parc-expo-pompoms']?.result) {
            callbacks.onPartyResultsUpdate('2', data['parc-expo-pompoms'].result);
          }
          if (data['parc-expo-showcase']?.result) {
            callbacks.onPartyResultsUpdate('3', data['parc-expo-showcase'].result);
          }
          if (data['zenith-dj-contest']?.result) {
            callbacks.onPartyResultsUpdate('4', data['zenith-dj-contest'].result);
          }
        }
        checkAllDataLoaded();
      });
      unsubscribeFunctions.push(unsubscribePartyResults);
    } catch (error) {
      logger.error('[EditableDataService] Erreur chargement partyResults:', error);
      checkAllDataLoaded();
    }

    // Charger les descriptions des hôtels
    try {
      const hotelDescriptionsRef = ref(database, 'editableData/hotelDescriptions');
      const unsubscribeHotelDescriptions = onValue(hotelDescriptionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data && callbacks.onHotelDescriptionUpdate) {
          Object.entries(data).forEach(([hotelId, hotelData]: [string, any]) => {
            if (hotelData.description) {
              callbacks.onHotelDescriptionUpdate!(hotelId, hotelData.description);
            }
          });
        }
        checkAllDataLoaded();
      });
      unsubscribeFunctions.push(unsubscribeHotelDescriptions);
    } catch (error) {
      logger.error('[EditableDataService] Erreur chargement hotelDescriptions:', error);
      checkAllDataLoaded();
    }

    // Charger les descriptions des restaurants
    try {
      const restaurantDescriptionsRef = ref(database, 'editableData/restaurantDescriptions');
      const unsubscribeRestaurantDescriptions = onValue(restaurantDescriptionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data && callbacks.onRestaurantDescriptionUpdate) {
          Object.entries(data).forEach(([restaurantId, restaurantData]: [string, any]) => {
            if (restaurantData.description) {
              callbacks.onRestaurantDescriptionUpdate!(restaurantId, restaurantData.description);
            }
          });
        }
        checkAllDataLoaded();
      });
      unsubscribeFunctions.push(unsubscribeRestaurantDescriptions);
    } catch (error) {
      logger.error('[EditableDataService] Erreur chargement restaurantDescriptions:', error);
      checkAllDataLoaded();
    }

    // Charger les descriptions des soirées
    try {
      const partyDescriptionsRef = ref(database, 'editableData/partyDescriptions');
      const unsubscribePartyDescriptions = onValue(partyDescriptionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data && callbacks.onPartyDescriptionUpdate) {
          Object.entries(data).forEach(([partyId, partyData]: [string, any]) => {
            if (partyData.description) {
              callbacks.onPartyDescriptionUpdate!(partyId, partyData.description);
            }
          });
        }
        checkAllDataLoaded();
      });
      unsubscribeFunctions.push(unsubscribePartyDescriptions);
    } catch (error) {
      logger.error('[EditableDataService] Erreur chargement partyDescriptions:', error);
      checkAllDataLoaded();
    }

    return unsubscribeFunctions;
  }

  /**
   * Sauvegarde le résultat d'une soirée dans Firebase
   */
  async savePartyResult(partyId: string, result: string): Promise<void> {
    try {
      let firebaseKey: string;
      
      if (partyId === '2') {
        firebaseKey = 'editableData/partyResults/parc-expo-pompoms';
      } else if (partyId === '3') {
        firebaseKey = 'editableData/partyResults/parc-expo-showcase';
      } else if (partyId === '4') {
        firebaseKey = 'editableData/partyResults/zenith-dj-contest';
      } else {
        logger.warn(`[EditableDataService] ID de soirée non reconnu: ${partyId}`);
        return;
      }

      const dbRef = ref(database, firebaseKey);
      await set(dbRef, { result, updatedAt: new Date().toISOString() });
    } catch (error) {
      logger.error('[EditableDataService] Erreur sauvegarde partyResult:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde la description d'une soirée dans Firebase
   */
  async savePartyDescription(partyId: string, description: string): Promise<void> {
    try {
      const dbRef = ref(database, `editableData/partyDescriptions/${partyId}`);
      await set(dbRef, { description, updatedAt: new Date().toISOString() });
    } catch (error) {
      logger.error('[EditableDataService] Erreur sauvegarde partyDescription:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde la description d'un hôtel dans Firebase
   */
  async saveHotelDescription(hotelId: string, description: string): Promise<void> {
    try {
      const dbRef = ref(database, `editableData/hotelDescriptions/${hotelId}`);
      await set(dbRef, { description, updatedAt: new Date().toISOString() });
    } catch (error) {
      logger.error('[EditableDataService] Erreur sauvegarde hotelDescription:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde la description d'un restaurant dans Firebase
   */
  async saveRestaurantDescription(restaurantId: string, description: string): Promise<void> {
    try {
      const dbRef = ref(database, `editableData/restaurantDescriptions/${restaurantId}`);
      await set(dbRef, { description, updatedAt: new Date().toISOString() });
    } catch (error) {
      logger.error('[EditableDataService] Erreur sauvegarde restaurantDescription:', error);
      throw error;
    }
  }

  /**
   * Initialise la branche editableData sur Firebase avec les valeurs par défaut
   */
  async initializeEditableDataBranch(
    parties: Party[],
    hotels: Hotel[],
    restaurants: Restaurant[]
  ): Promise<void> {
    try {
      const editableDataRef = ref(database, 'editableData');

      // Générer dynamiquement la structure pour inclure tous les hôtels et restaurants
      const generateHotelDescriptions = () => {
        const hotelDescriptions: any = {};
        hotels.forEach((hotel) => {
          hotelDescriptions[hotel.id] = {
            description: hotel.description || '',
            updatedAt: new Date().toISOString()
          };
        });
        return hotelDescriptions;
      };

      const generateRestaurantDescriptions = () => {
        const restaurantDescriptions: any = {};
        restaurants.forEach((restaurant) => {
          restaurantDescriptions[restaurant.id] = {
            description: restaurant.description || '',
            updatedAt: new Date().toISOString()
          };
        });
        return restaurantDescriptions;
      };

      // Trouver les résultats des soirées depuis l'état parties
      const party2 = parties.find(p => p.id === '2');
      const party3 = parties.find(p => p.id === '3');
      const party1 = parties.find(p => p.id === '1');
      const party4 = parties.find(p => p.id === '4');

      // Structure complète avec toutes les données depuis les états React
      const initialStructure = {
        partyResults: {
          'parc-expo-pompoms': {
            result: party2?.result || '',
            updatedAt: new Date().toISOString()
          },
          'parc-expo-showcase': {
            result: party3?.result || '',
            updatedAt: new Date().toISOString()
          },
          'zenith-dj-contest': {
            result: party4?.result || '',
            updatedAt: new Date().toISOString()
          }
        },
        hotelDescriptions: generateHotelDescriptions(),
        restaurantDescriptions: generateRestaurantDescriptions(),
        partyDescriptions: {
          '1': {
            description: party1?.description || 'Rendez vous 12h puis départ du Défilé à 13h',
            updatedAt: new Date().toISOString()
          },
          '2': {
            description: party2?.description || 'Soirée Pompoms du 16 avril, 21h-3h',
            updatedAt: new Date().toISOString()
          },
          '3': {
            description: party3?.description || 'Soirée Showcase 17 avril, 20h-4h',
            updatedAt: new Date().toISOString()
          },
          '4': {
            description: party4?.description || 'Soirée DJ Contest 18 avril, 20h-4h',
            updatedAt: new Date().toISOString()
          }
        }
      };

      // Vérifier si editableData existe déjà dans Firebase
      const snapshot = await get(editableDataRef);
      if (!snapshot.exists()) {
        // Si la structure n'existe pas, l'initialiser avec les valeurs par défaut
        await set(editableDataRef, initialStructure);
      } else {
        // Si la structure existe, ne mettre à jour que les champs manquants sans écraser les données existantes
        const existingData = snapshot.val();
        const updates: any = {};

        // Vérifier et mettre à jour seulement les parties manquantes
        if (!existingData.partyResults) {
          updates.partyResults = initialStructure.partyResults;
        } else {
          // Mettre à jour seulement les résultats manquants
          if (!existingData.partyResults['parc-expo-pompoms']) {
            updates['partyResults/parc-expo-pompoms'] = initialStructure.partyResults['parc-expo-pompoms'];
          }
          if (!existingData.partyResults['parc-expo-showcase']) {
            updates['partyResults/parc-expo-showcase'] = initialStructure.partyResults['parc-expo-showcase'];
          }
          if (!existingData.partyResults['zenith-dj-contest']) {
            updates['partyResults/zenith-dj-contest'] = initialStructure.partyResults['zenith-dj-contest'];
          }
        }

        if (!existingData.hotelDescriptions) {
          updates.hotelDescriptions = initialStructure.hotelDescriptions;
        } else {
          // Mettre à jour seulement les descriptions d'hôtels manquantes
          hotels.forEach((hotel) => {
            if (!existingData.hotelDescriptions[hotel.id]) {
              updates[`hotelDescriptions/${hotel.id}`] = initialStructure.hotelDescriptions[hotel.id];
            }
          });
        }

        if (!existingData.restaurantDescriptions) {
          updates.restaurantDescriptions = initialStructure.restaurantDescriptions;
        } else {
          // Mettre à jour seulement les descriptions de restaurants manquantes
          restaurants.forEach((restaurant) => {
            if (!existingData.restaurantDescriptions[restaurant.id]) {
              updates[`restaurantDescriptions/${restaurant.id}`] = initialStructure.restaurantDescriptions[restaurant.id];
            }
          });
        }

        if (!existingData.partyDescriptions) {
          updates.partyDescriptions = initialStructure.partyDescriptions;
        } else {
          // Mettre à jour seulement les descriptions de soirées manquantes
          ['1', '2', '3', '4'].forEach((partyId) => {
            if (!existingData.partyDescriptions[partyId]) {
              updates[`partyDescriptions/${partyId}`] = initialStructure.partyDescriptions[partyId as '1' | '2' | '3' | '4'];
            }
          });
        }

        // Appliquer seulement les mises à jour nécessaires
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
