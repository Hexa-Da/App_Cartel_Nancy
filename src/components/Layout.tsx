/**
 * @fileoverview Layout principal de l'application avec header, navigation et chat intégré
 * 
 * Ce composant fournit :
 * - Structure générale de l'application (header + contenu + navigation)
 * - Chat en temps réel intégré avec gestion des messages
 * - Header avec logo conditionnel et boutons de navigation
 * - Navigation inférieure avec onglets
 * - Gestion des états de l'application (admin, panels, etc.)
 * - Intégration Firebase pour le chat temps réel
 * 
 * Nécessaire car :
 * - Définit la structure commune à toutes les pages
 * - Centralise la logique du chat intégré
 * - Gère la navigation entre les sections
 * - Assure la cohérence de l'interface utilisateur
 */

import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import './Layout.css';
import Header from './Header';
import { useNavigation, TabType } from '../contexts/NavigationContext';
import { useModal } from '../contexts/ModalContext';
import { useForm } from '../contexts/FormContext';
import { useEditing } from '../contexts/EditingContext';
import { useApp } from '../AppContext';
import VSSForm from './VSSForm';
import EmergencyPopup from './EmergencyPopup';
import ChatPanel from './ChatPanel';
import HSECharterHandler from './forms/HSECharterHandler';
import VenueForm from './forms/VenueForm';
import MatchForm from './forms/MatchForm';
import { useNotifications } from '../hooks/useNotifications';

interface Message {
  id?: string;
  content: string;
  sender: string;
  timestamp: number;
  isAdmin: boolean;
}

