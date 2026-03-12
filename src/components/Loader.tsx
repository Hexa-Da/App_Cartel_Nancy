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
    const hide = async () => {
      if (Capacitor.isNativePlatform()) {
        await SplashScreen.hide({ fadeOutDuration: SPLASH_FADE_DURATION });
        await new Promise(r => setTimeout(r, 50));
      }
      setIsHiding(true);
      setTimeout(() => setIsVisible(false), LOADER_FADE_DURATION);
    };

    hide();
  }, []);

  if (!isVisible) return null;

  return <div className={`loader${isHiding ? ' loader--hiding' : ''}`} />;
};

export default Loader;
