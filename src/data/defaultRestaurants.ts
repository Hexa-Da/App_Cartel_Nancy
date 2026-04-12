/**
 * @fileoverview Liste par défaut des lieux de restauration — source unique (carte, Firebase editable, planning).
 * Order: Parc Expo jeudi / vendredi, Gentilly, Parc Saint-Marie (planning filters).
 */

import type { Restaurant } from '../types/venue';

export const DEFAULT_RESTAURANTS: Restaurant[] = [
  {
    id: 'parc-expo-jeudi',
    name: 'Parc Expo — Jeudi',
    position: [48.66307, 6.191429],
    description: 'Repas du Jeudi soir',
    address: 'Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy',
    type: 'restaurant',
    date: '',
    latitude: 48.66307,
    longitude: 6.191429,
    emoji: '🍽️',
    sport: 'Restaurant',
    mealType: 'soir',
    matches: []
  },
  {
    id: 'parc-expo-vendredi',
    name: 'Parc Expo — Vendredi',
    position: [48.66307, 6.191429],
    description: 'Repas du Vendredi soir',
    address: 'Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy',
    type: 'restaurant',
    date: '',
    latitude: 48.66307,
    longitude: 6.191429,
    emoji: '🍽️',
    sport: 'Restaurant',
    mealType: 'soir',
    matches: []
  },
  {
    id: 'gentilly',
    name: 'Salle des Fêtes de Gentilly',
    position: [48.69843, 6.139541],
    description: 'Repas du Vendredi soir',
    address: '5001F Av. du Rhin, 54100 Nancy',
    type: 'restaurant',
    date: '',
    latitude: 48.69843,
    longitude: 6.139541,
    emoji: '🍽️',
    sport: 'Restaurant',
    mealType: 'soir',
    matches: []
  },
  {
    id: 'parc-saint-marie',
    name: 'Parc Saint-Marie',
    position: [48.680392, 6.170733],
    description: 'Brunch du Dimanche matin',
    address: '1 Av. Boffrand, 54000 Nancy',
    type: 'restaurant',
    date: '',
    latitude: 48.680392,
    longitude: 6.170733,
    emoji: '🍽️',
    sport: 'Restaurant',
    mealType: 'midi',
    matches: []
  }
];
