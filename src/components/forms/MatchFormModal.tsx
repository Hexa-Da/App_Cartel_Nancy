/**
 * @fileoverview Modal de formulaire pour ajouter/modifier un match
 * 
 * Ce composant gère le formulaire d'ajout et de modification de match
 */

import { Match } from '../../types';
import '../ModalForm.css';

interface MatchFormModalProps {
  isOpen: boolean;
  editingMatch: { venueId: string | null; match: Match | null };
  newMatch: { date: string; teams: string; description: string; endTime?: string; result?: string };
  onClose: () => void;
  onSave: () => void;
  onUpdateMatch: (venueId: string, matchId: string, updatedData: Partial<Match>) => void;
  onNewMatchChange: (field: string, value: string) => void;
  onEditingMatchChange: (field: string, value: string) => void;
}

export const MatchFormModal: React.FC<MatchFormModalProps> = ({
  isOpen,
  editingMatch,
  newMatch,
  onClose,
  onSave,
  onUpdateMatch,
  onNewMatchChange,
  onEditingMatchChange
}) => {
  if (!isOpen || !editingMatch.venueId) return null;

  const isEditing = !!editingMatch.match;
  const matchData = isEditing ? editingMatch.match! : newMatch;

  const handleSave = () => {
    if (isEditing && editingMatch.match && editingMatch.venueId) {
      onUpdateMatch(editingMatch.venueId, editingMatch.match.id, {
        date: editingMatch.match.date,
        endTime: editingMatch.match.endTime || '',
        teams: editingMatch.match.teams,
        description: editingMatch.match.description,
        result: editingMatch.match.result
      });
      onClose();
    } else {
      onSave();
    }
  };

  const handleChange = (field: string, value: string) => {
    if (isEditing) {
      onEditingMatchChange(field, value);
    } else {
      onNewMatchChange(field, value);
    }
  };

  return (
    <div className="modal-form-overlay">
      <div className="modal-form-container">
        <div className="modal-form-header">
          <h2>{isEditing ? 'Modifier le match' : 'Ajouter un match'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-form-content">
          <div className="modal-form-group">
            <label htmlFor="match-date">Date et heure de début</label>
            <input
              id="match-date"
              type="datetime-local"
              value={matchData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="modal-form-input"
            />
          </div>
          <div className="modal-form-group">
            <label htmlFor="match-end-time">Heure de fin</label>
            <input
              id="match-end-time"
              type="datetime-local"
              value={matchData.endTime || ''}
              min={matchData.date}
              onChange={(e) => handleChange('endTime', e.target.value)}
              className="modal-form-input"
            />
          </div>
          <div className="modal-form-group">
            <label htmlFor="match-teams">Équipes</label>
            <input
              id="match-teams"
              type="text"
              value={matchData.teams}
              onChange={(e) => handleChange('teams', e.target.value)}
              placeholder="Ex: Nancy vs Alès"
              className="modal-form-input"
            />
          </div>
          <div className="modal-form-group">
            <label htmlFor="match-description">Description</label>
            <input
              id="match-description"
              type="text"
              value={matchData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Ex: Poule A Masculin - Match 1"
              className="modal-form-input"
            />
          </div>
          <div className="modal-form-group">
            <label htmlFor="match-result">Résultat</label>
            <input
              id="match-result"
              type="text"
              value={matchData.result || ''}
              onChange={(e) => handleChange('result', e.target.value)}
              placeholder="Ex: 2 - 1 (à saisir si disponible)"
              className="modal-form-input"
            />
          </div>
          <div className="modal-form-actions">
            <button className="modal-form-submit" onClick={handleSave}>
              {isEditing ? 'Mettre à jour' : 'Ajouter'}
            </button>
            <button className="modal-form-cancel" onClick={onClose}>Annuler</button>
          </div>
        </div>
      </div>
    </div>
  );
};

