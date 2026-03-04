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
import { database, isFirebaseInitialized } from './firebase';
import { firebaseLogger } from './services/FirebaseLogger';
import logger from './services/Logger';
import { delegationMatches as teamDelegationMatches, getAllDelegationsFromVenues } from './services/TeamService';

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

import { UserRole } from './firebase';

interface AppContextType {
  isAdmin: boolean;
  setIsAdmin: React.Dispatch<React.SetStateAction<boolean>>;
  isRespoSport: boolean;
  setIsRespoSport: React.Dispatch<React.SetStateAction<boolean>>;
  userRole: UserRole;
  setUserRole: React.Dispatch<React.SetStateAction<UserRole>>;
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
  const [isRespoSport, setIsRespoSport] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [user, setUser] = useState<any>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);
  const [firebaseReadyAttempt, setFirebaseReadyAttempt] = useState(0);

  // Vérification de l'état admin au chargement
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole') as UserRole;
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    const respoSportStatus = localStorage.getItem('isRespoSport') === 'true';
    
    if (storedRole && (storedRole === 'admin' || storedRole === 'respoSport')) {
      setUserRole(storedRole);
      setIsAdmin(storedRole === 'admin');
      setIsRespoSport(storedRole === 'respoSport');
      setUser({ role: storedRole, isAdmin: storedRole === 'admin', isRespoSport: storedRole === 'respoSport' });
    } else if (adminStatus) {
      // Compatibilité avec l'ancien système
      setUserRole('admin');
      setIsAdmin(true);
      setIsRespoSport(false);
      setUser({ role: 'admin', isAdmin: true, isRespoSport: false });
    } else if (respoSportStatus) {
      setUserRole('respoSport');
      setIsAdmin(false);
      setIsRespoSport(true);
      setUser({ role: 'respoSport', isAdmin: false, isRespoSport: true });
    }
  }, []);

  // Écoute des changements d'état admin
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userRole' || e.key === 'isAdmin' || e.key === 'isRespoSport') {
        const storedRole = localStorage.getItem('userRole') as UserRole;
        const adminStatus = localStorage.getItem('isAdmin') === 'true';
        const respoSportStatus = localStorage.getItem('isRespoSport') === 'true';
        
        if (storedRole && (storedRole === 'admin' || storedRole === 'respoSport')) {
          setUserRole(storedRole);
          setIsAdmin(storedRole === 'admin');
          setIsRespoSport(storedRole === 'respoSport');
          setUser({ role: storedRole, isAdmin: storedRole === 'admin', isRespoSport: storedRole === 'respoSport' });
        } else if (adminStatus) {
          // Compatibilité avec l'ancien système
          setUserRole('admin');
          setIsAdmin(true);
          setIsRespoSport(false);
          setUser({ role: 'admin', isAdmin: true, isRespoSport: false });
        } else if (respoSportStatus) {
          setUserRole('respoSport');
          setIsAdmin(false);
          setIsRespoSport(true);
          setUser({ role: 'respoSport', isAdmin: false, isRespoSport: true });
        } else {
          setUserRole(null);
          setIsAdmin(false);
          setIsRespoSport(false);
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Lecture des venues depuis Firebase (réessaie tant que Firebase n'est pas prêt)
  useEffect(() => {
    if (!isFirebaseInitialized()) {
      logger.warn('[AppContext] Firebase n\'est pas initialisé, attente...');
      setIsLoadingVenues(true);
      const retryTimeout = setTimeout(() => setFirebaseReadyAttempt((a) => a + 1), 500);
      return () => clearTimeout(retryTimeout);
    }

    setIsLoadingVenues(true);
    let isStillLoading = true;
    
    try {
      const venuesRef = ref(database, 'venues');
      
      // Timeout pour détecter les problèmes de connexion
      const connectionTimeout = setTimeout(() => {
        if (isStillLoading) {
          firebaseLogger.logError(
            'read:venues',
            'venues',
            { code: 'TIMEOUT', message: 'Timeout de connexion après 10 secondes' },
            { timeout: 10000 }
          );
        }
      }, 10000);

      const unsubscribe = onValue(
        venuesRef, 
        (snapshot) => {
          clearTimeout(connectionTimeout);
          isStillLoading = false;
          try {
            const data = snapshot.val() || {};
            const venuesArray = Object.entries(data).map(([id, value]) => ({ 
              id, 
              ...(value as Omit<Venue, 'id'>) 
            }));
            setVenues(venuesArray);
            setIsLoadingVenues(false);
          } catch (error) {
            firebaseLogger.logError('read:venues', 'venues', error, { snapshot: snapshot.val() });
            setIsLoadingVenues(false);
          }
        }, 
        (error) => {
          clearTimeout(connectionTimeout);
          isStillLoading = false;
          firebaseLogger.logError('read:venues', 'venues', error);
          setIsLoadingVenues(false);
        }
      );
      
      return () => {
        clearTimeout(connectionTimeout);
        isStillLoading = false;
        unsubscribe();
      };
    } catch (error) {
      logger.error('[AppContext] Erreur lors de l\'accès à Firebase:', error);
      setIsLoadingVenues(false);
    }
  }, [firebaseReadyAttempt]);

  // Lecture des messages depuis Firebase (réessaie tant que Firebase n'est pas prêt)
  useEffect(() => {
    if (!isFirebaseInitialized()) {
      logger.warn('[AppContext] Firebase n\'est pas initialisé pour les messages, attente...');
      const retryTimeout = setTimeout(() => setFirebaseReadyAttempt((a) => a + 1), 500);
      return () => clearTimeout(retryTimeout);
    }

    try {
      const messagesRef = ref(database, 'chatMessages');
      const unsubscribe = onValue(
        messagesRef, 
        (snapshot) => {
          try {
            const data = snapshot.val() || {};
            const messagesArray = Object.entries(data).map(([id, value]) => ({ 
              id, 
              ...(value as any) 
            }));
            
            // Trier les messages par timestamp décroissant (plus récents en premier)
            const sortedMessages = messagesArray.sort((a, b) => b.timestamp - a.timestamp);
            
            setMessages(sortedMessages);
          } catch (error) {
            firebaseLogger.logError('read:messages', 'chatMessages', error, { snapshot: snapshot.val() });
          }
        },
        (error) => {
          firebaseLogger.logError('read:messages', 'chatMessages', error);
        }
      );
      return () => unsubscribe();
    } catch (error) {
      logger.error('[AppContext] Erreur lors de l\'accès à Firebase pour les messages:', error);
    }
  }, [firebaseReadyAttempt]);

  // Fonction pour obtenir les événements filtrés
  const getFilteredEvents = () => {
    return venues;
  };

  const delegationMatches = teamDelegationMatches;
  const getAllDelegations = () => getAllDelegationsFromVenues(venues);

  // Fonction pour vérifier les championnats disponibles pour un sport
  // Le championnat (féminin/masculin/mixte) est défini dans match.description
  const hasGenderMatches = (sport: string): { hasFemale: boolean, hasMale: boolean, hasMixed: boolean } => {
    let hasFemale = false;
    let hasMale = false;
    let hasMixed = false;

    venues.forEach(venue => {
      if (venue.sport === sport && venue.matches) {
        venue.matches.forEach(match => {
          const matchDescription = match.description?.toLowerCase() || '';
          if (matchDescription.includes('féminin')) hasFemale = true;
          if (matchDescription.includes('masculin')) hasMale = true;
          if (matchDescription.includes('mixte')) hasMixed = true;
        });
      }
    });

    return { hasFemale, hasMale, hasMixed };
  };

  return (
    <AppContext.Provider value={{
      isAdmin,
      setIsAdmin,
      isRespoSport,
      setIsRespoSport,
      userRole,
      setUserRole,
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
