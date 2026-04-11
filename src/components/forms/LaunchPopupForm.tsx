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
import { getAppNow } from '../../config/homeMomentDebug';
import '../ModalForm.css';

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const IMAGE_MIME_PREFIX = 'image/';
const VIDEO_MIME_PREFIX = 'video/';
const VIDEO_EXTENSIONS = new Set(['mp4', 'm4v', 'webm']);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

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

const getFileExtension = (fileName: string): string => {
  const ext = fileName.split('.').pop();
  return ext ? ext.toLowerCase() : '';
};

const getSanitizedMediaName = (file: File, isVideo: boolean): string => {
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9.-]/g, '_');
  if (isVideo) {
    const extension = getFileExtension(file.name) || 'mp4';
    return `${baseName}.${extension}`;
  }
  return `${baseName}.jpg`;
};

const resolveMediaType = (file: File): 'image' | 'video' | null => {
  if (file.type.startsWith(IMAGE_MIME_PREFIX)) return 'image';
  if (file.type.startsWith(VIDEO_MIME_PREFIX)) return 'video';
  const extension = getFileExtension(file.name);
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  return null;
};

const resolveContentType = (file: File, mediaType: 'image' | 'video'): string => {
  if (file.type) return file.type;
  const extension = getFileExtension(file.name);
  if (mediaType === 'video') {
    if (extension === 'webm') return 'video/webm';
    if (extension === 'm4v') return 'video/x-m4v';
    return 'video/mp4';
  }
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  return 'image/jpeg';
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
  const now = getAppNow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storageInstance = getStorage(app);

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(toDateInput(now));
  const [error, setError] = useState('');

  const resetForm = useCallback(() => {
    setTitle('');
    setStartDate(toDateInput(getAppNow()));
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
      setError('Veuillez choisir une image ou une vidéo');
      return;
    }
    const mediaType = resolveMediaType(file);
    const isImage = mediaType === 'image';
    const isVideo = mediaType === 'video';
    if (!isImage && !isVideo) {
      setError('Le fichier doit être une image ou une vidéo');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('Le fichier est trop volumineux (max 100 Mo)');
      return;
    }

    setUploading(true);
    setError('');

    try {
      setUploadProgress(5);
      let fileToUpload = file;
      if (isImage) {
        try {
          fileToUpload = await compressImage(file, 500, 0.8);
        } catch (compressionErr) {
          logger.warn('Compression échouée, utilisation du fichier original:', compressionErr);
        }
      }

      const timestamp = Date.now();
      const sanitizedFileName = getSanitizedMediaName(fileToUpload, isVideo);
      const storagePath = `launchPopups/${timestamp}_${sanitizedFileName}`;
      const contentType = resolveContentType(fileToUpload, mediaType);

      const storageReference = storageRef(storageInstance, storagePath);
      const uploadTask = uploadBytesResumable(storageReference, fileToUpload, { contentType });

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
        image: isImage ? downloadURL : undefined,
        video: isVideo ? downloadURL : undefined,
        startDate: start.toISOString()
      };

      const popupData: Record<string, string> = {
        title: popup.title,
        startDate: popup.startDate
      };
      if (popup.image) {
        popupData.image = popup.image;
      }
      if (popup.video) {
        popupData.video = popup.video;
      }

      await set(newRef, popupData);

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
            <label htmlFor="popup-image">Image ou vidéo</label>
            <input
              id="popup-image"
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
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
