/**
 * @fileoverview Hook pour gérer la logique des popups de pub au démarrage
 *
 * Gère :
 * - Chargement des pubs depuis Firebase
 * - Affichage si date >= startDate
 * - Ordre croissant des id pour plusieurs pubs
 * - Persistance "déjà vue" en localStorage
 */

import { useState, useEffect, useCallback } from 'react';
import { ref, get, onValue } from 'firebase/database';
import { database } from '../firebase';
import { LaunchPopup } from '../types';
import logger from '../services/Logger';

const LAUNCH_POPUPS_PATH = 'launchPopups';
const SEEN_POPUP_KEY = 'launchPopupSeen';

export const useLaunchPopup = () => {
  const [popupsQueue, setPopupsQueue] = useState<LaunchPopup[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadPopups = useCallback(async () => {
    try {
      const popupsRef = ref(database, LAUNCH_POPUPS_PATH);
      const snapshot = await get(popupsRef);

      if (!snapshot.exists()) {
        setPopupsQueue([]);
        return;
      }

      const data = snapshot.val();
      const allPopups: LaunchPopup[] = Object.entries(data).map(([id, val]) => ({
        id,
        ...(val as Omit<LaunchPopup, 'id'>)
      }));

      const now = new Date();
      const seenIds = JSON.parse(localStorage.getItem(SEEN_POPUP_KEY) || '[]') as string[];
      const activePopups = allPopups
        .filter((p) => {
          const start = new Date(p.startDate);
          return now >= start && !seenIds.includes(p.id);
        })
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

      setPopupsQueue(activePopups);
      setCurrentIndex(0);
    } catch (err) {
      logger.error('useLaunchPopup: Erreur chargement pub', err);
      setPopupsQueue([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPopups();

    const popupsRef = ref(database, LAUNCH_POPUPS_PATH);
    const unsubscribe = onValue(popupsRef, () => {
      loadPopups();
    });

    return () => unsubscribe();
  }, [loadPopups]);

  const currentPopup = popupsQueue[currentIndex] ?? null;
  const showPopup = currentPopup !== null;

  const handleClose = useCallback(() => {
    if (currentPopup) {
      const seenIds = JSON.parse(localStorage.getItem(SEEN_POPUP_KEY) || '[]') as string[];
      if (!seenIds.includes(currentPopup.id)) {
        localStorage.setItem(SEEN_POPUP_KEY, JSON.stringify([...seenIds, currentPopup.id]));
      }
    }
    if (currentIndex < popupsQueue.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setPopupsQueue([]);
    }
  }, [currentPopup, currentIndex, popupsQueue.length]);

  return {
    activePopup: currentPopup,
    showPopup,
    isLoading,
    handleClose
  };
};
