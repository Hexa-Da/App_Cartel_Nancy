/**
 * @fileoverview Composant pour gérer les formulaires de venue
 * 
 * Ce composant gère l'affichage et la logique des formulaires pour tous les types de venues
 */

import React from 'react';
import { useAppPanels } from '../../AppPanelsContext';
import { useApp } from '../../AppContext';
import { useVenueForm } from '../../hooks/useVenueForm';
import { VenueFormModal } from './VenueFormModal';
import '../ModalForm.css';

const VenueForm: React.FC = () => {
  const {
    isAddingPlace,
    setIsAddingPlace,
    selectedPlaceType,
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
    editingVenue,
    setEditingVenue,
    setIsPlacingMarker
  } = useAppPanels();

  const { isAdmin } = useApp();

  const venueData = {
    name: newVenueName,
    description: newVenueDescription,
    address: newVenueAddress,
    sport: selectedSport,
    emoji: selectedEmoji,
    eventType: selectedEventType,
    indicationType: selectedIndicationType,
    placeType: selectedPlaceType || 'sport'
  };

  const handleSuccess = () => {
    setNewVenueName('');
    setNewVenueDescription('');
    setNewVenueAddress('');
    setSelectedSport('Football');
    setSelectedEventType('DJ contest');
    setSelectedIndicationType('Soins');
    setTempMarker(null);
    setIsPlacingMarker(false);
    setIsAddingPlace(false);
    setEditingVenue({ id: null, venue: null });
  };

  const handleError = (message: string) => {
    alert(message);
  };

  const { handleAddVenue, handleUpdateVenue } = useVenueForm({
    isAdmin,
    tempMarker,
    venueData,
    editingVenue,
    onSuccess: handleSuccess,
    onError: handleError
  });

  const handleFieldChange = (field: string, value: string) => {
    switch (field) {
      case 'name':
        setNewVenueName(value);
        break;
      case 'description':
        setNewVenueDescription(value);
        break;
      case 'address':
        setNewVenueAddress(value);
        break;
      case 'sport':
        setSelectedSport(value);
        break;
      case 'emoji':
        setSelectedEmoji(value);
        break;
      case 'eventType':
        setSelectedEventType(value);
        break;
      case 'indicationType':
        setSelectedIndicationType(value);
        break;
    }
  };

  const handlePlaceMarker = () => {
    setIsPlacingMarker(true);
    setIsAddingPlace(false);
  };

  const handleClose = () => {
    setIsAddingPlace(false);
    setEditingVenue({ id: null, venue: null });
  };

  if (!isAddingPlace || !selectedPlaceType) return null;

  return (
    <VenueFormModal
      isOpen={isAddingPlace}
      isEditing={!!editingVenue.id}
      placeType={selectedPlaceType as 'sport' | 'hotel' | 'resto' | 'soirée' | 'défilé' | 'indication'}
      venueData={venueData}
      onClose={handleClose}
      onSave={handleAddVenue}
      onUpdate={handleUpdateVenue}
      onFieldChange={handleFieldChange}
      onPlaceMarker={handlePlaceMarker}
    />
  );
};

export default VenueForm;

