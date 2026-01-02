/**
 * @fileoverview Composant pour gérer le formulaire de match
 * 
 * Ce composant gère l'affichage et la logique du formulaire d'ajout/modification de match
 */

import React from 'react';
import { useForm } from '../../contexts/FormContext';
import { useApp } from '../../AppContext';
import { useMatchForm } from '../../hooks/useMatchForm';
import { MatchFormModal } from './MatchFormModal';
import '../ModalForm.css';

const MatchForm: React.FC = () => {
  const {
    editingMatch,
    setEditingMatch,
    newMatch,
    setNewMatch
  } = useForm();

  const { isAdmin } = useApp();

  const handleSuccess = () => {
    setNewMatch({
      date: '',
      teams: '',
      description: '',
      endTime: '',
      result: ''
    });
    setEditingMatch({ venueId: null, match: null });
  };

  const handleError = (message: string) => {
    alert(message);
  };

  // Le hook doit toujours être appelé, même si venueId est null
  const { handleAddMatch, handleUpdateMatch: updateMatch } = useMatchForm({
    isAdmin,
    venueId: editingMatch.venueId || '',
    matchData: newMatch,
    editingMatch,
    onSuccess: handleSuccess,
    onError: handleError
  });

  const handleNewMatchChange = (field: string, value: string) => {
    setNewMatch({ ...newMatch, [field]: value });
  };

  const handleEditingMatchChange = (field: string, value: string) => {
    if (editingMatch.match) {
      setEditingMatch({
        ...editingMatch,
        match: { ...editingMatch.match, [field]: value }
      });
    }
  };

  const handleClose = () => {
    setEditingMatch({ venueId: null, match: null });
  };

  const handleSave = () => {
    if (editingMatch.venueId) {
      handleAddMatch();
    }
  };

  const handleUpdateMatch = (venueId: string, matchId: string, updatedData: any) => {
    updateMatch(matchId, updatedData);
  };

  if (!editingMatch.venueId) return null;

  return (
    <MatchFormModal
      isOpen={!!editingMatch.venueId}
      editingMatch={editingMatch}
      newMatch={newMatch}
      onClose={handleClose}
      onSave={handleSave}
      onUpdateMatch={handleUpdateMatch}
      onNewMatchChange={handleNewMatchChange}
      onEditingMatchChange={handleEditingMatchChange}
    />
  );
};

export default MatchForm;

