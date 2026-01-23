/**
 * @fileoverview Error Boundary pour capturer les erreurs React et afficher un message utilisateur
 * 
 * Ce composant empêche l'écran noir en cas d'erreur et affiche un message clair.
 * Particulièrement utile pour les erreurs Firebase non initialisé.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { isFirebaseInitialized } from '../firebase';
import logger from '../services/Logger';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isFirebaseError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isFirebaseError: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Vérifier si c'est une erreur Firebase
    const isFirebaseError = 
      error.message.includes('Firebase') || 
      error.message.includes('n\'est pas initialisé') ||
      error.message.includes('Clés Firebase manquantes');

    return {
      hasError: true,
      error,
      isFirebaseError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('[ErrorBoundary] Erreur capturée:', error);
    logger.error('[ErrorBoundary] Stack trace:', errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isFirebaseError: false
    });
  };

  render() {
    if (this.state.hasError) {
      // Si un fallback personnalisé est fourni, l'utiliser
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, isFirebaseError } = this.state;
      const isFirebaseReady = isFirebaseInitialized();

      // Message d'erreur spécifique pour Firebase
      if (isFirebaseError) {
        return (
          <div className="error-boundary">
            <div className="error-boundary-content">
              <div className="error-boundary-icon">⚠️</div>
              <h2 className="error-boundary-title">
                Erreur de configuration Firebase
              </h2>
              <p className="error-boundary-message">
                {isFirebaseReady 
                  ? 'Une erreur est survenue lors de l\'accès à Firebase.'
                  : 'Firebase n\'est pas correctement configuré. Vérifiez votre fichier .env et redémarrez l\'application.'}
              </p>
              {error && (
                <details className="error-boundary-details">
                  <summary>Détails techniques</summary>
                  <pre className="error-boundary-stack">{error.message}</pre>
                </details>
              )}
              <div className="error-boundary-actions">
                <button 
                  onClick={this.handleRetry}
                  className="error-boundary-button"
                >
                  Réessayer
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="error-boundary-button error-boundary-button-secondary"
                >
                  Recharger la page
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Message d'erreur générique
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">❌</div>
            <h2 className="error-boundary-title">Une erreur est survenue</h2>
            <p className="error-boundary-message">
              L'application a rencontré une erreur inattendue.
            </p>
            {error && (
              <details className="error-boundary-details">
                <summary>Détails techniques</summary>
                <pre className="error-boundary-stack">{error.message}</pre>
              </details>
            )}
            <div className="error-boundary-actions">
              <button 
                onClick={this.handleRetry}
                className="error-boundary-button"
              >
                Réessayer
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="error-boundary-button error-boundary-button-secondary"
              >
                Recharger la page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
