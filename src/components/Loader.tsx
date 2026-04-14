import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import logger from '../services/Logger';
import './Loader.css';

const SPLASH_FADE_DURATION = 350;
const LOADER_FADE_DURATION = 400;
const NATIVE_HIDE_TIMEOUT = 2000;

const Loader: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    let mounted = true;

    const hide = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Failsafe: never block the web app if native splash hide hangs.
          await Promise.race([
            SplashScreen.hide({ fadeOutDuration: SPLASH_FADE_DURATION }),
            new Promise<void>((resolve) => {
              timerId = setTimeout(resolve, NATIVE_HIDE_TIMEOUT);
            })
          ]);
        } catch (error) {
          logger.warn('[Loader] SplashScreen.hide failed, continue with web loader fallback:', error);
        }
        if (!mounted) return;
        await new Promise<void>((resolve) => {
          timerId = setTimeout(resolve, 50);
        });
        if (!mounted) return;
      }
      setIsHiding(true);
      timerId = setTimeout(() => {
        setIsVisible(false);
        (window as any).__loaderFailsafeClear?.();
      }, LOADER_FADE_DURATION);
    };

    hide();

    return () => {
      mounted = false;
      clearTimeout(timerId);
    };
  }, []);

  if (!isVisible) return null;

  return <div className={`loader${isHiding ? ' loader--hiding' : ''}`} />;
};

export default Loader;
