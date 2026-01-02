/**
 * @fileoverview Service pour la logique de la carte et du filtrage
 * 
 * Ce service gère :
 * - Filtrage des venues et matches
 * - Calcul des couleurs des marqueurs
 * - Utilitaires pour les icônes de sport
 * - Vérification si un match est passé
 */

import { Venue, Match } from '../types';

class MapService {
  /**
   * Retourne la couleur du marqueur selon la date du match
   */
  getMarkerColor(date: string): { color: string; rotation: string } {
    const matchDate = new Date(date);
    const now = new Date();
    const diffTime = matchDate.getTime() - now.getTime();
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    
    if (diffHours < 0) return { color: '#808080', rotation: '0deg' }; // Gris pour les matchs passés
    if (diffHours <= 1) return { color: '#FF0000', rotation: '0deg' }; // Rouge pour les matchs dans moins d'1h
    if (diffHours <= 3) return { color: '#FF4500', rotation: '45deg' }; // Orange foncé pour les matchs dans 1-3h
    if (diffHours <= 6) return { color: '#FFA500', rotation: '90deg' }; // Orange pour les matchs dans 3-6h
    if (diffHours <= 12) return { color: '#FFD700', rotation: '135deg' }; // Jaune pour les matchs dans 6-12h
    return { color: '#4CAF50', rotation: '180deg' }; // Vert pour les matchs plus éloignés
  }

  /**
   * Retourne l'emoji correspondant au sport
   */
  getSportIcon(sport: string): string {
    const sportIcons: { [key: string]: string } = {
      'Football': '⚽',
      'Basketball': '🏀',
      'Handball': '🤾',
      'Rugby': '🏉',
      'Ultimate': '🥏',
      'Natation': '🏊',
      'Badminton': '🏸',
      'Tennis': '🎾',
      'Cross': '👟',
      'Volleyball': '🏐',
      'Ping-pong': '🏓',
      'Echecs': '♟️',
      'Athlétisme': '🏃‍♂️',
      'Spikeball': '⚡️',
      'Pétanque': '🍹',
      'Escalade': '🧗‍♂️',
    };
    return sportIcons[sport] || '🏆';
  }

  /**
   * Vérifie si un match est passé
   */
  isMatchPassed(startDate: string, endTime?: string, type: 'match' | 'party' = 'match'): boolean {
    const now = new Date();
    const start = new Date(startDate);
    
    // Si l'événement est dans le futur, il n'est pas passé
    if (start > now) {
      return false;
    }
    
    // Si une heure de fin est spécifiée, l'utiliser
    if (endTime) {
      const end = new Date(endTime);
      return end < now;
    }
    
    // Pour les soirées sans heure de fin, on considère qu'elles se terminent à 23h
    if (type === 'party') {
      const end = new Date(startDate);
      end.setHours(23, 0, 0, 0);
      return end < now;
    }
    
    // Pour les matchs sans heure de fin, on considère qu'ils durent 1h
    const end = new Date(startDate);
    end.setHours(end.getHours() + 1);
    return end < now;
  }

  /**
   * Vérifie si une délégation est présente dans une chaîne de teams
   * Utilise une correspondance exacte pour éviter que "Nancy" matche "Télécom Nancy"
   */
  delegationMatches(teamsString: string, delegation: string): boolean {
    if (!teamsString || !delegation) return false;
    
    const teams = teamsString.split(/vs|VS|contre|CONTRE|,/).map((team: string) => team.trim());
    const delegationLower = delegation.toLowerCase();
    
    // Vérifier chaque équipe pour une correspondance exacte
    return teams.some((team: string) => {
      const teamLower = team.toLowerCase();
      // Correspondance exacte (insensible à la casse)
      return teamLower === delegationLower;
    });
  }

  /**
   * Filtre les venues selon les critères
   */
  filterVenues(
    venues: Venue[],
    filters: {
      eventFilter: string;
      venueFilter: string;
      delegationFilter: string;
      showFemale: boolean;
      showMale: boolean;
      showMixed: boolean;
    }
  ): Venue[] {
    return venues.filter(venue => {
      // Filtrage par délégation
      const delegationMatch =
        filters.delegationFilter === 'all' ||
        (venue.matches && venue.matches.some(match =>
          this.delegationMatches(match.teams, filters.delegationFilter)
        ));

      // Filtrage par genre : au moins un match du lieu doit correspondre au filtre de genre
      let genderMatch = true;
      if (venue.matches && venue.matches.length > 0) {
        genderMatch = venue.matches.some(match => {
          const desc = match.description?.toLowerCase() || '';
          const isFemale = desc.includes('féminin');
          const isMale = desc.includes('masculin');
          const isMixed = desc.includes('mixte');
          return (
            (isFemale && filters.showFemale) ||
            (isMale && filters.showMale) ||
            (isMixed && filters.showMixed) ||
            (!isFemale && !isMale && !isMixed) // Si pas de genre précisé, toujours afficher
          );
        });
      }

      // Filtrage par event et lieu
      const shouldShow =
        (filters.eventFilter === 'all' || filters.eventFilter === 'match' || filters.eventFilter === venue.sport) &&
        (filters.venueFilter === 'Tous' || venue.id === filters.venueFilter) &&
        delegationMatch &&
        genderMatch;

      return shouldShow;
    });
  }

  /**
   * Formate la date et l'heure
   */
  formatDateTime(dateString: string, endTimeString?: string): string {
    const date = new Date(dateString);
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const day = days[date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    if (endTimeString) {
      const endTime = new Date(endTimeString);
      const endHours = endTime.getHours().toString().padStart(2, '0');
      const endMinutes = endTime.getMinutes().toString().padStart(2, '0');
      return `${day} ${hours}:${minutes} - ${endHours}:${endMinutes}`;
    }
    
    return `${day} ${hours}:${minutes}`;
  }
}

export const mapService = new MapService();

