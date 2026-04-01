/**
 * @fileoverview Modal de formulaire pour ajouter/modifier un venue
 * 
 * Ce composant gère tous les types de venues : sport, hotel, resto, soirée, défilé, indication
 */

import '../ModalForm.css';

const sportEmojis: { [key: string]: string } = {
  Football: '⚽',
  Basketball: '🏀',
  Handball: '🤾',
  Rugby: '🏉',
  Volleyball: '🏐',
  Tennis: '🎾',
  Badminton: '🏸',
  'Ping-pong': '🏓',
  Ultimate: '🥏',
  Natation: '🏊',
  Cross: '👟',
  Echecs: '♟️',
  Athlétisme: '🏃‍♂️',
  Escalade: '🧗‍♂️',
  Spikeball: '⚡️',
  Pétanque: '🍹',
};

const eventTypeEmojis: { [key: string]: string } = {
  'DJ contest': '🎧',
  'Show Pompom': '🎀',
  'Showcase': '🎤',
};

const indicationTypeEmojis: { [key: string]: string } = {
  'Soins': '🚑',
  'Poubelle': '🗑️',
  'Dejeuner': '🥐',
  'Bar': '🍺',
  'Accès handicapé': '👨‍🦽',
  'Safe place': '🗣️',
  'Toilette': '🚾',
  'Zone fumeur': '🚬',
  'Vestiaire': '🧥',
  'Stand de prévention': '⚠️',
  'Stand entreprise': '👩‍💼',
  'Issue de secours': '➜',
};

interface VenueFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  placeType: 'sport' | 'hotel' | 'resto' | 'soirée' | 'défilé' | 'indication' | null;
  venueData: {
    name: string;
    description: string;
    address: string;
    sport: string;
    emoji: string;
    eventType?: string;
    indicationType?: string;
  };
  onClose: () => void;
  onSave: () => void;
  onUpdate: () => void;
  onFieldChange: (field: string, value: string) => void;
  onPlaceMarker: () => void;
}

