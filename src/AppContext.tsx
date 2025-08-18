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
  getFilteredEvents: () => Venue[];
  getAllDelegations: () => string[];
  hasGenderMatches: (sport: string) => { hasFemale: boolean, hasMale: boolean, hasMixed: boolean };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

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
    const venuesRef = ref(database, 'venues');
    const unsubscribe = onValue(venuesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const venuesArray = Object.entries(data).map(([id, value]) => ({ 
        id, 
        ...(value as Omit<Venue, 'id'>) 
      }));
      setVenues(venuesArray);
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

  // Fonction pour obtenir toutes les délégations
  const getAllDelegations = () => {
    const delegations = new Set<string>();
    venues.forEach(venue => {
      if (venue.matches) {
        venue.matches.forEach((match: any) => {
          const teams = match.teams.split(/vs|VS|contre|CONTRE|,/).map((team: string) => team.trim());
          teams.forEach((team: string) => {
            if (team && team !== "..." && team !== "…") delegations.add(team);
          });
        });
      }
    });
    return Array.from(delegations).sort();
  };

  // Fonction pour vérifier les championnats disponibles pour un sport
  const hasGenderMatches = (sport: string): { hasFemale: boolean, hasMale: boolean, hasMixed: boolean } => {
    let hasFemale = false;
    let hasMale = false;
    let hasMixed = false;

    venues.forEach(venue => {
      if (venue.sport === sport && venue.matches) {
        venue.matches.forEach((match: any) => {
          if (match.description?.toLowerCase().includes('féminin')) hasFemale = true;
          if (match.description?.toLowerCase().includes('masculin')) hasMale = true;
          if (match.description?.toLowerCase().includes('mixte')) hasMixed = true;
        });
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
      getFilteredEvents,
      getAllDelegations,
      hasGenderMatches
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
