import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import logger from '../services/Logger';

/**
 * Locks portrait on native at mount. Non-fatal if unsupported.
 */
export const usePortraitOrientationLock = (): void => {
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        await ScreenOrientation.lock({ orientation: 'portrait' });
      } catch {
        if (Capacitor.isNativePlatform()) {
          logger.warn("Le verrouillage d'orientation n'est pas supporté sur ce device");
        }
      }
    };
    void lockOrientation();
  }, []);
};
