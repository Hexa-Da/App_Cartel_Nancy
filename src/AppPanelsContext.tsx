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
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  showAdminModal: boolean;
  setShowAdminModal: React.Dispatch<React.SetStateAction<boolean>>;
  closeAllPanels: () => void;
  closeAllModals: () => void;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  showChat: boolean;
  setShowChat: React.Dispatch<React.SetStateAction<boolean>>;
  chatOriginTab: TabType;
  setChatOriginTab: React.Dispatch<React.SetStateAction<TabType>>;
}

const AppPanelsContext = createContext<AppPanelsContextType | undefined>(undefined);

export const AppPanelsProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [showAddMessage, setShowAddMessage] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatOriginTab, setChatOriginTab] = useState<TabType>('map');
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

  // Annuler l'ajout de message si isEditing passe à false
  useEffect(() => {
    if (!isEditing && showAddMessage) {
      setShowAddMessage(false);
    }
  }, [isEditing, showAddMessage, setShowAddMessage]);

  const closeAllPanels = () => {
    setActiveTab('map');
    setShowAddMessage(false);
    setShowEmergency(false);
  };

  const closeAllModals = () => {
    setShowSettings(false);
    setShowEmergency(false);
    setShowAdminModal(false);
  };

  return (
    <AppPanelsContext.Provider value={{
      activeTab, setActiveTab,
      showAddMessage, setShowAddMessage,
      showEmergency, setShowEmergency,
      showSettings, setShowSettings,
      showAdminModal, setShowAdminModal,
      closeAllPanels,
      closeAllModals,
      isEditing, setIsEditing,
      showChat, setShowChat,
      chatOriginTab, setChatOriginTab
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