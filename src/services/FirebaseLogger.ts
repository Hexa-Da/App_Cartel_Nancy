/**
 * @fileoverview Service de logging pour Firebase
 * 
 * Ce service catégorise et enregistre toutes les erreurs Firebase
 * avec des types détaillés pour faciliter le débogage.
 */

export type FirebaseErrorType = 
  | 'CONNECTION_ERROR'      // Erreur de connexion réseau
  | 'TIMEOUT_ERROR'         // Timeout de connexion
  | 'PERMISSION_DENIED'     // Permissions insuffisantes
  | 'UNAVAILABLE'           // Service Firebase indisponible
  | 'UNAUTHENTICATED'       // Non authentifié
  | 'QUOTA_EXCEEDED'        // Quota dépassé
  | 'DATA_ERROR'            // Erreur de données (format invalide, données manquantes)
  | 'OPERATION_FAILED'      // Opération échouée (write, update, delete)
  | 'CONFIG_ERROR'          // Erreur de configuration Firebase
  | 'UNKNOWN_ERROR';        // Erreur inconnue

export interface FirebaseLog {
  id: string;
  type: FirebaseErrorType;
  operation: string;        // Ex: 'read:venues', 'write:match', 'delete:venue'
  path: string;             // Chemin Firebase (ex: 'venues', 'chatMessages')
  message: string;
  errorCode?: string;
  errorDetails?: any;
  timestamp: Date;
}

class FirebaseLoggerService {
  private logs: FirebaseLog[] = [];
  private listeners: ((log: FirebaseLog) => void)[] = [];
  private maxLogs = 50;

