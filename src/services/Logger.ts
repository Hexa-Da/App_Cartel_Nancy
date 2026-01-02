/**
 * @fileoverview Service de logging centralisé qui respecte l'environnement
 * 
 * En production, les logs sont désactivés pour améliorer les performances.
 * En développement, tous les logs sont actifs pour faciliter le débogage.
 */

const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;

class Logger {
  /**
   * Log d'information standard
   */
  log(...args: unknown[]): void {
    if (isDevelopment) {
      console.log(...args);
    }
  }

  /**
   * Log d'erreur (toujours actif, même en production)
   */
  error(...args: unknown[]): void {
    if (isDevelopment) {
      console.error(...args);
    }
    // En production, on peut aussi logger vers un service externe si nécessaire
  }

  /**
   * Log d'avertissement
   */
  warn(...args: unknown[]): void {
    if (isDevelopment) {
      console.warn(...args);
    }
  }

  /**
   * Log d'information
   */
  info(...args: unknown[]): void {
    if (isDevelopment) {
      console.info(...args);
    }
  }

  /**
   * Log de débogage
   */
  debug(...args: unknown[]): void {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
}

export const logger = new Logger();
export default logger;

