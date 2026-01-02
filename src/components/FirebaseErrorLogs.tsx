/**
 * @fileoverview Composant d'affichage des logs d'erreur Firebase
 * 
 * Ce composant affiche toutes les erreurs Firebase avec leur type,
 * opération, chemin et détails dans un panneau flottant.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { firebaseLogger, FirebaseLog } from '../services/FirebaseLogger';
import logger from '../services/Logger';
import './FirebaseErrorLogs.css';

// Clé pour stocker les IDs des logs lus dans localStorage
const READ_ERRORS_KEY = 'firebase_read_error_ids';

// Fonction pour charger les IDs des logs lus depuis localStorage
const getReadErrorIds = (): Set<string> => {
  try {
    const stored = localStorage.getItem(READ_ERRORS_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (error) {
    logger.warn('Erreur lors de la lecture des erreurs lues:', error);
  }
  return new Set<string>();
};

// Fonction pour sauvegarder les IDs des logs lus dans localStorage
const saveReadErrorIds = (readErrorIds: Set<string>): void => {
  try {
    // Garder seulement les 100 derniers IDs pour éviter de surcharger localStorage
    const idsArray = Array.from(readErrorIds).slice(0, 100);
    localStorage.setItem(READ_ERRORS_KEY, JSON.stringify(idsArray));
  } catch (error) {
    logger.warn('Erreur lors de la sauvegarde des erreurs lues:', error);
  }
};

const FirebaseErrorLogs: React.FC = () => {
  const [firebaseLogs, setFirebaseLogs] = useState<FirebaseLog[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [readErrorIds, setReadErrorIds] = useState<Set<string>>(getReadErrorIds());

  // Filtrer les logs pour ne garder que ceux non lus
  // Si un log a un ID qui n'est pas dans readErrorIds, c'est soit une nouvelle erreur,
  // soit une erreur qui se reproduit (nouvelle occurrence avec un nouvel ID)
  const getUnreadLogs = useCallback((logs: FirebaseLog[]): FirebaseLog[] => {
    return logs.filter(log => !readErrorIds.has(log.id));
  }, [readErrorIds]);

  // Écouter les nouveaux logs Firebase
  useEffect(() => {
    const unsubscribe = firebaseLogger.subscribe((firebaseLog: FirebaseLog) => {
      setFirebaseLogs(prev => {
        const newLogs = [firebaseLog, ...prev].slice(0, 50); // Garder les 50 derniers logs
        return newLogs;
      });
      
      // Si c'est un nouveau log (ID pas encore lu), réafficher le panneau
      if (!readErrorIds.has(firebaseLog.id)) {
        setIsVisible(true);
      }
    });

    // Charger les logs existants au montage
    const existingLogs = firebaseLogger.getErrorLogs();
    setFirebaseLogs(existingLogs.slice(0, 50));

    return unsubscribe;
  }, [readErrorIds]);

  // Fonction pour obtenir la couleur selon le type d'erreur
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'CONNECTION_ERROR':
        return 'rgba(244, 67, 54, 0.4)';
      case 'TIMEOUT_ERROR':
        return 'rgba(255, 152, 0, 0.4)';
      case 'PERMISSION_DENIED':
        return 'rgba(156, 39, 176, 0.4)';
      case 'UNAVAILABLE':
        return 'rgba(244, 67, 54, 0.4)';
      case 'UNAUTHENTICATED':
        return 'rgba(233, 30, 99, 0.4)';
      case 'QUOTA_EXCEEDED':
        return 'rgba(255, 193, 7, 0.4)';
      case 'DATA_ERROR':
        return 'rgba(63, 81, 181, 0.4)';
      case 'OPERATION_FAILED':
        return 'rgba(255, 87, 34, 0.4)';
      case 'CONFIG_ERROR':
        return 'rgba(121, 85, 72, 0.4)';
      default:
        return 'rgba(255, 255, 255, 0.2)';
    }
  };

  // Fonction pour fermer le panneau et marquer les erreurs comme lues
  const handleClose = () => {
    // Marquer tous les IDs des erreurs actuellement affichées comme lues
    const unreadLogs = getUnreadLogs(firebaseLogs);
    const newReadErrorIds = new Set(readErrorIds);
    
    unreadLogs.forEach(log => {
      newReadErrorIds.add(log.id);
    });
    
    setReadErrorIds(newReadErrorIds);
    saveReadErrorIds(newReadErrorIds);
    setIsVisible(false);
  };

  // Obtenir les logs non lus
  const unreadLogs = getUnreadLogs(firebaseLogs);

  // Ne rien afficher s'il n'y a pas de logs non lus ou si le panneau est fermé
  if (unreadLogs.length === 0 || !isVisible) {
    return null;
  }

  return (
    <div className="firebase-error-logs">
      <div className="firebase-error-logs-header">
        <div className="firebase-error-logs-title">
          <strong>Erreurs Firebase ({unreadLogs.length})</strong>
        </div>
        <button
          onClick={handleClose}
          className="firebase-error-logs-close-button"
          aria-label="Fermer le panneau"
        >
          ×
        </button>
      </div>
      
      <div className="firebase-error-logs-content">
        {unreadLogs.map(log => {
          const time = log.timestamp.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          });
          
          return (
            <div
              key={log.id}
              className="firebase-error-log-item"
              style={{ backgroundColor: getTypeColor(log.type) }}
            >
              <div className="firebase-error-log-header">
                <div className="firebase-error-log-time">
                  {time}
                </div>
                <div className="firebase-error-log-type">
                  <span className="firebase-error-log-type-text">
                    {log.type}
                  </span>
                </div>
              </div>
              
              <div className="firebase-error-log-message">
                {log.message}
              </div>
              
              <div className="firebase-error-log-details">
                <div className="firebase-error-log-detail-item">
                  <span className="firebase-error-log-detail-label">Opération:</span>
                  <span className="firebase-error-log-detail-value">{log.operation}</span>
                </div>
                <div className="firebase-error-log-detail-item">
                  <span className="firebase-error-log-detail-label">Chemin:</span>
                  <span className="firebase-error-log-detail-value">{log.path}</span>
                </div>
                {log.errorCode && (
                  <div className="firebase-error-log-detail-item">
                    <span className="firebase-error-log-detail-label">Code:</span>
                    <span className="firebase-error-log-detail-value">{log.errorCode}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FirebaseErrorLogs;
