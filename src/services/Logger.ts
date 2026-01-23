/**
 * @fileoverview Service de logging centralisé qui respecte l'environnement
 * 
 * En production, les logs sont désactivés pour améliorer les performances.
 * En développement, tous les logs sont actifs pour faciliter le débogage.
 * 
 * IMPORTANT iOS : Les logs sont toujours affichés pour faciliter le débogage
 * sur les appareils iOS où Safari DevTools peut ne pas capturer tous les logs.
 */

import { Capacitor } from '@capacitor/core';

const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;
const isIOS = Capacitor.getPlatform() === 'ios';
// Sur iOS, toujours afficher les logs pour faciliter le débogage
const shouldLog = isDevelopment || isIOS;

class Logger {
  /**
   * Log d'information standard
   */
  log(...args: unknown[]): void {
    if (shouldLog) {
      console.log(...args);
    }
  }

  /**
   * Log d'erreur (toujours actif, même en production)
   * Sur iOS, toujours affiché pour faciliter le débogage
   */
  error(...args: unknown[]): void {
    // Les erreurs sont toujours loggées
    console.error(...args);
    // En production, on peut aussi logger vers un service externe si nécessaire
  }

  /**
   * Log d'avertissement
   */
  warn(...args: unknown[]): void {
    if (shouldLog) {
      console.warn(...args);
    }
  }

  /**
   * Log d'information
   */
  info(...args: unknown[]): void {
    if (shouldLog) {
      console.info(...args);
    }
  }

  /**
   * Log de débogage
   */
  debug(...args: unknown[]): void {
    if (shouldLog) {
      console.debug(...args);
    }
  }
}

export const logger = new Logger();
export default logger;

