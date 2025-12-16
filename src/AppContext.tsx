/**
 * @fileoverview Contexte global de l'application Cartel Nancy
 * 
 * Ce fichier gère l'état global de l'application avec :
 * - Authentification administrateur (localStorage + état React)
 * - Données Firebase (venues, messages) en temps réel
 * - Fonctions utilitaires (filtres, délégations, genres)
 * 
 * Nécessaire car :
 * - Évite le prop drilling dans toute l'application
 * - Centralise la gestion des données Firebase
 * - Synchronise l'état admin entre les composants
 * - Fournit des fonctions partagées pour les données
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from './firebase';

interface Venue {
  id?: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  position: [number, number];
  date: string;
  emoji: string;
  sport: string;
  matches?: any[];
}

interface AppContextType {
  isAdmin: boolean;
  setIsAdmin: React.Dispatch<React.SetStateAction<boolean>>;
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  venues: Venue[];
  setVenues: React.Dispatch<React.SetStateAction<Venue[]>>;
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  isLoadingVenues: boolean;
  getFilteredEvents: () => Venue[];
  getAllDelegations: () => string[];
  hasGenderMatches: (sport: string) => { hasFemale: boolean, hasMale: boolean, hasMixed: boolean };
  delegationMatches: (teamsString: string, delegation: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);

  // Vérification de l'état admin au chargement
  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
    if (adminStatus) {
      setUser({ isAdmin: true });
    }
  }, []);

  // Écoute des changements d'état admin
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isAdmin') {
        const adminStatus = e.newValue === 'true';
        setIsAdmin(adminStatus);
        if (adminStatus) {
          setUser({ isAdmin: true });
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Lecture des venues depuis Firebase
  useEffect(() => {
    setIsLoadingVenues(true);
    const venuesRef = ref(database, 'venues');
    const unsubscribe = onValue(venuesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const venuesArray = Object.entries(data).map(([id, value]) => ({ 
        id, 
        ...(value as Omit<Venue, 'id'>) 
      }));
      setVenues(venuesArray);
      setIsLoadingVenues(false);
    }, (error) => {
      console.error('Error loading venues:', error);
      setIsLoadingVenues(false);
    });
    return () => unsubscribe();
  }, []);

  // Lecture des messages depuis Firebase
  useEffect(() => {
    const messagesRef = ref(database, 'chatMessages');
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const messagesArray = Object.entries(data).map(([id, value]) => ({ 
        id, 
        ...(value as any) 
      }));
      
      // Trier les messages par timestamp décroissant (plus récents en premier)
      const sortedMessages = messagesArray.sort((a, b) => b.timestamp - a.timestamp);
      
      setMessages(sortedMessages);
    });
    return () => unsubscribe();
  }, []);

  // Fonction pour obtenir les événements filtrés
  const getFilteredEvents = () => {
    return venues;
  };

  // Fonction utilitaire pour vérifier si une délégation est présente dans une chaîne de teams
  // Utilise une correspondance exacte pour éviter que "Nancy" matche "Télécom Nancy"
  const delegationMatches = (teamsString: string, delegation: string): boolean => {
    if (!teamsString || !delegation) return false;
    
    const teams = teamsString.split(/vs|VS|contre|CONTRE|,/).map((team: string) => team.trim());
    const delegationLower = delegation.toLowerCase();
    
    // Vérifier chaque équipe pour une correspondance exacte
    return teams.some((team: string) => {
      const teamLower = team.toLowerCase();
      // Correspondance exacte (insensible à la casse)
      return teamLower === delegationLower;
    });
  };

  // Fonction pour obtenir toutes les délégations
  // Filtre les entrées contenant des mots-clés de phases finales (Poule, Perdant, Vainqueur)
  const getAllDelegations = () => {
    const delegations = new Set<string>();
    const excludedKeywords = ['poule', 'perdant', 'vainqueur'];
    
    venues.forEach(venue => {
      if (venue.matches) {
        venue.matches.forEach((match: any) => {
          const teams = match.teams.split(/vs|VS|contre|CONTRE|,/).map((team: string) => team.trim());
          teams.forEach((team: string) => {
            const teamLower = team.toLowerCase();
            const isExcluded = excludedKeywords.some(keyword => teamLower.includes(keyword));
            if (team && team !== "..." && team !== "…" && !isExcluded) {
              delegations.add(team);
            }
          });
        });
      }
    });
    return Array.from(delegations).sort();
  };

  // Fonction pour vérifier les championnats disponibles pour un sport
  // Note: Le championnat (féminin/masculin/mixte) est défini au niveau de la venue, pas du match
  const hasGenderMatches = (sport: string): { hasFemale: boolean, hasMale: boolean, hasMixed: boolean } => {
    let hasFemale = false;
    let hasMale = false;
    let hasMixed = false;

    venues.forEach(venue => {
      if (venue.sport === sport && venue.matches && venue.matches.length > 0) {
        // Vérifier la description de la venue (pas des matchs)
        const venueDescription = venue.description?.toLowerCase() || '';
        if (venueDescription.includes('féminin')) hasFemale = true;
        if (venueDescription.includes('masculin')) hasMale = true;
        if (venueDescription.includes('mixte')) hasMixed = true;
      }
    });

    return { hasFemale, hasMale, hasMixed };
  };

  return (
    <AppContext.Provider value={{
      isAdmin,
      setIsAdmin,
      user,
      setUser,
      venues,
      setVenues,
      messages,
      setMessages,
      isLoadingVenues,
      getFilteredEvents,
      getAllDelegations,
      hasGenderMatches,
      delegationMatches
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
