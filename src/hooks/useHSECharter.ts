/**
 * @fileoverview Hook pour gérer la logique de la charte HSE
 * 
 * Ce hook gère :
 * - L'état d'affichage du popup HSE
 * - L'acceptation de la charte
 * - L'activation du bracelet dans Firebase
 */

import { useState } from 'react';
import { ref, get, update } from 'firebase/database';
import { database } from '../firebase';
import logger from '../services/Logger';

export const useHSECharter = () => {
  const [showHSECharter, setShowHSECharter] = useState(() => {
    const hasAccepted = localStorage.getItem('hseCharterAccepted');
    return hasAccepted !== 'true';
  });

  const getDeviceId = (): string => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  const handleHSEAccept = async (braceletNumber: string): Promise<{ success: boolean; error?: string }> => {
    // Activer le bracelet dans Firebase AVANT de fermer le popup
    try {
      const trimmedNumber = braceletNumber.trim();
      const deviceId = getDeviceId();
      
      const participantRef = ref(database, `participants/${trimmedNumber}`);
      const snapshot = await get(participantRef);
      
      if (!snapshot.exists()) {
        logger.warn('Numéro de bracelet invalide');
        return { success: false, error: 'Numéro de bracelet invalide' };
      }
      
      const data = snapshot.val();
      if (data.deviceId && data.deviceId !== deviceId) {
        // Le bracelet est déjà utilisé sur un autre appareil
        logger.warn('Ce bracelet est déjà utilisé sur un autre appareil');
        return { success: false, error: 'Ce bracelet est déjà utilisé sur un autre appareil' };
      }
      
      // Utiliser update pour préserver les champs existants
      await update(participantRef, {
        deviceId: deviceId,
        activatedAt: Date.now()
      });
      
      // Stocker le numéro de bracelet dans localStorage
      localStorage.setItem('userBraceletNumber', trimmedNumber);
      
      // Fermer le popup seulement si tout est OK
      localStorage.setItem('hseCharterAccepted', 'true');
      setShowHSECharter(false);
      
      return { success: true };
    } catch (err) {
      logger.error('Erreur activation bracelet:', err);
      return { success: false, error: 'Erreur lors de l\'activation du bracelet' };
    }
  };

  return {
    showHSECharter,
    handleHSEAccept
  };
};

