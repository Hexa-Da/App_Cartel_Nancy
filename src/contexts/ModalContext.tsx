/**
 * @fileoverview Contexte de gestion des modales de l'application
 * 
 * Ce contexte gère :
 * - Tous les états d'affichage des modales (chat, emergency, settings, admin, etc.)
 * - Les fonctions de fermeture des modales
 * - L'origine du chat pour la navigation
 * 
 * Nécessaire car :
 * - Centralise la gestion des modales
 * - Évite le prop drilling pour les états de modales
 * - Coordonne l'affichage des différentes modales
 */

import React, { createContext, useContext, useState } from 'react';
import { TabType } from './NavigationContext';

interface ModalContextType {
  showChat: boolean;
  setShowChat: React.Dispatch<React.SetStateAction<boolean>>;
  showEmergency: boolean;
  setShowEmergency: React.Dispatch<React.SetStateAction<boolean>>;
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  showAdminModal: boolean;
  setShowAdminModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAddMessage: boolean;
  setShowAddMessage: React.Dispatch<React.SetStateAction<boolean>>;
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
  chatOriginTab: TabType;
  setChatOriginTab: React.Dispatch<React.SetStateAction<TabType>>;
  closeAllModals: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [showChat, setShowChat] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAddMessage, setShowAddMessage] = useState(false);
  const [showVSSForm, setShowVSSForm] = useState(false);
  const [showEditMatchModal, setShowEditMatchModal] = useState(false);
  const [showEditVenueModal, setShowEditVenueModal] = useState(false);
  const [showEditResultModal, setShowEditResultModal] = useState(false);
  const [showEditDescriptionModal, setShowEditDescriptionModal] = useState(false);
  const [showEditHotelDescriptionModal, setShowEditHotelDescriptionModal] = useState(false);
  const [showEditRestaurantDescriptionModal, setShowEditRestaurantDescriptionModal] = useState(false);
  const [showPlaceTypeModal, setShowPlaceTypeModal] = useState(false);
  const [chatOriginTab, setChatOriginTab] = useState<TabType>('map');

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
    setShowPlaceTypeModal(false);
  };

  return (
    <ModalContext.Provider value={{
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
      closeAllModals
    }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

