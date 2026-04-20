/**
 * @fileoverview Popup de la charte HSE - Acceptation obligatoire au premier lancement
 */

import React from 'react';

interface HSECharterPopupProps {
  onAccept: (braceletNumber: string) => Promise<{ success: boolean; error?: string }>;
}

const HSECharterPopup: React.FC<HSECharterPopupProps> = ({ onAccept }) => {
  void onAccept; // Keep prop usage to avoid lint warning while disabled.
  return null;
};

export default HSECharterPopup;
