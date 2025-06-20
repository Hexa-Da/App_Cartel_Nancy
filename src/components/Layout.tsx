import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import './Layout.css';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { database, auth, loginWithGoogle } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import Header from './Header';
import { useAppPanels } from '../AppPanelsContext';
import VSSForm from './VSSForm';
import { Capacitor } from '@capacitor/core';

const sportEmojis = {
  'Football': '⚽',
  'Basketball': '🏀',
  'Handball': '🤾',
  'Rugby': '🏉',
  'Ultimate': '🥏',
  'Natation': '🏊',
  'Badminton': '🏸',
  'Tennis': '🎾',
  'Cross': '🏃',
  'Volleyball': '🏐',
  'Ping-pong': '🏓',
  'Boxe': '🥊',
  'Athlétisme': '🏃‍♂️',
  'Pétanque': '🍹',
  'Escalade': '🧗‍♂️',
  'Jeux de société': '🎲'
} as const;

interface Message {
  id?: string;
  content: string;
  sender: string;
  timestamp: number;
  isAdmin: boolean;
}

interface Match {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  position: [number, number];
  date: string;
  type: 'match';
  teams: string;
  sport: string;
  time: string;
  endTime?: string;
  result?: string;
  venueId: string;
  emoji: string;
}

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
  matches?: Match[];
}

