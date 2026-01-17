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
  
  const [showFilters, setShowFilters] = useState<boolean>(() => {
    const saved = localStorage.getItem('eventsTabShowFilters');
    return saved !== null ? JSON.parse(saved) : false;
  });

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

  useEffect(() => {
    localStorage.setItem('eventsTabShowFilters', JSON.stringify(showFilters));
  }, [showFilters]);

  // Écouter les changements de filtres via CustomEvent pour synchronisation (même onglet)
  useEffect(() => {
    const handleFilterChange = (e: CustomEvent<{ key: string; value: string | boolean }>) => {
      const { key, value } = e.detail;
      
      switch (key) {
        case 'mapEventFilter':
          if (typeof value === 'string' && value !== eventFilter) {
            setEventFilter(value);
          }
          break;
        case 'mapDelegationFilter':
          if (typeof value === 'string' && value !== delegationFilter) {
            setDelegationFilter(value);
          }
          break;
        case 'mapVenueFilter':
          if (typeof value === 'string' && value !== venueFilter) {
            setVenueFilter(value);
          }
          break;
        case 'mapShowFemale':
          if (typeof value === 'boolean' && value !== showFemale) {
            setShowFemale(value);
          }
          break;
        case 'mapShowMale':
          if (typeof value === 'boolean' && value !== showMale) {
            setShowMale(value);
          }
          break;
        case 'mapShowMixed':
          if (typeof value === 'boolean' && value !== showMixed) {
            setShowMixed(value);
          }
          break;
        case 'eventsTabShowFilters':
          if (typeof value === 'boolean' && value !== showFilters) {
            setShowFilters(value);
          }
          break;
      }
    };

    window.addEventListener('filterChange', handleFilterChange as EventListener);
    return () => window.removeEventListener('filterChange', handleFilterChange as EventListener);
  }, [eventFilter, delegationFilter, venueFilter, showFemale, showMale, showMixed, showFilters]);

  // Écouter les changements de filtres dans localStorage pour synchronisation (autres onglets)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || !e.newValue) return;
      
      switch (e.key) {
        case 'mapEventFilter':
          if (e.newValue !== eventFilter) {
            setEventFilter(e.newValue);
          }
          break;
        case 'mapDelegationFilter':
          if (e.newValue !== delegationFilter) {
            setDelegationFilter(e.newValue);
          }
          break;
        case 'mapVenueFilter':
          if (e.newValue !== venueFilter) {
            setVenueFilter(e.newValue);
          }
          break;
        case 'mapShowFemale':
          const newFemale = e.newValue === 'true';
          if (newFemale !== showFemale) {
            setShowFemale(newFemale);
          }
          break;
        case 'mapShowMale':
          const newMale = e.newValue === 'true';
          if (newMale !== showMale) {
            setShowMale(newMale);
          }
          break;
        case 'mapShowMixed':
          const newMixed = e.newValue === 'true';
          if (newMixed !== showMixed) {
            setShowMixed(newMixed);
          }
          break;
        case 'eventsTabShowFilters':
          const newShowFilters = e.newValue === 'true';
          if (newShowFilters !== showFilters) {
            setShowFilters(newShowFilters);
          }
          break;
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [eventFilter, delegationFilter, venueFilter, showFemale, showMale, showMixed, showFilters]);

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

