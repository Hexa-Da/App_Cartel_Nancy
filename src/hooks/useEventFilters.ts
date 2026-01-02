/**
 * @fileoverview Hook personnalisé pour gérer les filtres d'événements
 * 
 * Ce hook centralise la gestion des filtres d'événements :
 * - Filtre par type d'événement (sport)
 * - Filtre par délégation
 * - Filtre par lieu (venue)
 * - Filtres par genre (féminin, masculin, mixte)
 * - État d'affichage des filtres
 * 
 * Nécessaire car :
 * - Sépare la logique des filtres du composant principal
 * - Facilite la réutilisation et les tests
 * - Améliore la lisibilité du code
 */

import { useState, useEffect } from 'react';

export const useEventFilters = () => {
  const [eventFilter, setEventFilter] = useState<string>(() => {
    const saved = localStorage.getItem('mapEventFilter');
    return saved || 'all';
  });
  
  const [delegationFilter, setDelegationFilter] = useState<string>(() => {
    const saved = localStorage.getItem('mapDelegationFilter');
    return saved || 'all';
  });
  
  const [venueFilter, setVenueFilter] = useState<string>(() => {
    const saved = localStorage.getItem('mapVenueFilter');
    return saved || 'Tous';
  });
  
  const [showFemale, setShowFemale] = useState<boolean>(() => {
    const saved = localStorage.getItem('mapShowFemale');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [showMale, setShowMale] = useState<boolean>(() => {
    const saved = localStorage.getItem('mapShowMale');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [showMixed, setShowMixed] = useState<boolean>(() => {
    const saved = localStorage.getItem('mapShowMixed');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Sauvegarder les filtres dans localStorage quand ils changent
  useEffect(() => {
    localStorage.setItem('mapEventFilter', eventFilter);
  }, [eventFilter]);

  useEffect(() => {
    localStorage.setItem('mapDelegationFilter', delegationFilter);
  }, [delegationFilter]);

  useEffect(() => {
    localStorage.setItem('mapVenueFilter', venueFilter);
  }, [venueFilter]);

  useEffect(() => {
    localStorage.setItem('mapShowFemale', JSON.stringify(showFemale));
  }, [showFemale]);

  useEffect(() => {
    localStorage.setItem('mapShowMale', JSON.stringify(showMale));
  }, [showMale]);

  useEffect(() => {
    localStorage.setItem('mapShowMixed', JSON.stringify(showMixed));
  }, [showMixed]);

  return {
    eventFilter,
    setEventFilter,
    delegationFilter,
    setDelegationFilter,
    venueFilter,
    setVenueFilter,
    showFemale,
    setShowFemale,
    showMale,
    setShowMale,
    showMixed,
    setShowMixed,
    showFilters,
    setShowFilters
  };
};