const Layout: React.FC = () => {
  const [showAdmin, setShowAdmin] = useState(false);
  
  // Initialiser le service de notifications au démarrage (une seule fois au niveau racine)
  useNotifications();
  
  const { activeTab, setActiveTab } = useNavigation();
  const { isEditing, setIsEditing } = useEditing();
  const {
    showEmergency,
    setShowEmergency,
    showChat,
    setShowChat,
    chatOriginTab,
    showSettings,
    setShowSettings,
    showVSSForm,
    setShowVSSForm,
    showAdminModal,
    setShowAdminModal,
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
    closeAllModals
  } = useModal();
  const {
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
    editingVenue,
    setEditingVenue,
    editingMatch,
    setEditingMatch,
    newMatch,
    setNewMatch,
    tempMarker,
    setTempMarker
  } = useForm();
  const { isAdmin, setIsAdmin, user, setUser, venues, messages, getAllDelegations, hasGenderMatches } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  // Synchroniser activeTab avec location.pathname
    useEffect(() => {
      if (location.pathname === '/home') {
        setActiveTab('home');
      } else if (location.pathname === '/info') {
        setActiveTab('info');
      } else if (location.pathname.startsWith('/info/')) {
        // Garder 'info' pour les sous-routes
        setActiveTab('info');
      }
    }, [location.pathname]);

  // Initialiser le timestamp de dernière lecture seulement si c'est la première fois
  useEffect(() => {
    if (!localStorage.getItem('lastSeenChatTimestamp')) {
      const now = Date.now();
      localStorage.setItem('lastSeenChatTimestamp', String(now));
    }
  }, []);


  // Gestion du bouton physique retour des téléphones
  useEffect(() => {
    let isHandlingPopState = false;

    const handlePopState = (event: PopStateEvent) => {
      if (isHandlingPopState) return;
      isHandlingPopState = true;

      // Utiliser window.location pour avoir la vraie URL actuelle du navigateur
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;

      // Fermer EventDetails en premier si ouvert
      if (selectedEvent) {
        setSelectedEvent(null);
        window.history.replaceState({ path: currentPath, eventDetails: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si RestaurantDescriptionModal est ouvert, le fermer
      if (showEditRestaurantDescriptionModal) {
        setShowEditRestaurantDescriptionModal(false);
        window.history.replaceState({ path: currentPath, restaurantDescription: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si HotelDescriptionModal est ouvert, le fermer
      if (showEditHotelDescriptionModal) {
        setShowEditHotelDescriptionModal(false);
        window.history.replaceState({ path: currentPath, hotelDescription: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si DescriptionModal est ouvert, le fermer
      if (showEditDescriptionModal) {
        setShowEditDescriptionModal(false);
        window.history.replaceState({ path: currentPath, description: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si ResultModal est ouvert, le fermer
      if (showEditResultModal) {
        setShowEditResultModal(false);
        window.history.replaceState({ path: currentPath, result: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si VenueModal est ouvert, le fermer
      if (showEditVenueModal) {
        setShowEditVenueModal(false);
        window.history.replaceState({ path: currentPath, venue: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si MatchModal est ouvert, le fermer
      if (showEditMatchModal) {
        setShowEditMatchModal(false);
        window.history.replaceState({ path: currentPath, match: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si AddPlaceModal est ouvert, le fermer
      if (isAddingPlace) {
        setIsAddingPlace(false);
        window.history.replaceState({ path: currentPath, addPlace: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si AdminModal est ouvert, le fermer
      if (showAdminModal) {
        setShowAdminModal(false);
        window.history.replaceState({ path: currentPath, admin: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si VSSForm est ouvert, le fermer
      if (showVSSForm) {
        setShowVSSForm(false);
        window.history.replaceState({ path: currentPath, vssForm: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si SettingsMenu est ouvert, le fermer
      if (showSettings) {
        setShowSettings(false);
        window.history.replaceState({ path: currentPath, settings: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si EmergencyPopup est ouvert, le fermer
      if (showEmergency) {
        setShowEmergency(false);
        window.history.replaceState({ path: currentPath, emergency: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      if (showChat) {
        setShowChat(false);
        window.history.replaceState({ path: currentPath, chat: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si on est sur le calendrier, revenir à l'onglet d'origine
      if (activeTab === 'calendar') {
        const calendarOriginTab = localStorage.getItem('calendarOriginTab') as TabType | null;
        if (calendarOriginTab === 'events' || calendarOriginTab === 'map') {
          setActiveTab(calendarOriginTab);
          localStorage.removeItem('calendarOriginTab'); // Nettoyer après utilisation
        } else {
          // Fallback: revenir à map par défaut
          setActiveTab('map');
        }
        isHandlingPopState = false;
        return;
      }

      // Si on est sur la page party-map, revenir à la carte principale
      if (activeTab === 'party-map') {
        setSelectedPartyForMap(null);
        setActiveTab('map');
        isHandlingPopState = false;
        return;
      }

      // Si on est sur /planning-files, naviguer vers la page d'origine
      if (currentPath === '/planning-files') {
        const urlParams = new URLSearchParams(window.location.search);
        const fromParam = urlParams.get('from');
        
        if (fromParam === 'info-section') {
          navigate('/info/planning');
        } else {
          navigate('/info');
        }
        isHandlingPopState = false;
        return;
      }

      // Pour les navigations de routes /info et sous-routes, laisser React Router gérer
      if (currentPath.startsWith('/info')) {
        isHandlingPopState = false;
        return;
      }

      // Pour les autres cas, appeler handleBack() pour gérer la navigation
      handleBack();
      isHandlingPopState = false;
    };

    // Écouter les événements de navigation (bouton retour physique)
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showChat, showEmergency, showVSSForm, showSettings, showAdminModal, showEditMatchModal, showEditVenueModal, showEditResultModal, showEditDescriptionModal, showEditHotelDescriptionModal, showEditRestaurantDescriptionModal, isAddingPlace, location.pathname, activeTab, navigate, messages, selectedEvent]);    
  useEffect(() => {
    if (location.pathname === '/home' || location.pathname === '/info') {
      // Vérifier si c'est la première visite pour éviter les replaceState répétés
      const hasReplaced = sessionStorage.getItem(`historyReplaced_${location.pathname}`);
      if (!hasReplaced) {
        window.history.replaceState({ path: location.pathname }, '', location.pathname);
        sessionStorage.setItem(`historyReplaced_${location.pathname}`, 'true');
      }
    }
  }, [location.pathname]);
  
  // Calcul du nombre de messages non lus
  const lastSeenChatTimestamp = Number(localStorage.getItem('lastSeenChatTimestamp') || 0);
  const unreadCount = messages.filter(m => m.timestamp > lastSeenChatTimestamp).length;

  const handleAdminClick = async () => {
    // Cette fonction est maintenant utilisée uniquement pour la déconnexion
    // La connexion se fait directement dans le Header via le modal
  };

  const handleEditClick = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // Si on désactive le mode édition, on réinitialise tous les états liés à l'édition
      setIsAddingPlace(false);
      setEditingVenue({ id: null, venue: null });
      setTempMarker(null);
      setIsPlacingMarker(false);
      setEditingMatch({ venueId: null, match: null });
      setNewMatch({
        date: '',
        teams: '',
        description: '',
        endTime: '',
        result: ''
      });
    }
  };


  // Fonction pour fermer les panneaux locaux (chat, urgence, admin)
  const closeLayoutPanels = () => {
    setShowChat(false);
    setShowEmergency(false);
    setShowAdmin(false);
  };

  const handleBack = () => {
    if (showChat) {
      setShowChat(false);
      // Ne pas changer activeTab - rester sur la page actuelle
      return;
    }

    
    // Gestion de la navigation selon l'URL actuelle
    // Utiliser window.location pour avoir la vraie URL actuelle du navigateur
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    
    // Navigation spécifique selon les routes
    if (currentPath.startsWith('/info/')) {
      // Retour depuis InfoSection vers Info
      navigate('/info');
      return;
    }
    
    if (currentPath === '/planning-files') {
      // Vérifier s'il y a un paramètre indiquant la provenance
      const urlParams = new URLSearchParams(currentSearch);
      const fromParam = urlParams.get('from');
      
      if (fromParam === 'info-section') {
        // Retour vers la section Planning Files dans Info
        navigate('/info/planning');
      } else {
        // Retour par défaut vers Info
        navigate('/info');
      }
      return;
    }
    
    // Utiliser la même logique de navigation que dans App.tsx pour les autres cas
    switch (activeTab) {
      case 'events':
        setActiveTab('map');
        break;
      case 'calendar':
        // Revenir à l'onglet d'origine (map ou events)
        // Récupérer l'onglet d'origine depuis localStorage
        const calendarOriginTab = localStorage.getItem('calendarOriginTab') as TabType | null;
        if (calendarOriginTab === 'events' || calendarOriginTab === 'map') {
          setActiveTab(calendarOriginTab);
          localStorage.removeItem('calendarOriginTab'); // Nettoyer après utilisation
        } else {
          // Fallback: revenir à map par défaut
          setActiveTab('map');
        }
        break;
      case 'party-map':
        setSelectedPartyForMap(null);
        setActiveTab('map');
        break;
      case 'chat':
        // Géré au-dessus
        break;
      case 'home':
      case 'info':
        // Pas de retour possible depuis les pages principales
        return;
      default:
        setActiveTab('map');
    }
  };

  // Mise à jour du timestamp de dernière lecture lors de l'ouverture/fermeture du chat
  const handleChatToggle = () => {
    const wasChatOpen = showChat;
    setShowChat(!showChat);

    if (!wasChatOpen) {
      // Quand on OUVRE le chat, ajouter une entrée dans l'historique
      window.history.pushState({ 
        path: location.pathname, 
        chat: true 
      }, '', location.pathname);
      
      // Mettre à jour le timestamp de dernière lecture quand le chat est ouvert
      if (messages.length > 0) {
        // Les messages sont triés par ordre décroissant, le premier est le plus récent
        const mostRecentMsg = messages[0];
        const newTimestamp = mostRecentMsg.timestamp;
        localStorage.setItem('lastSeenChatTimestamp', String(newTimestamp));
      }
    }
  };



  return (
    <div className="layout">
      <Header
        onChat={handleChatToggle}
        onEmergency={() => {
          setShowEmergency(true);
          window.history.pushState({ path: location.pathname, emergency: true }, '', location.pathname);
        }}
        onAdmin={handleAdminClick}
        showChat={showChat}
        unreadCount={unreadCount}
        onBack={handleBack}
        onEditModeToggle={handleEditClick}
        isEditing={isEditing}
        isBackDisabled={(location.pathname === '/home' || (location.pathname === '/info' && !location.pathname.startsWith('/info/'))) && !showChat && activeTab !== 'events' && activeTab !== 'calendar' && activeTab !== 'party-map'}
        hideBackButton={(location.pathname === '/home' || location.pathname === '/map' || (location.pathname === '/info' && !location.pathname.startsWith('/info/'))) && !showChat && activeTab !== 'events' && activeTab !== 'calendar' && activeTab !== 'party-map'}
      />
      <main className="app-main">
        <Outlet />
      </main>
      {/* Footer supprimé - remplacé par un bouton dans Info.tsx */}
      <BottomNav closeLayoutPanels={closeLayoutPanels} />

      {/* Fenêtre modale pour le chat */}
      {showChat && (
        <ChatPanel 
          isAdmin={isAdmin}
          isEditing={isEditing}
        />
      )}

      {/* Fenêtre modale pour les contacts d'urgence */}
      <EmergencyPopup 
        isOpen={showEmergency}
        onClose={() => setShowEmergency(false)}
        onShowVSS={() => {
          closeAllModals();
          setShowVSSForm(true);
          window.history.pushState({ path: location.pathname, vssForm: true }, '', location.pathname);
        }}
      />

      {/* Formulaire VSS */}
      {showVSSForm && (
        <VSSForm onClose={() => setShowVSSForm(false)} />
      )}

      {/* Popup Charte HSE - Affichée à la première ouverture */}
      <HSECharterHandler />

      {/* Fenêtre modale pour l'administration */}
      {showAdmin && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <h3>Administration</h3>
          </div>
          <div className="chat-container">
            {user ? (
              isAdmin ? (
                <div>
                  <p>Bienvenue, administrateur !</p>
                  <button onClick={() => {
                    localStorage.removeItem('isAdmin');
                    setUser(null);
                    setIsAdmin(false);
                  }}>Se déconnecter</button>
                </div>
              ) : (
                <p>Vous n'avez pas les droits d'administrateur.</p>
              )
            ) : (
              <p>Veuillez vous connecter pour accéder à l'administration.</p>
            )}
          </div>
        </div>
      )}

      {/* Formulaires de venue et match */}
      <VenueForm />
      <MatchForm />
    </div>
  );
};

export default Layout; 