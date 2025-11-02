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
  // États des formulaires
  showVSSForm: boolean;
  setShowVSSForm: React.Dispatch<React.SetStateAction<boolean>>;
  showEditMatchModal: boolean;
  setShowEditMatchModal: React.Dispatch<React.SetStateAction<boolean>>;
  showEditVenueModal: boolean;
  setShowEditVenueModal: React.Dispatch<React.SetStateAction<boolean>>;
  showEditResultModal: boolean;
  setShowEditResultModal: React.Dispatch<React.SetStateAction<boolean>>;
  showEditDescriptionModal: boolean;
  setShowEditDescriptionModal: React.Dispatch<React.SetStateAction<boolean>>;
  showEditHotelDescriptionModal: boolean;
  setShowEditHotelDescriptionModal: React.Dispatch<React.SetStateAction<boolean>>;
  showEditRestaurantDescriptionModal: boolean;
  setShowEditRestaurantDescriptionModal: React.Dispatch<React.SetStateAction<boolean>>;
  isAddingPlace: boolean;
  setIsAddingPlace: React.Dispatch<React.SetStateAction<boolean>>;
  isPlacingMarker: boolean;
  setIsPlacingMarker: React.Dispatch<React.SetStateAction<boolean>>;
  // États du formulaire de lieu
  newVenueName: string;
  setNewVenueName: React.Dispatch<React.SetStateAction<string>>;
  newVenueDescription: string;
  setNewVenueDescription: React.Dispatch<React.SetStateAction<string>>;
  newVenueAddress: string;
  setNewVenueAddress: React.Dispatch<React.SetStateAction<string>>;
  selectedSport: string;
  setSelectedSport: React.Dispatch<React.SetStateAction<string>>;
  selectedEmoji: string;
  setSelectedEmoji: React.Dispatch<React.SetStateAction<string>>;
  tempMarker: [number, number] | null;
  setTempMarker: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  editingVenue: { id: string | null, venue: any | null };
  setEditingVenue: React.Dispatch<React.SetStateAction<{ id: string | null, venue: any | null }>>;
  // États du formulaire de match
  editingMatch: { venueId: string | null, match: any | null };
  setEditingMatch: React.Dispatch<React.SetStateAction<{ venueId: string | null, match: any | null }>>;
  newMatch: { date: string, teams: string, description: string, endTime?: string, result?: string };
  setNewMatch: React.Dispatch<React.SetStateAction<{ date: string, teams: string, description: string, endTime?: string, result?: string }>>;
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
  // États des formulaires
  const [showVSSForm, setShowVSSForm] = useState(false);
  const [showEditMatchModal, setShowEditMatchModal] = useState(false);
  const [showEditVenueModal, setShowEditVenueModal] = useState(false);
  const [showEditResultModal, setShowEditResultModal] = useState(false);
  const [showEditDescriptionModal, setShowEditDescriptionModal] = useState(false);
  const [showEditHotelDescriptionModal, setShowEditHotelDescriptionModal] = useState(false);
  const [showEditRestaurantDescriptionModal, setShowEditRestaurantDescriptionModal] = useState(false);
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [isPlacingMarker, setIsPlacingMarker] = useState(false);
  // États du formulaire de lieu
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueDescription, setNewVenueDescription] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');
  const [selectedSport, setSelectedSport] = useState('Football');
  const [selectedEmoji, setSelectedEmoji] = useState('⚽');
  const [tempMarker, setTempMarker] = useState<[number, number] | null>(null);
  const [editingVenue, setEditingVenue] = useState<{ id: string | null, venue: any | null }>({ id: null, venue: null });
  // États du formulaire de match
  const [editingMatch, setEditingMatch] = useState<{ venueId: string | null, match: any | null }>({ venueId: null, match: null });
  const [newMatch, setNewMatch] = useState<{ date: string, teams: string, description: string, endTime?: string, result?: string }>({
    date: '',
    teams: '',
    description: '',
    endTime: '',
    result: ''
  });
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
    setShowVSSForm(false);
    setShowEditMatchModal(false);
    setShowEditVenueModal(false);
    setShowEditResultModal(false);
    setShowEditDescriptionModal(false);
    setShowEditHotelDescriptionModal(false);
    setShowEditRestaurantDescriptionModal(false);
    setIsAddingPlace(false);
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
      chatOriginTab, setChatOriginTab,
      // États des formulaires
      showVSSForm, setShowVSSForm,
      showEditMatchModal, setShowEditMatchModal,
      showEditVenueModal, setShowEditVenueModal,
      showEditResultModal, setShowEditResultModal,
      showEditDescriptionModal, setShowEditDescriptionModal,
      showEditHotelDescriptionModal, setShowEditHotelDescriptionModal,
      showEditRestaurantDescriptionModal, setShowEditRestaurantDescriptionModal,
      isAddingPlace, setIsAddingPlace,
      isPlacingMarker, setIsPlacingMarker,
      // États du formulaire de lieu
      newVenueName, setNewVenueName,
      newVenueDescription, setNewVenueDescription,
      newVenueAddress, setNewVenueAddress,
      selectedSport, setSelectedSport,
      selectedEmoji, setSelectedEmoji,
      tempMarker, setTempMarker,
      editingVenue, setEditingVenue,
      // États du formulaire de match
      editingMatch, setEditingMatch,
      newMatch, setNewMatch
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