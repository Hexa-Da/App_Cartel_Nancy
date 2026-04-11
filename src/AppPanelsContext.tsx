/**
 * @fileoverview Contexte de compatibilité pour AppPanelsContext
 * 
 * ⚠️ DÉPRÉCIÉ - Ce contexte est déprécié et sera supprimé dans une future version.
 * 
 * Migration vers les nouveaux contextes :
 * - NavigationContext pour activeTab, setActiveTab
 * - ModalContext pour showChat, showEmergency, etc.
 * - FormContext pour newVenueName, editingVenue, etc.
 * - EditingContext pour isEditing, setIsEditing
 * 
 * Ce fichier fournit une interface de compatibilité qui délègue aux nouveaux contextes.
 * L’état formulaire (editingVenue, editingMatch, etc.) vit uniquement dans FormProvider — pas de duplication.
 * Utilisé uniquement pour la rétrocompatibilité pendant la période de transition.
 * 
 * @deprecated Utilisez directement les contextes spécialisés : NavigationContext, ModalContext, FormContext, EditingContext
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useNavigation } from './contexts/NavigationContext';
import { useModal } from './contexts/ModalContext';
import logger from './services/Logger';
import { useForm } from './contexts/FormContext';
import { useEditing } from './contexts/EditingContext';
import { TabType } from './contexts/NavigationContext';
import { Event } from './components/EventDetails';
import type { IEditingMatchState, IEditingVenueState } from './contexts/FormContext';

export type { TabType };

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
  showPlaceTypeModal: boolean;
  setShowPlaceTypeModal: React.Dispatch<React.SetStateAction<boolean>>;
  selectedPlaceType: string | null;
  setSelectedPlaceType: React.Dispatch<React.SetStateAction<string | null>>;
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
  selectedEventType: string;
  setSelectedEventType: React.Dispatch<React.SetStateAction<string>>;
  selectedIndicationType: string;
  setSelectedIndicationType: React.Dispatch<React.SetStateAction<string>>;
  tempMarker: [number, number] | null;
  setTempMarker: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  editingVenue: IEditingVenueState;
  setEditingVenue: React.Dispatch<React.SetStateAction<IEditingVenueState>>;
  // États du formulaire de match
  editingMatch: IEditingMatchState;
  setEditingMatch: React.Dispatch<React.SetStateAction<IEditingMatchState>>;
  newMatch: { date: string, teams: string, description: string, endTime?: string, result?: string };
  setNewMatch: React.Dispatch<React.SetStateAction<{ date: string, teams: string, description: string, endTime?: string, result?: string }>>;
  selectedEvent: Event | null;
  setSelectedEvent: React.Dispatch<React.SetStateAction<Event | null>>;
  selectedPartyForMap: string | null;
  setSelectedPartyForMap: React.Dispatch<React.SetStateAction<string | null>>;
  isPartyMapOpen: boolean;
  setIsPartyMapOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppPanelsContext = createContext<AppPanelsContextType | undefined>(undefined);

export const AppPanelsProvider = ({ children }: { children: React.ReactNode }) => {
  // Utiliser les nouveaux contextes
  const { activeTab, setActiveTab } = useNavigation();
  const {
    showChat,
    setShowChat,
    showEmergency,
    setShowEmergency,
    showSettings,
    setShowSettings,
    showAdminModal,
    setShowAdminModal,
    showAddMessage,
    setShowAddMessage,
    showVSSForm,
    setShowVSSForm,
    showEditMatchModal,
    setShowEditMatchModal,
    showEditVenueModal,
    setShowEditVenueModal,
    showEditResultModal,
    setShowEditResultModal,
    showEditDescriptionModal,
    setShowEditDescriptionModal,
    showEditHotelDescriptionModal,
    setShowEditHotelDescriptionModal,
    showEditRestaurantDescriptionModal,
    setShowEditRestaurantDescriptionModal,
    showPlaceTypeModal,
    setShowPlaceTypeModal,
    chatOriginTab,
    setChatOriginTab,
    closeAllModals: closeAllModalsFromModal
  } = useModal();
  const {
    newVenueName,
    setNewVenueName,
    newVenueDescription,
    setNewVenueDescription,
    newVenueAddress,
    setNewVenueAddress,
    selectedSport,
    setSelectedSport,
    selectedEmoji,
    setSelectedEmoji,
    selectedEventType,
    setSelectedEventType,
    selectedIndicationType,
    setSelectedIndicationType,
    tempMarker,
    setTempMarker,
    editingVenue,
    setEditingVenue,
    editingMatch,
    setEditingMatch,
    newMatch,
    setNewMatch,
    selectedPlaceType,
    setSelectedPlaceType,
    isAddingPlace,
    setIsAddingPlace,
    isPlacingMarker,
    setIsPlacingMarker,
    selectedEvent,
    setSelectedEvent,
    selectedPartyForMap,
    setSelectedPartyForMap,
    isPartyMapOpen,
    setIsPartyMapOpen
  } = useForm();
  const { isEditing, setIsEditing } = useEditing();

  // Annuler l'ajout de message si isEditing passe à false
  useEffect(() => {
    if (!isEditing && showAddMessage) {
      setShowAddMessage(false);
    }
  }, [isEditing, showAddMessage, setShowAddMessage]);

  // Wrapper pour closeAllPanels qui inclut setActiveTab et ferme les modales
  const closeAllPanels = () => {
    setActiveTab('map');
    setShowAddMessage(false);
    setShowEmergency(false);
  };

  // Wrapper pour closeAllModals qui inclut setIsAddingPlace
  const closeAllModals = () => {
    closeAllModalsFromModal();
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
      showPlaceTypeModal, setShowPlaceTypeModal,
      selectedPlaceType, setSelectedPlaceType,
      isAddingPlace, setIsAddingPlace,
      isPlacingMarker, setIsPlacingMarker,
      // États du formulaire de lieu
      newVenueName, setNewVenueName,
      newVenueDescription, setNewVenueDescription,
      newVenueAddress, setNewVenueAddress,
      selectedSport, setSelectedSport,
      selectedEmoji, setSelectedEmoji,
      selectedEventType, setSelectedEventType,
      selectedIndicationType, setSelectedIndicationType,
      tempMarker, setTempMarker,
      editingVenue, setEditingVenue,
      // États du formulaire de match
      editingMatch, setEditingMatch,
      newMatch, setNewMatch,
      selectedEvent, setSelectedEvent,
      selectedPartyForMap, setSelectedPartyForMap,
      isPartyMapOpen, setIsPartyMapOpen
    }}>
      {children}
    </AppPanelsContext.Provider>
  );
};

/**
 * @deprecated Utilisez les hooks spécialisés :
 * - useNavigation() pour activeTab, setActiveTab
 * - useModal() pour showChat, showEmergency, etc.
 * - useForm() pour newVenueName, editingVenue, etc.
 * - useEditing() pour isEditing, setIsEditing
 */
export const useAppPanels = () => {
  if (process.env.NODE_ENV !== 'production') {
    logger.warn(
      '⚠️ useAppPanels est déprécié. ' +
      'Utilisez les hooks spécialisés : useNavigation(), useModal(), useForm(), useEditing()'
    );
  }
  const context = useContext(AppPanelsContext);
  if (!context) {
    throw new Error('useAppPanels must be used within an AppPanelsProvider');
  }
  return context;
}; 