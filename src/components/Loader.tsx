import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import './Loader.css';

const SPLASH_FADE_DURATION = 350;
const LOADER_FADE_DURATION = 400;

const Loader: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    let mounted = true;

    const hide = async () => {
      if (Capacitor.isNativePlatform()) {
        await SplashScreen.hide({ fadeOutDuration: SPLASH_FADE_DURATION });
        if (!mounted) return;
        await new Promise<void>(r => { timerId = setTimeout(r, 50); });
        if (!mounted) return;
      }
      setIsHiding(true);
      timerId = setTimeout(() => setIsVisible(false), LOADER_FADE_DURATION);
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
