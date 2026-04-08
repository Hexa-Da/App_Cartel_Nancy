/**
 * @fileoverview Contexte de gestion des formulaires de l'application
 * 
 * Ce contexte gère :
 * - Tous les états des formulaires (venue, match, place, etc.)
 * - Les données temporaires lors de la création/édition
 * - Les sélections et marqueurs temporaires
 * 
 * Nécessaire car :
 * - Centralise la gestion des formulaires
 * - Évite le prop drilling pour les états de formulaires
 * - Coordonne les données entre les différents formulaires
 */

import React, { createContext, useContext, useState } from 'react';
import { Event } from '../components/EventDetails';
import type { IEditingMatchState, IEditingVenueState } from './formContextTypes';

interface FormContextType {
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
  // États de sélection
  selectedPlaceType: string | null;
  setSelectedPlaceType: React.Dispatch<React.SetStateAction<string | null>>;
  isAddingPlace: boolean;
  setIsAddingPlace: React.Dispatch<React.SetStateAction<boolean>>;
  isPlacingMarker: boolean;
  setIsPlacingMarker: React.Dispatch<React.SetStateAction<boolean>>;
  selectedEvent: Event | null;
  setSelectedEvent: React.Dispatch<React.SetStateAction<Event | null>>;
  selectedPartyForMap: string | null;
  setSelectedPartyForMap: React.Dispatch<React.SetStateAction<string | null>>;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export const FormProvider = ({ children }: { children: React.ReactNode }) => {
  // États du formulaire de lieu
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueDescription, setNewVenueDescription] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');
  const [selectedSport, setSelectedSport] = useState('Football');
  const [selectedEmoji, setSelectedEmoji] = useState('⚽');
  const [selectedEventType, setSelectedEventType] = useState('DJ contest');
  const [selectedIndicationType, setSelectedIndicationType] = useState('Soins');
  const [tempMarker, setTempMarker] = useState<[number, number] | null>(null);
  const [editingVenue, setEditingVenue] = useState<IEditingVenueState>({ id: null, venue: null });
  // États du formulaire de match
  const [editingMatch, setEditingMatch] = useState<IEditingMatchState>({ venueId: null, match: null });
  const [newMatch, setNewMatch] = useState<{ date: string, teams: string, description: string, endTime?: string, result?: string }>({
    date: '',
    teams: '',
    description: '',
    endTime: '',
    result: ''
  });
  // États de sélection
  const [selectedPlaceType, setSelectedPlaceType] = useState<string | null>(null);
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [isPlacingMarker, setIsPlacingMarker] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedPartyForMap, setSelectedPartyForMap] = useState<string | null>(null);

  return (
    <FormContext.Provider value={{
      // États du formulaire de lieu
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
      // États du formulaire de match
      editingMatch,
      setEditingMatch,
      newMatch,
      setNewMatch,
      // États de sélection
      selectedPlaceType,
      setSelectedPlaceType,
      isAddingPlace,
      setIsAddingPlace,
      isPlacingMarker,
      setIsPlacingMarker,
      selectedEvent,
      setSelectedEvent,
      selectedPartyForMap,
      setSelectedPartyForMap
    }}>
      {children}
    </FormContext.Provider>
  );
};

export const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
};

export type { IEditingVenueState, IEditingMatchState } from './formContextTypes';
