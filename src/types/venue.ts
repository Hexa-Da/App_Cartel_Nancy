/**
 * @fileoverview Types et interfaces pour les lieux (venues) de l'application
 * 
 * Ce fichier contient les interfaces pour les différents types de lieux :
 * - BaseItem : Interface de base pour tous les lieux
 * - Hotel : Hôtels avec informations de contact
 * - Restaurant : Restaurants avec type de repas
 * - Party : Soirées et événements festifs
 * 
 * Nécessaire car :
 * - Centralise les définitions de types pour les lieux
 * - Facilite la réutilisation et la maintenance
 * - Assure la cohérence des types dans toute l'application
 */

import { Match } from '../types';

export interface BaseItem {
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
}

export interface Hotel extends BaseItem {
  type: 'hotel';
  telephone?: string;
  matches: Match[];
}

export interface Restaurant extends BaseItem {
  type: 'restaurant';
  mealType: string; // 'midi' ou 'soir'
  matches: Match[];
}

export interface Party extends BaseItem {
  type: 'party';
  /** ISO-like local datetime when the event ends (same convention as `date`). */
  endDate?: string;
  result?: string;
}