  /**
   * Analyse une erreur Firebase et détermine son type
   */
  private categorizeError(error: any): FirebaseErrorType {
    // Codes d'erreur Firebase spécifiques
    const errorCode = error?.code || '';
    const errorMessage = error?.message || String(error || '');
    const errorString = String(errorCode || errorMessage).toLowerCase();

    // Codes d'erreur Firebase Database spécifiques
    if (errorCode === 'PERMISSION_DENIED' || errorCode === 'permission-denied') {
      return 'PERMISSION_DENIED';
    }

    if (errorCode === 'UNAVAILABLE' || errorCode === 'unavailable') {
      return 'UNAVAILABLE';
    }

    if (errorCode === 'UNAUTHENTICATED' || errorCode === 'unauthenticated') {
      return 'UNAUTHENTICATED';
    }

    if (errorCode === 'DATA_STALE' || errorCode === 'data-stale') {
      return 'DATA_ERROR';
    }

    if (errorCode === 'DISCONNECTED' || errorCode === 'disconnected') {
      return 'CONNECTION_ERROR';
    }

    if (errorCode === 'EXPIRED_TOKEN' || errorCode === 'expired-token') {
      return 'UNAUTHENTICATED';
    }

    if (errorCode === 'INVALID_TOKEN' || errorCode === 'invalid-token') {
      return 'UNAUTHENTICATED';
    }

    if (errorCode === 'MAX_RETRIES' || errorCode === 'max-retries') {
      return 'OPERATION_FAILED';
    }

    if (errorCode === 'NETWORK_ERROR' || errorCode === 'network-error') {
      return 'CONNECTION_ERROR';
    }

    if (errorCode === 'OVERFLOW' || errorCode === 'overflow') {
      return 'QUOTA_EXCEEDED';
    }

    if (errorCode === 'RATE_LIMIT_EXCEEDED' || errorCode === 'rate-limit-exceeded') {
      return 'QUOTA_EXCEEDED';
    }

    if (errorCode === 'SERVICE_UNAVAILABLE' || errorCode === 'service-unavailable') {
      return 'UNAVAILABLE';
    }

    if (errorCode === 'TIMEOUT' || errorCode === 'timeout') {
      return 'TIMEOUT_ERROR';
    }

    if (errorCode === 'TOO_BIG' || errorCode === 'too-big') {
      return 'DATA_ERROR';
    }

    if (errorCode === 'UNABLE_TO_CONNECT' || errorCode === 'unable-to-connect') {
      return 'CONNECTION_ERROR';
    }

    // Codes d'erreur Firebase Storage spécifiques
    if (errorCode === 'storage/unauthorized' || errorCode === 'storage/forbidden') {
      return 'PERMISSION_DENIED';
    }

    if (errorCode === 'storage/object-not-found') {
      return 'DATA_ERROR';
    }

    if (errorCode === 'storage/quota-exceeded') {
      return 'QUOTA_EXCEEDED';
    }

    if (errorCode === 'storage/unauthenticated') {
      return 'UNAUTHENTICATED';
    }

    if (errorCode === 'storage/canceled') {
      return 'OPERATION_FAILED';
    }

    if (errorCode === 'storage/invalid-argument') {
      return 'DATA_ERROR';
    }

    if (errorCode === 'storage/invalid-checksum') {
      return 'DATA_ERROR';
    }

    if (errorCode === 'storage/invalid-event-name') {
      return 'CONFIG_ERROR';
    }

    if (errorCode === 'storage/invalid-format') {
      return 'DATA_ERROR';
    }

    if (errorCode === 'storage/invalid-url') {
      return 'DATA_ERROR';
    }

    if (errorCode === 'storage/no-default-bucket') {
      return 'CONFIG_ERROR';
    }

    if (errorCode === 'storage/server-file-wrong-size') {
      return 'DATA_ERROR';
    }

    // Détection par message d'erreur
    if (errorString.includes('network') || errorString.includes('connection') || errorString.includes('fetch') || errorString.includes('disconnected')) {
      return 'CONNECTION_ERROR';
    }

    if (errorString.includes('timeout') || errorString.includes('deadline') || errorString.includes('timed out')) {
      return 'TIMEOUT_ERROR';
    }

    if (errorString.includes('permission') || errorString.includes('permission-denied') || errorString.includes('access denied')) {
      return 'PERMISSION_DENIED';
    }

    if (errorString.includes('unavailable') || errorString.includes('service-unavailable') || errorString.includes('service unavailable')) {
      return 'UNAVAILABLE';
    }

    if (errorString.includes('unauthenticated') || errorString.includes('auth') || errorString.includes('token') || errorString.includes('authentication')) {
      return 'UNAUTHENTICATED';
    }

    if (errorString.includes('quota') || errorString.includes('limit') || errorString.includes('exceeded') || errorString.includes('rate limit')) {
      return 'QUOTA_EXCEEDED';
    }

    if (errorString.includes('data') || errorString.includes('invalid') || errorString.includes('missing') || errorString.includes('malformed') || errorString.includes('too big')) {
      return 'DATA_ERROR';
    }

    if (errorString.includes('write') || errorString.includes('update') || errorString.includes('delete') || errorString.includes('operation') || errorString.includes('failed')) {
      return 'OPERATION_FAILED';
    }

    if (errorString.includes('config') || errorString.includes('initialization') || errorString.includes('setup') || errorString.includes('initialize')) {
      return 'CONFIG_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Formate un message d'erreur lisible
   */
  private formatErrorMessage(type: FirebaseErrorType, operation: string, path: string, error: any): string {
    const errorCode = error?.code || '';
    const errorMessage = error?.message || String(error);
    const codeInfo = errorCode ? ` [${errorCode}]` : '';

    switch (type) {
      case 'CONNECTION_ERROR':
        return `Erreur de connexion Firebase lors de "${operation}" sur "${path}"${codeInfo} : ${errorMessage}`;
      
      case 'TIMEOUT_ERROR':
        return `Timeout Firebase lors de "${operation}" sur "${path}"${codeInfo} : ${errorMessage}`;
      
      case 'PERMISSION_DENIED':
        return `Permission refusée pour "${operation}" sur "${path}"${codeInfo} : ${errorMessage}`;
      
      case 'UNAVAILABLE':
        return `Service Firebase indisponible pour "${operation}" sur "${path}"${codeInfo} : ${errorMessage}`;
      
      case 'UNAUTHENTICATED':
        return `Authentification requise pour "${operation}" sur "${path}"${codeInfo} : ${errorMessage}`;
      
      case 'QUOTA_EXCEEDED':
        return `Quota Firebase dépassé pour "${operation}" sur "${path}"${codeInfo} : ${errorMessage}`;
      
      case 'DATA_ERROR':
        return `Erreur de données pour "${operation}" sur "${path}"${codeInfo} : ${errorMessage}`;
      
      case 'OPERATION_FAILED':
        return `Opération Firebase échouée "${operation}" sur "${path}"${codeInfo} : ${errorMessage}`;
      
      case 'CONFIG_ERROR':
        return `Erreur de configuration Firebase pour "${operation}"${codeInfo} : ${errorMessage}`;
      
      default:
        return `Erreur Firebase inconnue lors de "${operation}" sur "${path}"${codeInfo} : ${errorMessage}`;
    }
  }

  /**
   * Enregistre une erreur Firebase
   */
  logError(
    operation: string,
    path: string,
    error: any,
    details?: any
  ): FirebaseLog {
    const type = this.categorizeError(error);
    const log: FirebaseLog = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      operation,
      path,
      message: this.formatErrorMessage(type, operation, path, error),
      errorCode: error?.code || error?.message || undefined,
      errorDetails: details || error,
      timestamp: new Date()
    };

    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Notifier les listeners
    this.listeners.forEach(listener => listener(log));

    return log;
  }

  /**
   * S'abonner aux nouveaux logs
   */
  subscribe(listener: (log: FirebaseLog) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Obtenir tous les logs
   */
  getLogs(): FirebaseLog[] {
    return [...this.logs];
  }

  /**
   * Obtenir les logs d'erreur uniquement
   */
  getErrorLogs(): FirebaseLog[] {
    return [...this.logs];
  }

  /**
   * Wrapper pour les opérations Firebase avec gestion d'erreur automatique
   */
  async wrapOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    path: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logError(operationName, path, error);
      throw error;
    }
  }

  /**
   * Effacer les logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Obtenir les logs par type
   */
  getLogsByType(type: FirebaseErrorType): FirebaseLog[] {
    return this.logs.filter(log => log.type === type);
  }
}

// Instance singleton
export const firebaseLogger = new FirebaseLoggerService();
