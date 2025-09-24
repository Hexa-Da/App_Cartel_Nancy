/**
 * @fileoverview Contexte de gestion des panneaux et navigation de l'application
 * 
 * Ce fichier gère l'état des panneaux et la navigation avec :
 * - Onglet actif (map, events, chat, planning, calendar)
 * - État des modales (ajout message, urgence)
 * - Mode édition pour les administrateurs
 * - Fonctions de fermeture des panneaux
 * 
 * Nécessaire car :
 * - Centralise la logique de navigation entre onglets
 * - Gère l'état des modales et popups
 * - Coordonne l'affichage des panneaux
 * - Évite les conflits d'état entre composants
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

export type TabType = 'map' | 'events' | 'chat' | 'planning' | 'calendar' | 'home' | 'info';

interface AppPanelsContextType {
  activeTab: TabType;
  setActiveTab: React.Dispatch<React.SetStateAction<TabType>>;
  showAddMessage: boolean;
  setShowAddMessage: React.Dispatch<React.SetStateAction<boolean>>;
  showEmergency: boolean;
  setShowEmergency: React.Dispatch<React.SetStateAction<boolean>>;
  closeAllPanels: () => void;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppPanelsContext = createContext<AppPanelsContextType | undefined>(undefined);

export const AppPanelsProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [showAddMessage, setShowAddMessage] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [isEditing, setIsEditing] = useState(() => {
    // Récupérer l'état depuis localStorage au chargement
    const saved = localStorage.getItem('isEditing');
    return saved ? JSON.parse(saved) : false;
  });

  // Sauvegarder l'état isEditing dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem('isEditing', JSON.stringify(isEditing));
  }, [isEditing]);

  // Écouter les changements d'état admin et désactiver isEditing si l'admin se déconnecte
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isAdmin' && e.newValue !== 'true') {
        // Si l'admin se déconnecte, désactiver le mode édition
        setIsEditing(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setIsEditing]);

  const closeAllPanels = () => {
    setActiveTab('map');
    setShowAddMessage(false);
    setShowEmergency(false);
  };

  return (
    <AppPanelsContext.Provider value={{
      activeTab, setActiveTab,
      showAddMessage, setShowAddMessage,
      showEmergency, setShowEmergency,
      closeAllPanels,
      isEditing, setIsEditing
    }}>
      {children}
    </AppPanelsContext.Provider>
  );
};

export const useAppPanels = () => {
  const context = useContext(AppPanelsContext);
  if (!context) {
    throw new Error('useAppPanels must be used within an AppPanelsProvider');
  }
  return context;
}; 