export const VenueFormModal: React.FC<VenueFormModalProps> = ({
  isOpen,
  isEditing,
  placeType,
  venueData,
  onClose,
  onSave,
  onUpdate,
  onFieldChange,
  onPlaceMarker
}) => {
  if (!isOpen || !placeType) return null;

  const getTitle = () => {
    const action = isEditing ? 'Modifier' : 'Ajouter';
    switch (placeType) {
      case 'sport': return `${action} un lieu de sport`;
      case 'hotel': return `${action} un hôtel`;
      case 'resto': return `${action} un restaurant`;
      case 'soirée': return `${action} une soirée`;
      case 'défilé': return `${action} un défilé`;
      case 'indication': return `${action} une indication`;
      default: return `${action} un lieu`;
    }
  };

  const getLabel = (field: string) => {
    switch (field) {
      case 'name':
        if (placeType === 'hotel') return 'Nom de l\'hôtel';
        if (placeType === 'resto') return 'Nom du restaurant';
        if (placeType === 'indication') return 'Nom de l\'indication';
        return 'Nom du lieu';
      case 'description': return 'Description';
      case 'address': return 'Adresse';
      case 'sport': return 'Sport';
      case 'eventType': return 'Event';
      case 'indicationType': return 'Type';
      default: return field;
    }
  };

  return (
    <div className="modal-form-overlay">
      <div className="modal-form-container">
        <div className="modal-form-header">
          <h2>{getTitle()}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-form-content">
          <div className="modal-form-group">
            <label htmlFor="venue-name">{getLabel('name')}</label>
            <input
              id="venue-name"
              type="text"
              value={venueData.name}
              onChange={(e) => onFieldChange('name', e.target.value)}
              placeholder={placeType === 'hotel' ? 'Ex: Hôtel de Ville' : placeType === 'resto' ? 'Ex: Le Bistrot' : 'Ex: Gymnase Raymond Poincaré'}
              className="modal-form-input"
            />
          </div>
          <div className="modal-form-group">
            <label htmlFor="venue-description">{getLabel('description')}</label>
            <input
              id="venue-description"
              type="text"
              value={venueData.description}
              onChange={(e) => onFieldChange('description', e.target.value)}
              placeholder="Ex: Informations..."
              className="modal-form-input"
            />
          </div>
          <div className="modal-form-group">
            <label htmlFor="venue-address">{getLabel('address')}</label>
            <input
              id="venue-address"
              type="text"
              value={venueData.address}
              onChange={(e) => onFieldChange('address', e.target.value)}
              placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy"
              className="modal-form-input"
            />
            <button className="modal-form-cancel" onClick={onPlaceMarker}>Placer sur la carte</button>
          </div>
          
          {placeType === 'sport' && (
            <div className="modal-form-group">
              <label htmlFor="venue-sport">{getLabel('sport')}</label>
              <select
                id="venue-sport"
                value={venueData.sport}
                onChange={(e) => {
                  onFieldChange('sport', e.target.value);
                  onFieldChange('emoji', sportEmojis[e.target.value] || '⚽');
                }}
                className="modal-form-input"
              >
                <option value="Football">Football ⚽</option>
                <option value="Basketball">Basketball 🏀</option>
                <option value="Handball">Handball 🤾</option>
                <option value="Rugby">Rugby 🏉</option>
                <option value="Ultimate">Ultimate 🥏</option>
                <option value="Natation">Natation 🏊</option>
                <option value="Badminton">Badminton 🏸</option>
                <option value="Tennis">Tennis 🎾</option>
                <option value="Cross">Cross 👟</option>
                <option value="Volleyball">Volleyball 🏐</option>
                <option value="Ping-pong">Ping-pong 🏓</option>
                <option value="Echecs">Echecs ♟️</option>
                <option value="Athlétisme">Athlétisme 🏃‍♂️</option>
                <option value="Spikeball">Spikeball ⚡️</option>
                <option value="Pétanque">Pétanque 🍹</option>
                <option value="Escalade">Escalade 🧗‍♂️</option>
              </select>
            </div>
          )}

          {placeType === 'soirée' && (
            <div className="modal-form-group">
              <label htmlFor="venue-event">{getLabel('eventType')}</label>
              <select
                id="venue-event"
                value={venueData.eventType || 'DJ contest'}
                onChange={(e) => {
                  onFieldChange('eventType', e.target.value);
                  onFieldChange('emoji', eventTypeEmojis[e.target.value] || '🎉');
                }}
                className="modal-form-input"
              >
                <option value="DJ contest">DJ contest 🎧</option>
                <option value="Show Pompom">Show Pompom 🎀</option>
                <option value="Showcase">Showcase 🎤</option>
              </select>
            </div>
          )}

          {placeType === 'indication' && (
            <div className="modal-form-group">
              <label htmlFor="venue-type">{getLabel('indicationType')}</label>
              <select
                id="venue-type"
                value={venueData.indicationType || 'Soins'}
                onChange={(e) => {
                  onFieldChange('indicationType', e.target.value);
                  onFieldChange('emoji', indicationTypeEmojis[e.target.value] || '📍');
                }}
                className="modal-form-input"
              >
                <option value="Soins">Soins 🚑</option>
                <option value="Poubelle">Poubelle 🗑️</option>
                <option value="Dejeuner">Dejeuner 🥐</option>
                <option value="Bar">Bar 🍺</option>
                <option value="Accès handicapé">Accès handicapé 👨‍🦽</option>
                <option value="Safe place">Safe place 🗣️</option>
                <option value="Toilette">Toilette 🚾</option>
                <option value="Zone fumeur">Zone fumeur 🚬</option>
                <option value="Vestiaire">Vestiaire 🧥</option>
                <option value="Stand de prévention">Stand de prévention ⚠️</option>
                <option value="Stand entreprise">Stand entreprise 👩‍💼</option>
                <option value="Issue de secours">Issue de secours ➜</option>
              </select>
            </div>
          )}

          <div className="modal-form-actions">
            <button className="modal-form-submit" onClick={isEditing ? onUpdate : onSave}>
              {isEditing ? 'Mettre à jour' : 'Ajouter'}
            </button>
            <button className="modal-form-cancel" onClick={onClose}>Annuler</button>
          </div>
        </div>
      </div>
    </div>
  );
};

