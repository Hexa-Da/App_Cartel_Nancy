import React from 'react';
import './EmergencyPopup.css';

interface EmergencyPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onShowVSS: () => void;
}

const toTelHref = (raw: string): string => `tel:${raw.replace(/\s/g, '')}`;

const EmergencyPopup: React.FC<EmergencyPopupProps> = ({ isOpen, onClose, onShowVSS }) => {
  if (!isOpen) return null;

  const emergencyContacts = [
    { name: 'Responsable VSS', number: '+33 7 51 16 67 00' },
    { name: 'Responsable Sécurité', number: '+33 7 53 70 02 04' },
    { name: 'Responsable Secret-G', number: '+33 7 58 26 56 33' },
    { name: 'Urgence Absolue', number: '+33 7 58 76 00 52' },
  ];

  return (
    <div className="emergency-popup" onClick={onClose}>
      <div className="emergency-popup-content" onClick={e => e.stopPropagation()}>
        <div className="emergency-popup-header">
          <h3>Contacts d'urgence</h3>
          <button className="close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <ul>
          {emergencyContacts.map(contact => (
            <li key={contact.name}>
              <div className="emergency-contact-body">
                <strong className="emergency-contact-name">{contact.name}</strong>
                <span className="emergency-contact-number">{contact.number}</span>
              </div>
              <a
                href={toTelHref(contact.number)}
                className="phone-button"
                aria-label={`Appeler ${contact.name}`}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
              </a>
            </li>
          ))}
        </ul>
        <div className="emergency-popup-footer">
          <button
            className="vss-button"
            onClick={() => {
              onShowVSS();
              onClose();
            }}
          >
            Faire un signalement
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyPopup; 