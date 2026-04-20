/**
 * @fileoverview Définitions des types TypeScript pour l'application Cartel Nancy
 * 
 * Ce fichier contient toutes les interfaces et types utilisés dans l'application :
 * - Venue : Lieux d'événements (salles, terrains, etc.)
 * - Match : Matchs sportifs avec détails complets
 * - PlanningFile : Fichiers de planning (images, documents)
 * 
 * Nécessaire car :
 * - Assure la cohérence des types dans toute l'application
 * - Facilite le développement avec l'autocomplétion
 * - Prévient les erreurs de typage
 * - Documente la structure des données
 */

export interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  position: [number, number];
  date: string;
  emoji: string;
  sport: string;
  type: 'venue';
  matches: Match[];
}

export interface Match {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  position: [number, number];
  date: string;
  emoji: string;
  sport: string;
  type: 'match';
  teams: string;
  time: string;
  endTime?: string;
  result?: string;
  venueId: string;
}

/** Upload category — disambiguates shared numeric ids (party / restaurants / hotel all use '1', '2', …) */
export type PlanningFileCategory = 'party' | 'restaurants' | 'hotel' | 'sports' | 'hse';

export interface PlanningFile {
  id: string;
  name: string;
  type: 'image' | 'file';
  url: string;
  description?: string;
  eventType: string;
  uploadDate: number;
  uploadedBy: string;
  /** Set on new uploads; filters prefer this over ambiguous eventType/id-only matching */
  fileCategory?: PlanningFileCategory;
  specificItemId?: string;
  specificItemName?: string;
}

export interface LaunchPopup {
  id: string;
  title: string;
  image?: string;
  video?: string;
  startDate: string;
  endDate?: string;
}