/**
 * @fileoverview Composant Loader pour l'écran de chargement initial
 * 
 * Ce composant remplace le div#loader dans index.html :
 * - Affiche un écran de chargement pendant l'initialisation
 * - Se masque automatiquement une fois l'app chargée
 * - Style cohérent avec le thème de l'application
 * 
 * Nécessaire car :
 * - Évite le flash de contenu non stylé
 * - Améliore l'expérience utilisateur
 * - Centralise la logique de chargement dans React
 */

import React, { useEffect, useState } from 'react';
import './Loader.css';

const Loader: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Masquer le loader une fois que React est monté
    // Petit délai pour s'assurer que tout est bien rendu
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return <div className="loader" />;
};

export default Loader;

