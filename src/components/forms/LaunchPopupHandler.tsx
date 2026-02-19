/**
 * @fileoverview Handler pour afficher la popup de pub au démarrage
 *
 * N'affiche la pub qu'après acceptation de la charte HSE.
 */

import React from 'react';
import LaunchPopup from '../LaunchPopup';
import { useLaunchPopup } from '../../hooks/useLaunchPopup';
import { useHSECharter } from '../../hooks/useHSECharter';

const LaunchPopupHandler: React.FC = () => {
  const { showHSECharter } = useHSECharter();
  const { activePopup, showPopup, handleClose } = useLaunchPopup();

  if (showHSECharter || !showPopup || !activePopup) return null;

  return <LaunchPopup popup={activePopup} onClose={handleClose} />;
};

export default LaunchPopupHandler;
