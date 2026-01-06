/**
 * @fileoverview Configuration du thème de l'application
 * 
 * Ce fichier gère l'initialisation du thème :
 * - Récupère la préférence depuis localStorage
 * - Applique le thème via l'attribut data-theme sur documentElement
 * - Définit le thème sombre par défaut si aucune préférence n'existe
 * 
 * Nécessaire car :
 * - Centralise la logique de thème
 * - Évite le FOUC (Flash of Unstyled Content)
 * - S'exécute avant le rendu React
 */

/**
 * Configure le thème de l'application en fonction de localStorage
 * Applique l'attribut data-theme sur documentElement
 */
export const setupTheme = (): void => {
  const storedTheme = localStorage.getItem('theme');
  
  if (storedTheme === null) {
    // Thème sombre par défaut si aucune préférence
    localStorage.setItem('theme', 'true');
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    // Appliquer le thème stocké
    const isDark = storedTheme === 'true';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }
};



