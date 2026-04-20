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
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase';
import { LaunchPopup } from '../types';
import logger from '../services/Logger';
import { getAppNow } from '../config/homeMomentDebug';

const LAUNCH_POPUPS_PATH = 'launchPopups';
const SEEN_POPUP_KEY = 'launchPopupSeen';
const POPUP_DURATION_MS = 2 * 60 * 60 * 1000;

const getSeenIds = (): string[] => {
  try {
    const raw = localStorage.getItem(SEEN_POPUP_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const useLaunchPopup = () => {
  const [popupsQueue, setPopupsQueue] = useState<LaunchPopup[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const processSnapshot = useCallback((data: Record<string, unknown> | null) => {
    try {
      if (!data) {
        setPopupsQueue([]);
        return;
      }

      const allPopups: LaunchPopup[] = Object.entries(data).map(([id, val]) => ({
        id,
        ...(val as Omit<LaunchPopup, 'id'>)
      }));

      const now = getAppNow();
      const seenIds = getSeenIds();
      const activePopups = allPopups
        .filter((p) => {
          const start = new Date(p.startDate);
          const end = p.endDate
            ? new Date(p.endDate)
            : new Date(start.getTime() + POPUP_DURATION_MS);
          return now >= start && now < end && !seenIds.includes(p.id);
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
    const popupsRef = ref(database, LAUNCH_POPUPS_PATH);
    const unsubscribe = onValue(popupsRef, (snapshot) => {
      processSnapshot(snapshot.val());
    });

    return () => unsubscribe();
  }, [processSnapshot]);

  const currentPopup = popupsQueue[currentIndex] ?? null;
  const showPopup = currentPopup !== null;

  const handleClose = useCallback(() => {
    if (currentPopup) {
      const seenIds = getSeenIds();
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
