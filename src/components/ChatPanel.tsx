/**
 * @fileoverview Composant réutilisable pour le panneau de chat
 * 
 * Ce composant fournit :
 * - Affichage des messages en temps réel depuis Firebase
 * - Gestion de l'ajout/modification/suppression de messages (admin)
 * - Traduction des messages en anglais
 * - Formulaire d'ajout/modification de messages
 * 
 * Nécessaire car :
 * - Centralise le rendu et la logique du chat
 * - Assure un rendu cohérent dans toute l'application
 * - Évite la duplication de code entre Layout.tsx et App.tsx
 */

import React, { useState, useEffect } from 'react';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { database } from '../firebase';
import { firebaseLogger } from '../services/FirebaseLogger';
import NotificationService from '../services/NotificationService';
import logger from '../services/Logger';
import { useModal } from '../contexts/ModalContext';
import './ChatPanel.css';

interface Message {
  id?: string;
  content: string;
  sender: string;
  timestamp: number;
  isAdmin: boolean;
}

interface ChatPanelProps {
  isAdmin: boolean;
  isEditing: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ isAdmin, isEditing }) => {
  const { setShowVSSForm } = useModal();
  const [messages, setMessages] = useState<Message[]>([]);
  const [translatedMessages, setTranslatedMessages] = useState<{[key: string]: string}>({});
  const [showAddMessage, setShowAddMessage] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newMessageSender, setNewMessageSender] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fermer le formulaire VSS quand le chat s'ouvre
  useEffect(() => {
    setShowVSSForm(false);
  }, [setShowVSSForm]);

  // Annuler l'ajout de message si isEditing passe à false
  useEffect(() => {
    if (!isEditing && showAddMessage) {
      setShowAddMessage(false);
      setNewMessage('');
      setNewMessageSender('');
      setEditingMessageId(null);
    }
  }, [isEditing, showAddMessage]);

  // Lecture en temps réel des messages depuis Firebase
  useEffect(() => {
    const messagesRef = ref(database, 'chatMessages');
    setIsLoading(true);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val() || {};
      // Transforme l'objet en tableau [{id, ...}]
      const messagesArray = Object.entries(data).map(([id, value]) => ({ id, ...(value as any) }));
      
      // Trier les messages par timestamp décroissant (plus récents en premier)
      const sortedMessages = messagesArray.sort((a, b) => b.timestamp - a.timestamp);
      
      // Initialiser le timestamp de dernière lecture seulement si c'est la première fois
      if (!localStorage.getItem('lastSeenChatTimestamp')) {
        const now = Date.now();
        localStorage.setItem('lastSeenChatTimestamp', String(now));
      }
      
      setMessages(sortedMessages);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Mettre à jour le timestamp de dernière lecture quand le chat est ouvert
  useEffect(() => {
    if (messages.length > 0) {
      const mostRecentMsg = messages[0];
      const newTimestamp = mostRecentMsg.timestamp;
      localStorage.setItem('lastSeenChatTimestamp', String(newTimestamp));
    }
  }, [messages]);

  // Ajout d'un message dans Firebase (avec nom personnalisé)
  const handleAddMessage = async (msg: string, sender: string) => {
    try {
      const newMsgRef = push(ref(database, 'chatMessages'));
      await firebaseLogger.wrapOperation(
        () => set(newMsgRef, {
          content: msg,
          sender: sender || 'Organisation',
          timestamp: Date.now(),
          isAdmin: true
        }),
        'write:message',
        'chatMessages'
      );

      const notificationService = NotificationService.getInstance();
      await notificationService.notifyChatMessage(msg, sender);
    } catch (error) {
      // L'erreur est déjà loggée par wrapOperation
      throw error;
    }
  };

  // Modification d'un message dans Firebase (texte et nom)
  const handleEditMessage = async (id: string, newContent: string, newSender: string) => {
    try {
      await firebaseLogger.wrapOperation(
        () => update(ref(database, `chatMessages/${id}`), { content: newContent, sender: newSender}),
        'update:message',
        `chatMessages/${id}`
      );
    } catch (error) {
      // L'erreur est déjà loggée par wrapOperation
      throw error;
    }
  };

  // Suppression d'un message dans Firebase
  const handleDeleteMessage = async (id: string) => {
    try {
      await firebaseLogger.wrapOperation(
        () => remove(ref(database, `chatMessages/${id}`)),
        'delete:message',
        `chatMessages/${id}`
      );
    } catch (error) {
      // L'erreur est déjà loggée par wrapOperation
      throw error;
    }
  };

  // Fonction pour traduire un message en anglais
  const translateMessage = async (messageId: string, text: string) => {
    try {
      // Si le message est déjà traduit, on revient au français
      if (translatedMessages[messageId]) {
        setTranslatedMessages(prev => {
          const newState = { ...prev };
          delete newState[messageId];
          return newState;
        });
        return;
      }

      // Utilisation de l'API de traduction gratuite
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=en&dt=t&q=${encodeURIComponent(text)}`);
      const data = await response.json();
      
      if (data && data[0]) {
        // Concaténer tous les segments traduits pour obtenir le texte complet
        const translatedText = data[0]
          .filter((segment: any) => segment && segment[0])
          .map((segment: any[]) => segment[0])
          .join('');
        // Stocker la traduction dans l'état
        setTranslatedMessages(prev => ({
          ...prev,
          [messageId]: translatedText
        }));
      } else {
        alert('Erreur lors de la traduction');
      }
    } catch (error) {
      logger.error('Erreur de traduction:', error);
      alert('Erreur lors de la traduction. Veuillez réessayer.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      if (editingMessageId) {
        // Si on édite un message existant
        handleEditMessage(editingMessageId, newMessage, newMessageSender);
      } else {
        // Sinon, on ajoute un nouveau message
        handleAddMessage(newMessage, newMessageSender);
      }
      setNewMessage('');
      setNewMessageSender('');
      setShowAddMessage(false);
      setEditingMessageId(null);
    }
  };

  const handleEditClick = (message: Message) => {
    setShowAddMessage(true);
    setNewMessage(message.content);
    setNewMessageSender(message.sender);
    setEditingMessageId(message.id || null);
  };

  const handleDeleteClick = (messageId: string | undefined) => {
    if (window.confirm('Supprimer ce message ?') && messageId) {
      handleDeleteMessage(messageId);
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <h3>Messages de l'orga</h3>
        <div className="chat-panel-header-actions">
          {isAdmin && isEditing && (
            <button
              className="add-message-button add-message-button-wrapper"
              onClick={() => {
                if (showAddMessage) {
                  // Si on ferme le formulaire, réinitialiser les champs
                  setNewMessage('');
                  setNewMessageSender('');
                  setEditingMessageId(null);
                }
                setShowAddMessage((v) => !v);
              }}
            >
              {showAddMessage ? 'Annuler' : 'Ajouter'}
            </button>
          )}
        </div>
      </div>
      
      {showAddMessage && (
        <form
          className="add-message-form"
          onSubmit={handleSubmit}
        >
          {/* Ligne avec Nom et bouton d'envoi */}
          <div className="add-message-form-row">
            <input
              type="text"
              value={newMessageSender}
              onChange={e => setNewMessageSender(e.target.value)}
              placeholder="Nom (ex: Organisation, Prénom...)"
              className="add-message-form-input"
            />
            <button 
              type="submit" 
              className="add-message-form-submit"
            >
              ➡️
            </button>
          </div>
          {/* Textarea pour le message */}
          <textarea
            value={newMessage}
            onChange={e => {
              setNewMessage(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            placeholder="Votre message..."
            className="add-message-form-textarea"
            autoFocus
          />
        </form>
      )}
      
      <div className="chat-container">
        {isLoading ? (
          <div className="chat-loading-spinner-container">
            <div className="chat-loading-spinner"></div>
            <div className="chat-loading-text">Chargement des messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty-message">
            Aucun message pour le moment
          </div>
        ) : (
          messages.map((message, index) => (
          <div 
            key={message.id || index} 
            className={`chat-message chat-message-wrapper ${message.isAdmin ? 'admin' : ''}`}
          >
            <div className="chat-message-header">
              <span>{message.sender}</span>
              <span>{new Date(message.timestamp).toLocaleString()}</span>
            </div>
            <div className="chat-message-content">
              {translatedMessages[message.id || `msg-${index}`] || message.content}
            </div>
            {/* Bouton de traduction en bas à droite */}
            <button
              className="translate-button"
              onClick={() => translateMessage(message.id || `msg-${index}`, message.content)}
              title={translatedMessages[message.id || `msg-${index}`] ? "Revenir au français" : "Traduire en anglais"}
            >
              {translatedMessages[message.id || `msg-${index}`] ? "Original" : "🌐 Translate"}
            </button>
            {/* Boutons admin en bas à droite */}
            {isAdmin && isEditing && (
              <div className="chat-admin-buttons">
                <button
                  className="edit-message-button"
                  title="Modifier"
                  onClick={() => handleEditClick(message)}
                >
                  ✏️
                </button>
                <button
                  className="delete-message-button"
                  title="Supprimer"
                  onClick={() => handleDeleteClick(message.id)}
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        ))
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