const Layout: React.FC = () => {
  const [showChat, setShowChat] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showVSSForm, setShowVSSForm] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const { isEditing, setIsEditing, activeTab, setActiveTab } = useAppPanels();
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueDescription, setNewVenueDescription] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');
  const [selectedSport, setSelectedSport] = useState('Football');
  const [selectedEmoji, setSelectedEmoji] = useState('⚽');
  const [tempMarker, setTempMarker] = useState<[number, number] | null>(null);
  const [isPlacingMarker, setIsPlacingMarker] = useState(false);
  const [editingVenue, setEditingVenue] = useState<{ id: string | null, venue: Venue | null }>({ id: null, venue: null });
  const [editingMatch, setEditingMatch] = useState<{ venueId: string | null, match: Match | null }>({ venueId: null, match: null });
  const [newMatch, setNewMatch] = useState<{ date: string, teams: string, description: string, endTime?: string, result?: string }>({
    date: '',
    teams: '',
    description: '',
    endTime: '',
    result: ''
  });
  const [showAddMessage, setShowAddMessage] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newMessageSender, setNewMessageSender] = useState('Organisation');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Ajoute la classe de la plateforme au body
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    document.body.classList.add(platform);
  }, []);

  // Gestion de l'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        
        // Vérifier si l'utilisateur est admin
        const adminsRef = ref(database, 'admins');
        onValue(adminsRef, (snapshot) => {
          const admins = snapshot.val();
          setIsAdmin(admins && admins[user.uid]);
        });
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Lecture en temps réel des messages depuis Firebase
  useEffect(() => {
    const messagesRef = ref(database, 'chatMessages');
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val() || {};
      // Transforme l'objet en tableau [{id, ...}]
      const messagesArray = Object.entries(data).map(([id, value]) => ({ id, ...(value as any) }));
      
      // Initialiser le timestamp de dernière lecture seulement si c'est la première fois
      if (!localStorage.getItem('lastSeenChatTimestamp')) {
        const now = Date.now();
        localStorage.setItem('lastSeenChatTimestamp', String(now));
      }
      
      setMessages(messagesArray);
    });
    return () => unsubscribe();
  }, []);

  // Lecture en temps réel des venues depuis Firebase
  useEffect(() => {
    const venuesRef = ref(database, 'venues');
    const unsubscribe = onValue(venuesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const venuesArray = Object.entries(data).map(([id, value]) => ({ id, ...(value as any) }));
      setVenues(venuesArray);
    });
    return () => unsubscribe();
  }, []);

  // Gestion du bouton physique retour des téléphones
  useEffect(() => {
    let isHandlingPopState = false;

    const handlePopState = (event: PopStateEvent) => {
      if (isHandlingPopState) return;
      isHandlingPopState = true;

      // Si le chat est ouvert, le fermer
      if (showChat) {
        setShowChat(false);
        // Empêcher la navigation en ajoutant une nouvelle entrée
        window.history.pushState({ path: location.pathname, chat: false }, '', location.pathname);
        isHandlingPopState = false;
        return;
      }
      
      // Pages principales : empêcher complètement la navigation
      if (location.pathname === '/' || location.pathname === '/info') {
        // Empêcher la navigation en ajoutant une nouvelle entrée
        window.history.pushState({ path: location.pathname }, '', location.pathname);
        isHandlingPopState = false;
        return;
      }
      
      // Pour la page map, gérer selon la logique existante
      if (location.pathname === '/map') {
        if (activeTab !== 'map') {
          setActiveTab('map');
          window.history.pushState({ path: location.pathname, tab: 'map' }, '', location.pathname);
        } else {
          // Permettre la navigation normale
          navigate(-1);
        }
      }
      
      isHandlingPopState = false;
    };

    // Écouter les événements de navigation (bouton retour physique)
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showChat, location.pathname, activeTab, navigate]);

  // Ajouter une entrée dans l'historique pour les pages principales et empêcher le retour
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/info') {
      // Remplacer l'entrée actuelle et ajouter une nouvelle pour empêcher le retour
      window.history.replaceState({ path: location.pathname }, '', location.pathname);
      window.history.pushState({ path: location.pathname }, '', location.pathname);
    }
  }, [location.pathname]);

  // Gestion agressive pour empêcher le retour sur les pages principales
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/info') {
      const preventBack = (e: PopStateEvent) => {
        if (location.pathname === '/' || location.pathname === '/info') {
          window.history.pushState({ path: location.pathname }, '', location.pathname);
        }
      };
      
      window.addEventListener('popstate', preventBack);
      return () => window.removeEventListener('popstate', preventBack);
    }
  }, [location.pathname]);

  // Calcul du nombre de messages non lus
  const lastSeenChatTimestamp = Number(localStorage.getItem('lastSeenChatTimestamp') || 0);
  const unreadCount = messages.filter(m => m.timestamp > lastSeenChatTimestamp).length;

  const handleAdminClick = async () => {
    if (!user) {
      try {
        await loginWithGoogle();
      } catch (error) {
        console.error("Erreur de connexion:", error);
        alert("Erreur lors de la connexion. Veuillez réessayer.");
      }
    } else {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Erreur de déconnexion:", error);
        alert("Erreur lors de la déconnexion. Veuillez réessayer.");
      }
    }
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

  const handleAddVenue = async () => {
    if (!isAdmin) return;

    if (!newVenueName || !newVenueDescription || (!newVenueAddress && !tempMarker)) {
      alert('Veuillez remplir tous les champs requis ou placer un marqueur sur la carte.');
      return;
    }

    let coordinates: [number, number] | null = null;
    
    if (tempMarker) {
      coordinates = tempMarker;
    } else if (newVenueAddress) {
      // Géocodage de l'adresse
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newVenueAddress)}`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          coordinates = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
      } catch (error) {
        console.error('Erreur de géocodage:', error);
      }
    }

    if (!coordinates) {
      alert('Une erreur est survenue lors de la récupération des coordonnées.');
      return;
    }

    const venuesRef = ref(database, 'venues');
    const newVenueRef = push(venuesRef);
    const newVenue: Omit<Venue, 'id'> = {
      name: newVenueName,
      position: coordinates,
      description: newVenueDescription,
      address: newVenueAddress || `${coordinates[0]}, ${coordinates[1]}`,
      matches: [],
      sport: selectedSport,
      date: '',
      latitude: coordinates[0],
      longitude: coordinates[1],
      emoji: selectedEmoji
    };

    try {
      await set(newVenueRef, newVenue);
      
      setNewVenueName('');
      setNewVenueDescription('');
      setNewVenueAddress('');
      setSelectedSport('Football');
      setTempMarker(null);
      setIsPlacingMarker(false);
      setIsAddingPlace(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du lieu:', error);
      alert('Une erreur est survenue lors de l\'ajout du lieu.');
    }
  };

  const handleUpdateVenue = async () => {
    if (!isAdmin || !editingVenue.id) return;

    if (!newVenueName || !newVenueDescription) {
      alert('Veuillez remplir tous les champs requis.');
      return;
    }

    const coordinates: [number, number] = tempMarker || [editingVenue.venue?.latitude || 0, editingVenue.venue?.longitude || 0];
    
    const venueRef = ref(database, `venues/${editingVenue.id}`);
    const updatedVenue = {
      ...editingVenue.venue,
      name: newVenueName,
      description: newVenueDescription,
      address: newVenueAddress || `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`,
      sport: selectedSport,
      latitude: coordinates[0],
      longitude: coordinates[1],
      position: coordinates,
      emoji: selectedEmoji
    };

    try {
      await set(venueRef, updatedVenue);
      
      setNewVenueName('');
      setNewVenueDescription('');
      setNewVenueAddress('');
      setSelectedSport('Football');
      setTempMarker(null);
      setEditingVenue({ id: null, venue: null });
      setIsAddingPlace(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du lieu:', error);
      alert('Une erreur est survenue lors de la mise à jour du lieu.');
    }
  };

  const deleteVenue = async (id: string) => {
    if (!isAdmin) return;

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce lieu ? Cette action est irréversible.')) {
      return;
    }

    const venueRef = ref(database, `venues/${id}`);
    await set(venueRef, null);
  };

  // Fonction pour ajouter un nouveau match
  const handleAddMatch = async (venueId: string) => {
    if (!isAdmin) return;

    const venueRef = ref(database, `venues/${venueId}`);
    onValue(venueRef, (snapshot) => {
      const venue = snapshot.val();
      if (!venue) return;

      if (!newMatch.date || !newMatch.teams || !newMatch.description) {
        alert('Veuillez remplir tous les champs requis (date de début, équipes et description)');
        return;
      }

      const matchId = uuidv4();
      const match: Match = {
        id: matchId,
        name: `${venue.name} - Match`,
        description: newMatch.description,
        address: venue.address,
        latitude: venue.latitude,
        longitude: venue.longitude,
        position: [venue.latitude, venue.longitude],
        date: newMatch.date,
        type: 'match',
        teams: newMatch.teams,
        sport: venue.sport,
        time: new Date(newMatch.date).toTimeString().split(' ')[0],
        endTime: newMatch.endTime || '',
        result: newMatch.result || '',
        venueId: venue.id,
        emoji: venue.emoji
      };

      const updatedMatches = [...(venue.matches || []), match];
      
      set(venueRef, {
        ...venue,
        matches: updatedMatches
      });

      // Réinitialiser le formulaire
      setNewMatch({
        date: '',
        teams: '',
        description: '',
        endTime: '',
        result: ''
      });
      setEditingMatch({ venueId: null, match: null });
    });
  };

  // Fonction pour mettre à jour un match
  const handleUpdateMatch = async (venueId: string, matchId: string, updatedData: Partial<Match>) => {
    if (!isAdmin) return;
    
    const venueRef = ref(database, `venues/${venueId}`);
    onValue(venueRef, (snapshot) => {
      const venue = snapshot.val();
      if (!venue) return;

      const updatedMatches = venue.matches.map((match: Match) =>
        match.id === matchId ? { ...match, ...updatedData } : match
      );
      
      set(venueRef, {
        ...venue,
        matches: updatedMatches
      });
      
      setEditingMatch({ venueId: null, match: null });
    });
  };

  // Fonction pour supprimer un match
  const deleteMatch = async (venueId: string, matchId: string) => {
    if (!isAdmin) return;

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce match ? Cette action est irréversible.')) {
      return;
    }
    
    const venueRef = ref(database, `venues/${venueId}`);
    onValue(venueRef, (snapshot) => {
      const venue = snapshot.val();
      if (!venue) return;

      const updatedMatches = venue.matches.filter((match: Match) => match.id !== matchId);
      
      set(venueRef, {
        ...venue,
        matches: updatedMatches
      });
    });
  };

  // Fonction pour commencer l'édition d'un match
  const startEditingMatch = (venueId: string, match: Match | null) => {
    if (!isAdmin) return;

    setEditingMatch({ venueId, match });
    
    if (match) {
      setNewMatch({
        date: match.date,
        teams: match.teams,
        description: match.description,
        endTime: match.endTime,
        result: match.result
      });
    } else {
      setNewMatch({ date: '', teams: '', description: '', endTime: '', result: '' });
    }
  };

  // Fonction pour terminer l'édition d'un match
  const finishEditingMatch = () => {
    setEditingMatch({ venueId: null, match: null });
  };

  // Ajout d'un message dans Firebase
  const handleAddMessage = (msg: string, sender: string) => {
    const newMsgRef = push(ref(database, 'chatMessages'));
    set(newMsgRef, {
      content: msg,
      sender: sender || 'Organisation',
      timestamp: Date.now(),
      isAdmin: true
    });

    // Notification locale (web)
    if (window.Notification && Notification.permission === 'granted') {
      new Notification('Nouveau message de l\'organisation', {
        body: msg,
        icon: '/favicon.png'
      });
    } else if (window.Notification && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Nouveau message de l\'organisation', {
            body: msg,
            icon: '/favicon.png'
          });
        }
      });
    }
  };

  // Modification d'un message dans Firebase
  const handleEditMessage = (id: string, newContent: string, newSender: string) => {
    update(ref(database, `chatMessages/${id}`), { content: newContent, sender: newSender || 'Organisation' });
  };

  // Suppression d'un message dans Firebase
  const handleDeleteMessage = (id: string) => {
    remove(ref(database, `chatMessages/${id}`));
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
      return;
    }
    if (activeTab !== 'map') {
      setActiveTab('map');
    } else {
      navigate(-1);
    }
  };

  // Mise à jour du timestamp de dernière lecture lors de l'ouverture du chat
  const handleChatToggle = () => {
    if (!showChat) {
      // Ajouter une entrée dans l'historique quand on ouvre le chat
      window.history.pushState({ path: location.pathname, chat: true }, '', location.pathname);
    }
    
    setShowChat(!showChat);
    if (!showChat && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const newTimestamp = lastMsg.timestamp;
      localStorage.setItem('lastSeenChatTimestamp', String(newTimestamp));
      console.log('Layout - Updated lastSeenChatTimestamp:', newTimestamp);
    }
  };

  // Fonction pour obtenir toutes les délégations uniques
  const getAllDelegations = () => {
    const delegations = new Set<string>();
    venues.forEach(venue => {
      if (venue.matches) {
        venue.matches.forEach(match => {
          const teams = match.teams.split(/vs|VS|contre|CONTRE|,/).map(team => team.trim());
          teams.forEach(team => {
            // Exclure les "..." et les chaînes vides
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
        venue.matches.forEach(match => {
          if (match.description?.toLowerCase().includes('féminin')) hasFemale = true;
          if (match.description?.toLowerCase().includes('masculin')) hasMale = true;
          if (match.description?.toLowerCase().includes('mixte')) hasMixed = true;
        });
      }
    });

    return { hasFemale, hasMale, hasMixed };
  };

  return (
    <div className="layout">
      <Header
        onChat={handleChatToggle}
        onEmergency={() => setShowEmergency(true)}
        onAdmin={handleAdminClick}
        isAdmin={isAdmin}
        user={user}
        showChat={showChat}
        unreadCount={unreadCount}
        onBack={handleBack}
        onEditModeToggle={handleEditClick}
        isEditing={isEditing}
        getAllDelegations={getAllDelegations}
        hasGenderMatches={hasGenderMatches}
        isBackDisabled={(location.pathname === '/' || location.pathname === '/info') && !showChat}
      />
      <main className="app-main">
        <Outlet context={{ 
          getFilteredEvents: () => venues,
          getAllDelegations,
          userPreferences: {
            favoriteSports:  localStorage.getItem('preferredSport') || 'all',
            delegation: localStorage.getItem('preferredDelegation') || 'all'
          } 
        }} />
      </main>
      <BottomNav closeLayoutPanels={closeLayoutPanels} />

      {/* Fenêtre modale pour le chat */}
      {showChat && (
        <div className={`chat-panel ${location.pathname === '/' || location.pathname === '/info' ? 'home-info-chat' : ''}`}>
          <div className="chat-panel-header">
            <h3>Messages de l'orga</h3>
            <div style={{ display: 'flex', alignItems: 'center'}}>
              {isAdmin && (
                <button
                  className="add-message-button"
                  onClick={() => setShowAddMessage((v) => !v)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 20, width: 70, marginTop: '3.8rem' }}
                >
                  {showAddMessage ? 'Annuler' : 'Ajouter'}
                </button>
              )}
            </div>
          </div>
          {showAddMessage && (
            <form
              className="add-message-form"
              style={{ display: 'flex', gap: '8px', padding: '1rem', alignItems: 'center', background: 'var(--bg-secondary)' }}
              onSubmit={e => {
                e.preventDefault();
                if (newMessage.trim()) {
                  if (editingMessageId) {
                    handleEditMessage(editingMessageId, newMessage, newMessageSender || 'Organisation');
                  } else {
                    handleAddMessage(newMessage, newMessageSender || 'Organisation');
                  }
                  setNewMessage('');
                  setNewMessageSender('Organisation');
                  setShowAddMessage(false);
                  setEditingMessageId(null);
                }
              }}
            >
              {isAdmin && (
                <input
                  type="text"
                  value={newMessageSender}
                  onChange={e => setNewMessageSender(e.target.value)}
                  placeholder="Nom (ex: Organisation, Prénom...)"
                  style={{ width: 100, height: 25, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                />
              )}
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Votre message..."
                style={{ flex: 1, height: 25, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                autoFocus
              />
              <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                ➡️
              </button>
            </form>
          )}
          <div className="chat-container">
            {messages.map((message, index) => (
              <div key={message.id || index} className={`chat-message ${message.isAdmin ? 'admin' : ''}`} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div className="chat-message-header" style={{ justifyContent: 'space-between' }}>
                  <span>{message.sender || 'Organisation'}</span>
                  <span>{new Date(message.timestamp).toLocaleString()}</span>
                </div>
                <div className="chat-message-content" style={{ paddingBottom: isAdmin ? 28 : 0, textAlign: 'left' }}>
                  {message.content}
                </div>
                {isAdmin && (
                  <div style={{ position: 'absolute', right: 0, bottom: 6, display: 'flex', gap: 0 }}>
                    <button
                      className="edit-message-button"
                      title="Modifier"
                      onClick={() => {
                        setShowAddMessage(true);
                        setNewMessage(message.content);
                        setNewMessageSender(message.sender || 'Organisation');
                        setEditingMessageId(message.id || null);
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3498db', fontSize: 16 }}
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-message-button"
                      title="Supprimer"
                      onClick={() => {
                        if (window.confirm('Supprimer ce message ?') && message.id) {
                          handleDeleteMessage(message.id);
                        }
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', fontSize: 16 }}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fenêtre modale pour les contacts d'urgence */}
      {showEmergency && (
        <div className="emergency-popup" onClick={() => setShowEmergency(false)}>
          <div className="emergency-popup-content" onClick={e => e.stopPropagation()}>
            <div className="emergency-popup-header">
            <h3>Contacts d'urgence</h3>
              <button 
                className="close-button" 
                onClick={() => setShowEmergency(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  position: 'absolute',
                  right: '-0.5rem',
                  top: '0rem',
                  color: 'var(--text-color)'
                }}
              >
                ×
              </button>
            </div>
            <ul style={{ textAlign: 'left', margin: '1.5rem 1rem' }}>
              <li><strong>SAMU :</strong> 15</li>
              <li><strong>Police :</strong> 17</li>
              <li><strong>Pompier :</strong> 18</li>
              <li><strong>Numéro européen :</strong> 112</li>
            </ul>
            <div style={{
              padding: '1rem',
              marginTop: '1rem',
              borderTop: '1px solid var(--border-color)',
              textAlign: 'center'
            }}>
              <button
                onClick={() => {
                  setShowVSSForm(true);
                  setShowEmergency(false);
                }}
                style={{
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#c0392b';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#e74c3c';
                }}
              >
                Signaler une VSS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire VSS */}
      {showVSSForm && (
        <VSSForm onClose={() => setShowVSSForm(false)} />
      )}

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
                  <button onClick={() => signOut(auth)}>Se déconnecter</button>
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

      {/* Formulaire d'ajout/modification de match */}
      {editingMatch.venueId && (
        <div className="form-overlay">
          <div className="edit-form match-edit-form">
            <div className="edit-form-header">
              <h3>{editingMatch.match ? 'Modifier le match' : 'Ajouter un match'}</h3>
            </div>
            <div className="edit-form-content">
              <div className="form-group">
                <label htmlFor="match-date">Date et heure de début</label>
                <input
                  id="match-date"
                  type="datetime-local"
                  value={editingMatch.match ? editingMatch.match.date : newMatch.date}
                  onChange={(e) => {
                    if (editingMatch.match) {
                      const updatedMatch = { ...editingMatch.match, date: e.target.value };
                      setEditingMatch({ ...editingMatch, match: updatedMatch });
                    } else {
                      setNewMatch({ ...newMatch, date: e.target.value });
                    }
                  }}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="match-end-time">Heure de fin</label>
                <input
                  id="match-end-time"
                  type="datetime-local"
                  value={editingMatch.match ? editingMatch.match.endTime : (newMatch.endTime || '')}
                  min={editingMatch.match ? editingMatch.match.date : newMatch.date}
                  onChange={(e) => {
                    if (editingMatch.match) {
                      const updatedMatch = { ...editingMatch.match, endTime: e.target.value };
                      setEditingMatch({ ...editingMatch, match: updatedMatch });
                    } else {
                      setNewMatch({ ...newMatch, endTime: e.target.value });
                    }
                  }}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="match-teams">Équipes</label>
                <input
                  id="match-teams"
                  type="text"
                  value={editingMatch.match ? editingMatch.match.teams : newMatch.teams}
                  onChange={(e) => {
                    if (editingMatch.match) {
                      const updatedMatch = { ...editingMatch.match, teams: e.target.value };
                      setEditingMatch({ ...editingMatch, match: updatedMatch });
                    } else {
                      setNewMatch({ ...newMatch, teams: e.target.value });
                    }
                  }}
                  placeholder="Ex: Nancy vs Alès"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="match-description">Description</label>
                <input
                  id="match-description"
                  type="text"
                  value={editingMatch.match ? editingMatch.match.description : newMatch.description}
                  onChange={(e) => {
                    if (editingMatch.match) {
                      const updatedMatch = { ...editingMatch.match, description: e.target.value };
                      setEditingMatch({ ...editingMatch, match: updatedMatch });
                    } else {
                      setNewMatch({ ...newMatch, description: e.target.value });
                    }
                  }}
                  placeholder="Ex: Phase de poules M"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="match-result">Résultat</label>
                <input
                  id="match-result"
                  type="text"
                  value={editingMatch.match ? editingMatch.match.result : (newMatch.result || '')}
                  onChange={(e) => {
                    if (editingMatch.match) {
                      const updatedMatch = { ...editingMatch.match, result: e.target.value };
                      setEditingMatch({ ...editingMatch, match: updatedMatch });
                    } else {
                      setNewMatch({ ...newMatch, result: e.target.value });
                    }
                  }}
                  placeholder="Ex: 2-1"
                  className="form-input"
                />
              </div>
              <div className="form-actions">
                <button 
                  className="add-button"
                  onClick={() => {
                    if (editingMatch.match) {
                      handleUpdateMatch(
                        editingMatch.venueId!, 
                        editingMatch.match.id, 
                        {
                          date: editingMatch.match.date,
                          endTime: editingMatch.match.endTime || '',
                          teams: editingMatch.match.teams,
                          description: editingMatch.match.description,
                          result: editingMatch.match.result
                        }
                      );
                      finishEditingMatch();
                    } else {
                      handleAddMatch(editingMatch.venueId!);
                    }
                  }}
                  disabled={
                    editingMatch.match 
                      ? !editingMatch.match.date || !editingMatch.match.teams || !editingMatch.match.description
                      : !newMatch.date || !newMatch.teams || !newMatch.description
                  }
                >
                  {editingMatch.match ? 'Mettre à jour' : 'Ajouter'}
                </button>
                <button 
                  className="cancel-button"
                  onClick={finishEditingMatch}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'édition de lieu */}
      {isAddingPlace && (
        <div className="form-overlay">
          <div className="edit-form venue-edit-form">
            <div className="edit-form-header">
              <h3>{editingVenue.id ? 'Modifier le lieu' : 'Ajouter un lieu'}</h3>
            </div>
            <div className="edit-form-content">
              <div className="form-group">
                <label htmlFor="venue-name">Nom du lieu</label>
                <input
                  id="venue-name"
                  type="text"
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                  placeholder="Ex: Gymnase Raymond Poincaré"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="venue-description">Description</label>
                <input
                  id="venue-description"
                  type="text"
                  value={newVenueDescription}
                  onChange={(e) => setNewVenueDescription(e.target.value)}
                  placeholder="Ex: Pour rentrer il faut..."
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input
                  id="venue-address"
                  type="text"
                  value={newVenueAddress}
                  onChange={(e) => setNewVenueAddress(e.target.value)}
                  placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy"
                  className="form-input"
                />
                <button
                  className="place-marker-button"
                  onClick={() => {
                    setIsPlacingMarker(true);
                    setIsAddingPlace(false);
                  }}
                >
                  Placer sur la carte
                </button>
              </div>
              <div className="form-group">
                <label htmlFor="venue-sport">Sport</label>
                <select
                  id="venue-sport"
                  value={selectedSport}
                  onChange={(e) => {
                    setSelectedSport(e.target.value);
                    setSelectedEmoji(sportEmojis[e.target.value as keyof typeof sportEmojis] || '⚽');
                  }}
                  className="form-input"
                >
                  <option value="Football">Football ⚽</option>
                  <option value="Basketball">Basketball 🏀</option>
                  <option value="Handball">Handball 🤾</option>
                  <option value="Rugby">Rugby 🏉</option>
                  <option value="Ultimate">Ultimate 🥏</option>
                  <option value="Natation">Natation 🏊</option>
                  <option value="Badminton">Badminton 🏸</option>
                  <option value="Tennis">Tennis 🎾</option>
                  <option value="Cross">Cross 🏃</option>
                  <option value="Volleyball">Volleyball 🏐</option>
                  <option value="Ping-pong">Ping-pong 🏓</option>
                  <option value="Boxe">Boxe 🥊</option>
                  <option value="Athlétisme">Athlétisme 🏃‍♂️</option>
                  <option value="Pétanque">Pétanque 🍹</option>
                  <option value="Escalade">Escalade 🧗‍♂️</option>
                  <option value="Jeux de société">Jeux de société 🎲</option>
                </select>
              </div>
              <div className="form-actions">
                <button
                  className="add-button"
                  onClick={() => {
                    if (editingVenue.id) {
                      handleUpdateVenue();
                    } else {
                      handleAddVenue();
                    }
                  }}
                  disabled={!newVenueName || !newVenueDescription || (!newVenueAddress && !tempMarker)}
                >
                  {editingVenue.id ? 'Mettre à jour' : 'Ajouter'}
                </button>
                <button
                  className="cancel-button"
                  onClick={() => {
                    setIsAddingPlace(false);
                    setEditingVenue({ id: null, venue: null });
                    setNewVenueName('');
                    setNewVenueDescription('');
                    setNewVenueAddress('');
                    setSelectedSport('Football');
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout; 