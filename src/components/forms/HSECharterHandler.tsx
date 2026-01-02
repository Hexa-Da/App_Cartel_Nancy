/**
 * @fileoverview Composant pour gérer l'affichage et l'acceptation de la charte HSE
 * 
 * Ce composant gère :
 * - L'affichage conditionnel du popup HSE
 * - L'acceptation de la charte et l'activation du bracelet
 */

import React from 'react';
import HSECharterPopup from '../HSECharterPopup';
import { useHSECharter } from '../../hooks/useHSECharter';

const HSECharterHandler: React.FC = () => {
  const { showHSECharter, handleHSEAccept } = useHSECharter();

  if (!showHSECharter) return null;

  return <HSECharterPopup onAccept={handleHSEAccept} />;
};

export default HSECharterHandler;

