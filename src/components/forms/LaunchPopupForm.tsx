/**
 * @fileoverview Modal pour ajouter une popup de pub au démarrage
 * Image importée via le sélecteur de fichier (comme PlanningFiles)
 */

import React, { useState, useCallback, useRef } from 'react';
import { ref, push, set } from 'firebase/database';
import { ref as storageRef, getDownloadURL, uploadBytesResumable, getStorage } from 'firebase/storage';
import { database, app } from '../../firebase';
import { LaunchPopup } from '../../types';
import logger from '../../services/Logger';
import { compressImage } from '../../services/imageCompression';
import { onModalSingleLineInputEnterKey } from '../../utils/mobileFormKeyboard';
import '../ModalForm.css';

interface LaunchPopupFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  uploading: boolean;
  setUploading: (value: boolean) => void;
  uploadProgress: number;
  setUploadProgress: (value: number) => void;
}

const toDateInput = (date: Date): string => {
  return date.toISOString().slice(0, 16);
};

const LaunchPopupForm: React.FC<LaunchPopupFormProps> = ({
  isOpen,
  onClose,
  onSaved,
  uploading,
  setUploading,
  uploadProgress: _uploadProgress,
  setUploadProgress
}) => {
  const now = new Date();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storageInstance = getStorage(app);

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(toDateInput(now));
  const [error, setError] = useState('');

  const resetForm = useCallback(() => {
    setTitle('');
    setStartDate(toDateInput(new Date()));
    setError('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setUploadProgress]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSave = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!title.trim()) {
      setError('Le titre est obligatoire');
      return;
    }
    if (!file) {
      setError('Veuillez choisir une image');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Le fichier doit être une image');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('Le fichier est trop volumineux (max 100 Mo)');
      return;
    }

    setUploading(true);
    setError('');

    try {
      setUploadProgress(5);
      let fileToUpload = file;
      try {
        fileToUpload = await compressImage(file, 500, 0.8);
      } catch (compressionErr) {
        logger.warn('Compression échouée, utilisation du fichier original:', compressionErr);
      }

      const timestamp = Date.now();
      const baseName = fileToUpload.name.replace(/\.[^.]+$/, '');
      const sanitizedFileName = `${baseName}.jpg`.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `launchPopups/${timestamp}_${sanitizedFileName}`;

      const storageReference = storageRef(storageInstance, storagePath);
      const uploadTask = uploadBytesResumable(storageReference, fileToUpload);

      const downloadURL = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          reject,
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      const popupsRef = ref(database, 'launchPopups');
      const newRef = push(popupsRef);
      const id = newRef.key;

      if (!id) throw new Error('Firebase push failed');

      const start = new Date(startDate);
      const popup: LaunchPopup = {
        id,
        title: title.trim(),
        image: downloadURL,
        startDate: start.toISOString()
      };

      await set(newRef, {
        title: popup.title,
        image: popup.image,
        startDate: popup.startDate
      });

      resetForm();
      onSaved?.();
      handleClose();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errCode = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : '';
      logger.error('LaunchPopupForm: Erreur sauvegarde', err);
      if (errCode === 'storage/unauthorized' || errCode === 'storage/forbidden') {
        setError('Permissions insuffisantes. Vérifiez les règles Firebase Storage dans la console.');
      } else if (errMsg.includes('quota') || errCode === 'storage/quota-exceeded') {
        setError('Stockage dépassé. Vérifiez le quota Firebase.');
      } else {
        setError(`Erreur : ${errMsg}`);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [title, startDate, resetForm, onSaved, handleClose, setUploading, setUploadProgress]);

  if (!isOpen) return null;

  return (
    <div className="modal-form-overlay" onClick={handleClose}>
      <div
        className="modal-form-container modal-form-container--compact"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-form-header">
          <h2>Ajouter une pub</h2>
          <button
            type="button"
            className="close-button"
            onClick={handleClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <div className="modal-form-content">
          <div className="modal-form-group">
            <label htmlFor="popup-title">Titre</label>
            <input
              id="popup-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Nouvelle offre"
              enterKeyHint="done"
              onKeyDown={onModalSingleLineInputEnterKey}
              className="modal-form-input"
            />
          </div>
          <div className="modal-form-group">
            <label htmlFor="popup-image">Image</label>
            <input
              id="popup-image"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="modal-form-input"
            />
          </div>
          <div className="modal-form-group">
            <label htmlFor="popup-start">Date de début</label>
            <input
              id="popup-start"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              enterKeyHint="done"
              onKeyDown={onModalSingleLineInputEnterKey}
              className="modal-form-input"
            />
          </div>
          {error && <p className="modal-form-error">{error}</p>}
          <div className="modal-form-actions">
            <button
              type="button"
              className="modal-form-submit"
              onClick={handleSave}
              disabled={uploading}
            >
              {uploading ? 'Sauvegarde...' : 'Ajouter'}
            </button>
            <button
              type="button"
              className="modal-form-cancel"
              onClick={handleClose}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchPopupForm;
