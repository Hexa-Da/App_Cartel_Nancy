/**
 * @fileoverview Default party list (soirées) — single source shared by App and AppContext
 * Order: Parc Expo Pompom, Showcase, Défilé, Zénith (planning filters & map).
 */

import type { Party } from '../types/venue';

export const DEFAULT_PARTIES: Party[] = [
  {
    id: 'defile',
    name: 'Place Stanislas — Défilé',
    position: [48.693524, 6.183270],
    description: 'Défilé 14h–16h30 (informations sur place dès midi)',
    address: 'Pl. Stanislas, 54000 Nancy',
    type: 'party',
    date: '2026-04-16T13:45:00',
    endDate: '2026-04-16T16:30:00',
    latitude: 48.693524,
    longitude: 6.183270,
    emoji: '🎺',
    sport: 'Defile'
  },
  {
    id: 'parc-expo-pompom',
    name: 'Parc Expo — Soirée Pompoms',
    position: [48.663257, 6.189841],
    description: 'Soirée Pompoms du 16 avril, 21h-3h',
    address: 'Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy',
    type: 'party',
    date: '2026-04-16T20:00:00',
    endDate: '2026-04-17T02:00:00',
    latitude: 48.663257,
    longitude: 6.189841,
    emoji: '🎀',
    sport: 'Pompom',
    result: ''
  },
  {
    id: 'parc-expo-showcase',
    name: 'Parc Expo — Showcase',
    position: [48.663636, 6.190061],
    description: 'Soirée Showcase 17 avril, 20h-4h',
    address: 'Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy',
    type: 'party',
    date: '2026-04-17T20:00:00',
    endDate: '2026-04-18T02:00:00',
    latitude: 48.663636,
    longitude: 6.190061,
    emoji: '🎤',
    sport: 'Party',
    result: ''
  },
  {
    id: 'zenith',
    name: 'Zénith — DJ Contest',
    position: [48.710136, 6.139169],
    description: 'Soirée DJ Contest 18 avril, 20h-4h',
    address: 'Rue du Zénith, 54320 Maxéville',
    type: 'party',
    date: '2026-04-18T20:30:00',
    endDate: '2026-04-19T04:00:00',
    latitude: 48.710136,
    longitude: 6.139169,
    emoji: '🎧',
    sport: 'Party',
    result: ''
  }
];
