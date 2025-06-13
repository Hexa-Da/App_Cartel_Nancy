import { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, remove, set } from 'firebase/database';
import { database, storage } from '../firebase';
import { PlanningFile } from '../types';
import { auth } from '../firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

// Fonction pour compresser l'image
const compressImage = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculer les nouvelles dimensions tout en gardant le ratio
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convertir en Blob avec une qualité de 0.8
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Erreur lors de la compression de l\'image'));
            }
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'));
    };
    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
  });
};

export default function PlanningFiles() {
  const [files, setFiles] = useState<PlanningFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<PlanningFile[]>([]);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFile, setNewFile] = useState({
    name: '',
    type: 'image' as const,
    url: '',
    description: '',
    eventType: ''
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Liste des types d'événements disponibles
  const eventTypes = [
    { value: 'all', label: 'Tous les événements' },
    { value: 'party', label: 'Soirées et Défilé ⭐' },
    { value: 'Football', label: 'Football ⚽' },
    { value: 'Basketball', label: 'Basketball 🏀' },
    { value: 'Handball', label: 'Handball 🤾' },
    { value: 'Rugby', label: 'Rugby 🏉' },
    { value: 'Ultimate', label: 'Ultimate 🥏' },
    { value: 'Natation', label: 'Natation 🏊' },
    { value: 'Badminton', label: 'Badminton 🏸' },
    { value: 'Tennis', label: 'Tennis 🎾' },
    { value: 'Cross', label: 'Cross 🏃' },
    { value: 'Volleyball', label: 'Volleyball 🏐' },
    { value: 'Ping-pong', label: 'Ping-pong 🏓' },
    { value: 'Boxe', label: 'Boxe 🥊' },
    { value: 'Athlétisme', label: 'Athlétisme 🏃‍♂️' },
    { value: 'Pétanque', label: 'Pétanque 🍹' },
    { value: 'Escalade', label: 'Escalade 🧗‍♂️' },
    { value: 'Jeux de société', label: 'Jeux de société 🎲' },
    { value: 'Pompom', label: 'Pompom 🎀' },
    { value: 'Defile', label: 'Défilé 🎺' },
    { value: 'Hotel', label: 'Hôtel 🏢' },
    { value: 'Restaurant', label: 'Restaurant 🍽️' }
  ];

  useEffect(() => {
    // Vérifier si l'utilisateur est admin
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const adminsRef = ref(database, 'admins');
        onValue(adminsRef, (snapshot) => {
          const admins = snapshot.val();
          setIsAdmin(admins && admins[user.uid]);
        });
      } else {
        setIsAdmin(false);
      }
    });

    // Charger les fichiers
    const filesRef = ref(database, 'planningFiles');
    const filesUnsubscribe = onValue(filesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const filesArray = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as Omit<PlanningFile, 'id'>)
        }));
        setFiles(filesArray);
      } else {
        setFiles([]);
      }
    });

    return () => {
      unsubscribe();
      filesUnsubscribe();
    };
  }, []);

  // Effet pour filtrer les fichiers quand les filtres ou la liste change
  useEffect(() => {
    let filtered = files;

    // Filtre par type d'événement
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(file => 
        file.eventType === eventTypeFilter
      );
    }

    setFilteredFiles(filtered);
  }, [eventTypeFilter, files]);

  const handleDeleteFile = async (fileId: string) => {
    if (!isAdmin) return;
    
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) {
      try {
        await remove(ref(database, `planningFiles/${fileId}`));
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'image:', error);
        alert('Une erreur est survenue lors de la suppression de l\'image.');
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image valide.');
        return;
      }
      setNewFile(prev => ({ ...prev, name: file.name }));
    }
  };

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      alert('Veuillez sélectionner une image.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Vérifier la taille du fichier (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Le fichier est trop volumineux. Taille maximum : 10MB');
      }

      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        throw new Error('Le fichier doit être une image');
      }

      // Compresser l'image
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `planningFiles/${timestamp}_${sanitizedFileName}`;

      // Upload image to Firebase Storage with progress tracking
      const storageReference = storageRef(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageReference, compressedFile);

      // Gérer le suivi de la progression
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Erreur lors de l\'upload:', error);
          throw error;
        },
        async () => {
          try {
            // Upload réussi, obtenir l'URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Save file info to database
            const newFileRef = push(ref(database, 'planningFiles'));
            await set(newFileRef, {
              ...newFile,
              url: downloadURL,
              uploadDate: Date.now(),
              uploadedBy: auth.currentUser?.uid || 'unknown'
            });

            setNewFile({
              name: '',
              type: 'image',
              url: '',
              description: '',
              eventType: ''
            });
            setShowAddForm(false);

            // Reset file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          } catch (error) {
            console.error('Erreur lors de la sauvegarde des informations:', error);
            throw error;
          }
        }
      );
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'image:', error);
      let errorMessage = 'Une erreur est survenue lors de l\'ajout de l\'image.';
      
      if (error instanceof Error) {
        if (error.message.includes('CORS')) {
          errorMessage = 'Erreur CORS : Veuillez vérifier la configuration de Firebase Storage.';
        } else if (error.message.includes('trop volumineux')) {
          errorMessage = error.message;
        } else if (error.message.includes('doit être une image')) {
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleImageClick = (url: string) => {
    setSelectedImage(url);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className="planning-files">
      <h2>Plannings</h2>
      
      <div className="filters">
        <div className="filter-group">
          <select
            id="eventTypeFilter"
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="filter-select"
          >
            {eventTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isAdmin && (
        <div className="admin-controls">
          <button
            className="add-file-button"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Annuler' : 'Ajouter un planning'}
          </button>
        </div>
      )}

      {showAddForm && isAdmin && (
        <form onSubmit={handleAddFile} className="add-file-form">
          <div className="form-group">
            <label htmlFor="fileName">Nom du planning</label>
            <input
              type="text"
              id="fileName"
              value={newFile.name}
              onChange={(e) => setNewFile({ ...newFile, name: e.target.value })}
              required
              placeholder="Ex: Planning Basketball M"
            />
          </div>

          <div className="form-group">
            <label htmlFor="eventType">Type d'événement</label>
            <select
              id="eventType"
              value={newFile.eventType}
              onChange={(e) => setNewFile({ ...newFile, eventType: e.target.value })}
              required
            >
              <option value="">Sélectionnez un type</option>
              {eventTypes.filter(type => type.value !== 'all').map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="fileInput">Image du planning</label>
            <input
              type="file"
              id="fileInput"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              required
              className="file-input"
            />
            <p className="file-input-help">Formats acceptés : JPG, PNG, GIF</p>
          </div>

          <div className="form-group">
            <label htmlFor="fileDescription">Description (optionnelle)</label>
            <textarea
              id="fileDescription"
              value={newFile.description}
              onChange={(e) => setNewFile({ ...newFile, description: e.target.value })}
              placeholder="Description du planning..."
            />
          </div>

          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p>Upload en cours... {uploadProgress}%</p>
            </div>
          )}

          <button 
            type="submit" 
            className="submit-button"
            disabled={uploading}
          >
            {uploading ? 'Upload en cours...' : 'Ajouter le planning'}
          </button>
        </form>
      )}

      {filteredFiles.length === 0 ? (
        <p>Aucun planning disponible</p>
      ) : (
        <div className="files-list">
          {filteredFiles.map((file) => (
            <div key={file.id} className="file-item">
              <div className="file-info">
                <h3>{file.name}</h3>
                {file.description && <p>{file.description}</p>}
                <p>Ajouté le: {new Date(file.uploadDate).toLocaleDateString()}</p>
              </div>
              <div className="file-preview">
                <img 
                  src={file.url} 
                  alt={file.name}
                  className="planning-image"
                  onClick={() => handleImageClick(file.url)}
                />
              </div>
              <div className="file-actions">
                <button
                  onClick={() => handleImageClick(file.url)}
                  className="icon-button view-button"
                  title="Voir l'image en plein écran"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="icon-button delete-button"
                    title="Supprimer l'image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-button" onClick={closeImageModal}>×</button>
            <img src={selectedImage} alt="Planning en plein écran" />
          </div>
        </div>
      )}
    </div>
  );
} 