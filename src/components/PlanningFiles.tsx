import { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, remove, set } from 'firebase/database';
import { database, storage } from '../firebase';
import { PlanningFile } from '../types';
import { ref as storageRef, getDownloadURL, uploadBytesResumable, deleteObject } from 'firebase/storage';

// Classe pour optimiser les connexions Firebase et monitoring des coûts
class FirebaseOptimizer {
  private static instance: FirebaseOptimizer;
  private activeConnections = 0;
  private maxConnections = 95;
  private dailyTransfer = 0;
  private dailyStorage = 0;
  private readonly MAX_DAILY_TRANSFER = 10 * 1024 * 1024 * 1024; // 10GB
  private readonly MAX_DAILY_STORAGE = 1024 * 1024 * 1024; // 1GB

  static getInstance() {
    if (!FirebaseOptimizer.instance) {
      FirebaseOptimizer.instance = new FirebaseOptimizer();
    }
    return FirebaseOptimizer.instance;
  }

  trackTransfer(bytes: number) {
    this.dailyTransfer += bytes;
    if (this.dailyTransfer > this.MAX_DAILY_TRANSFER * 0.8) {
      console.warn('⚠️ Limite de transfert quotidien atteinte à 80%');
    }
  }

  trackStorage(bytes: number) {
    this.dailyStorage += bytes;
    if (this.dailyStorage > this.MAX_DAILY_STORAGE * 0.8) {
      console.warn('⚠️ Limite de stockage quotidien atteinte à 80%');
    }
  }

  canCreateConnection(): boolean {
    return this.activeConnections < this.maxConnections;
  }

  registerConnection() {
    this.activeConnections++;
  }

  unregisterConnection() {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }
}

// Fonction de compression d'image optimisée
const compressImage = (file: File, maxSizeKB = 500, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Vérifier si c'est une image
    if (!file.type.startsWith('image/')) {
      resolve(file); // Retourner le fichier tel quel si ce n'est pas une image
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Redimensionner si nécessaire
      const maxWidth = 1200;
      const maxHeight = 1200;
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Image compression failed'));
            return;
          }

          // Vérifier la taille finale
          if (blob.size > maxSizeKB * 1024) {
            // Recompresser avec une qualité plus faible
            const newQuality = Math.max(0.3, quality - 0.1);
            canvas.toBlob(
              (newBlob) => {
                if (!newBlob) {
                  reject(new Error('Image recompression failed'));
                  return;
                }
                const compressedFile = new File([newBlob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              },
              'image/jpeg',
              newQuality
            );
          } else {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Image loading failed'));
    img.src = URL.createObjectURL(file);
  });
};

interface PlanningFilesProps {
  isAdmin?: boolean;
  filter?: string;
  showFilterSelector?: boolean;
  uploading?: boolean;
  setUploading?: (uploading: boolean) => void;
  uploadProgress?: number;
  setUploadProgress?: (progress: number) => void;
}

export default function PlanningFiles({ 
  isAdmin = false, 
  filter, 
  showFilterSelector = true,
  uploading: externalUploading,
  setUploading: externalSetUploading,
  uploadProgress: externalUploadProgress,
  setUploadProgress: externalSetUploadProgress
}: PlanningFilesProps) {
  const [files, setFiles] = useState<PlanningFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<PlanningFile[]>([]);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFile, setNewFile] = useState({
    name: '',
    type: 'image' as const,
    url: '',
    eventType: ''
  });
  const [internalUploading, setInternalUploading] = useState(false);
  const [internalUploadProgress, setInternalUploadProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  
  // Utiliser les props externes si fournies, sinon les états internes
  const uploading = externalUploading !== undefined ? externalUploading : internalUploading;
  const uploadProgress = externalUploadProgress !== undefined ? externalUploadProgress : internalUploadProgress;
  const setUploading = externalSetUploading || setInternalUploading;
  const setUploadProgress = externalSetUploadProgress || setInternalUploadProgress;
  
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
    { value: 'Cross', label: 'Cross 👟' },
    { value: 'Volleyball', label: 'Volleyball 🏐' },
    { value: 'Ping-pong', label: 'Ping-pong 🏓' },
    { value: 'Boxe', label: 'Boxe 🥊' },
    { value: 'Athlétisme', label: 'Athlétisme 🏃‍♂️' },
    { value: 'Spikeball', label: 'Spikeball ⚡️' },
    { value: 'Escalade', label: 'Escalade 🧗‍♂️' },
    { value: 'Pompom', label: 'Pompom 🎀' },
    { value: 'Defile', label: 'Défilé 🎺' },
    { value: 'Hotel', label: 'Hôtel 🏢' },
    { value: 'Restaurant', label: 'Restaurant 🍽️' }
  ];

  // Helper pour détecter mobile
  const isMobile = window.innerWidth < 600;

  // Initialiser le filtre basé sur la prop
  useEffect(() => {
    if (filter) {
      if (filter === 'sports') {
        // Afficher tous les sports (exclure restaurants, hôtels, soirées)
        setEventTypeFilter('sports');
      } else if (filter === 'restaurants') {
        setEventTypeFilter('Restaurant');
      } else if (filter === 'bus') {
        setEventTypeFilter('party'); // Les bus sont liés aux soirées
      } else if (filter === 'all') {
        setEventTypeFilter('all');
      }
    }
  }, [filter]);

  useEffect(() => {
    // Désactiver l'écoute si la page n'est pas visible
    if (!isVisible) return;

    // Charger les fichiers avec optimisation des connexions
    const optimizer = FirebaseOptimizer.getInstance();
    
    if (!optimizer.canCreateConnection()) {
      console.warn('Limite de connexions Firebase atteinte pour les fichiers');
      return;
    }

    optimizer.registerConnection();
    
    const filesRef = ref(database, 'planningFiles');
    const filesUnsubscribe = onValue(filesRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data) {
        // Calculer la taille des données transférées
        const dataSize = JSON.stringify(data).length;
        optimizer.trackTransfer(dataSize);
        
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
      filesUnsubscribe();
      optimizer.unregisterConnection();
    };
  }, [isVisible]);

  // Utiliser IntersectionObserver pour détecter la visibilité
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      setIsVisible(entries[0].isIntersecting);
    });
    
    // Observer le conteneur du composant
    const container = document.querySelector('.planning-files');
    if (container) observer.observe(container);
    
    return () => observer.disconnect();
  }, []);

  // Effet pour filtrer les fichiers quand les filtres ou la liste change
  useEffect(() => {
    let filtered = files;


    // Filtre par type d'événement
    if (eventTypeFilter === 'sports') {
      // Afficher tous les sports
      const sportsTypes = [
        'Football', 'Basketball', 'Handball', 'Rugby', 'Ultimate', 'Natation',
        'Badminton', 'Tennis', 'Cross', 'Volleyball', 'Ping-pong', 'Boxe',
        'Athlétisme', 'Spikeball', 'Escalade', 'Pompom', 'Defile'
      ];
      filtered = filtered.filter(file => 
        sportsTypes.includes(file.eventType)
      );
    } else if (eventTypeFilter === 'party') {
      // Afficher les soirées et événements liés
      filtered = filtered.filter(file => 
        file.eventType === 'party' || 
        file.eventType.toLowerCase().includes('soirée') ||
        file.eventType.toLowerCase().includes('gala') ||
        file.eventType.toLowerCase().includes('navette')
      );
    } else if (eventTypeFilter === 'restaurants') {
      // Afficher les restaurants
      filtered = filtered.filter(file => 
        file.eventType === 'Restaurant' ||
        file.eventType.toLowerCase().includes('restaurant') ||
        file.eventType.toLowerCase().includes('crous') ||
        file.eventType.toLowerCase().includes('artem')
      );
    } else if (eventTypeFilter === 'bus') {
      // Afficher les transports
      filtered = filtered.filter(file => 
        file.eventType.toLowerCase().includes('bus') ||
        file.eventType.toLowerCase().includes('transport') ||
        file.eventType.toLowerCase().includes('navette') ||
        file.eventType.toLowerCase().includes('zenith')
      );
    } else if (eventTypeFilter === 'hotel') {
      // Afficher les hôtels
      filtered = filtered.filter(file => 
        file.eventType === 'Hotel' ||
        file.eventType.toLowerCase().includes('hôtel') ||
        file.eventType.toLowerCase().includes('hotel')
      );
    } else if (eventTypeFilter !== 'all') {
      // Filtre exact par type d'événement (pour les filtres spécifiques)
      filtered = filtered.filter(file => 
        file.eventType === eventTypeFilter
      );
    }

    setFilteredFiles(filtered);
  }, [eventTypeFilter, files]);

  const handleDeleteFile = async (fileId: string) => {
    if (!isAdmin) return;
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) {
      try {
        // Récupérer le fichier à supprimer
        const fileToDelete = files.find(f => f.id === fileId);
        if (fileToDelete && fileToDelete.url) {
          // Extraire le chemin du fichier dans le storage à partir de l'URL
          const url = new URL(fileToDelete.url);
          const pathMatch = decodeURIComponent(url.pathname).match(/\/o\/(.+)$/);
          let storagePath = '';
          if (pathMatch && pathMatch[1]) {
            storagePath = pathMatch[1].replace(/\?.*$/, '').replace(/%2F/g, '/');
          } else {
            // fallback: essayer de retrouver le chemin à partir du nom
            storagePath = `planningFiles/${fileToDelete.name}`;
          }
          // Supprimer du storage (ignorer les erreurs de permissions ou 404)
          try {
            await deleteObject(storageRef(storage, storagePath));
            console.log('Fichier supprimé du storage avec succès');
          } catch (error: any) {
            if (error.code === 'storage/object-not-found') {
              console.info('Fichier déjà supprimé ou inexistant dans Firebase Storage.');
            } else if (error.code === 'storage/unauthorized' || error.code === 'storage/forbidden') {
              console.warn('Permissions insuffisantes pour supprimer le fichier du storage, suppression de la base de données uniquement.');
            } else {
              console.warn('Erreur lors de la suppression du fichier du storage:', error.message);
            }
          }
        }
        // Supprimer de la base (toujours)
        await remove(ref(database, `planningFiles/${fileId}`));
        console.log('Fichier supprimé de la base de données avec succès');
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Une erreur est survenue lors de la suppression du fichier.');
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewFile(prev => ({ ...prev, name: file.name }));
    }
  };

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      alert('Veuillez sélectionner un fichier.');
      return;
    }

    const optimizer = FirebaseOptimizer.getInstance();
    
    // Vérifier la limite de connexions
    if (!optimizer.canCreateConnection()) {
      alert('Limite de connexions Firebase atteinte. Veuillez réessayer plus tard.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Vérifier la taille du fichier (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        throw new Error('Le fichier est trop volumineux. Taille maximum : 100MB');
      }

      // Compresser l'image si c'est une image
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        setUploadProgress(10); // Indiquer le début de la compression
        try {
          fileToUpload = await compressImage(file, 500, 0.8);
          console.log(`Image compressée: ${file.size} bytes → ${fileToUpload.size} bytes (${Math.round((1 - fileToUpload.size / file.size) * 100)}% de réduction)`);
        } catch (compressionError) {
          console.warn('Erreur de compression, utilisation du fichier original:', compressionError);
          fileToUpload = file;
        }
      }

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const sanitizedFileName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `planningFiles/${timestamp}_${sanitizedFileName}`;

      // Calculer la taille des données pour le monitoring
      optimizer.trackStorage(fileToUpload.size);
      optimizer.trackTransfer(fileToUpload.size);

      // Upload file to Firebase Storage with progress tracking
      const storageReference = storageRef(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageReference, fileToUpload);

      // Gérer le suivi de la progression
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Erreur lors de l\'upload:', error);
          if (error.code === 'storage/unauthorized' || error.code === 'storage/forbidden') {
            console.warn('Permissions insuffisantes pour l\'upload. Vérifiez les règles de sécurité Firebase Storage.');
          }
          setUploading(false);
          setUploadProgress(0);
          throw error;
        },
        async () => {
          try {
            // Upload réussi, obtenir l'URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Calculer la taille des données de la base
            const fileData = {
              ...newFile,
              url: downloadURL,
              uploadDate: Date.now(),
              uploadedBy: 'admin',
              originalSize: file.size,
              compressedSize: fileToUpload.size,
              compressionRatio: file.type.startsWith('image/') ? Math.round((1 - fileToUpload.size / file.size) * 100) : 0
            };
            
            const dataSize = JSON.stringify(fileData).length;
            optimizer.trackTransfer(dataSize);

            // Save file info to database
            const newFileRef = push(ref(database, 'planningFiles'));
            await set(newFileRef, fileData);

      setNewFile({
        name: '',
        type: 'image',
        url: '',
        eventType: ''
      });
      setShowAddForm(false);

            // Reset file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            
            // Upload terminé avec succès
            setUploading(false);
            setUploadProgress(0);
          } catch (error) {
            console.error('Erreur lors de la sauvegarde des informations:', error);
            setUploading(false);
            setUploadProgress(0);
            throw error;
          }
        }
      );
    } catch (error) {
      console.error('Erreur lors de l\'ajout du fichier:', error);
      let errorMessage = 'Une erreur est survenue lors de l\'ajout du fichier.';
      
      if (error instanceof Error) {
        if (error.message.includes('CORS')) {
          errorMessage = 'Erreur CORS : Veuillez vérifier la configuration de Firebase Storage.';
        } else if (error.message.includes('trop volumineux')) {
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
      setUploading(false);
      setUploadProgress(0);
    }
  };


  // Barre de chargement gérée par le composant parent
  // Variables uploadProgress et uploading utilisées par le composant parent




  // Supprimé l'écran de chargement complet pour laisser place à la barre améliorée

  return (
    <div className="planning-files">
      <h2 style={{ marginTop: 0, marginBottom: '10px' }}>Plannings</h2>
      
      {showFilterSelector && (
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
      )}

      <div className="planning-content">
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
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000
          }}>
            <div className="modal-content" style={{
              background: 'var(--bg-color)',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '400px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid var(--border-color)',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                borderBottom: '1px solid var(--border-color)',
                position: 'relative'
              }}>
                <h3 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.2rem' }}>
                  Ajouter un planning
                </h3>
              <button 
                onClick={() => setShowAddForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                    color: 'var(--text-color)',
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  padding: '0.5rem',
                    lineHeight: 1
                  }}
              >
                ×
              </button>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-color)'
              }}>

              <form onSubmit={handleAddFile} style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '0.7rem' : '1rem',
                width: '100%',
                boxSizing: 'border-box',
              }}>
          <div className="form-group">
                  <label htmlFor="fileName">Nom du planning</label>
            <input
              type="text"
              id="fileName"
              value={newFile.name}
              onChange={(e) => setNewFile({ ...newFile, name: e.target.value })}
              required
              placeholder="Ex: Planning Basketball M"
                    style={{
                      width: '100%',
                      padding: isMobile ? '0.4rem' : '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: isMobile ? '0.98rem' : '1rem',
                      boxSizing: 'border-box',
                    }}
            />
          </div>

          <div className="form-group">
                  <label htmlFor="eventType">Type d'événement</label>
                  <select
                    id="eventType"
                    value={newFile.eventType}
                    onChange={(e) => setNewFile({ ...newFile, eventType: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: isMobile ? '0.4rem' : '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: isMobile ? '0.98rem' : '1rem',
                      boxSizing: 'border-box',
                    }}
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
                  <label htmlFor="fileInput">Fichier</label>
            <input
                    type="file"
                    id="fileInput"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
              required
                    className="file-input"
                    style={{
                      width: '100%',
                      padding: isMobile ? '0.4rem' : '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: isMobile ? '0.98rem' : '1rem',
                      boxSizing: 'border-box',
                    }}
            />
          </div>

          <div style={{ display: 'flex', gap: isMobile ? '0.5rem' : '1rem', justifyContent: 'space-between', marginTop: '1rem', flexWrap: isMobile ? 'wrap' : 'nowrap', width: '100%' }}>
                  <button 
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    style={{
                      padding: isMobile ? '0.4rem 1rem' : '0.5rem 1.5rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--error-color)',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: 'bold',
                      fontSize: isMobile ? '0.98rem' : '1rem',
                      minWidth: 0,
                      boxSizing: 'border-box',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    disabled={uploading}
                    style={{
                      padding: isMobile ? '0.4rem 1rem' : '0.5rem 1.5rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'linear-gradient(45deg, var(--accent-color), #4CAF50)',
                      color: 'white',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      opacity: uploading ? 0.7 : 1,
                      transition: 'all 0.2s ease',
                      fontWeight: 'bold',
                      fontSize: isMobile ? '0.98rem' : '1rem',
                      minWidth: 0,
                      boxSizing: 'border-box',
                    }}
                    onMouseOver={(e) => !uploading && (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseOut={(e) => !uploading && (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    {uploading ? 'Upload en cours...' : 'Ajouter le planning'}
          </button>
                </div>
        </form>
              </div>
            </div>
          </div>
      )}

      {filteredFiles.length === 0 ? (
          <p className="no-files">Aucun planning disponible</p>
      ) : (
          <div className="files-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '40vh', overflowY: 'auto', width: '100%', minWidth: 0, alignItems: 'center' }}>
          {filteredFiles.map((file) => {
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
            return (
              <div key={file.id} className="file-item" style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: isMobile ? '0.6rem 0.5rem' : '0.75rem 1rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                marginBottom: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '0.3rem' : '0.5rem',
                minWidth: 0,
                width: '100%',
                maxWidth: 340,
                boxSizing: 'border-box',
                wordBreak: 'break-word',
                margin: '0 auto',
              }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: isMobile ? '0.98rem' : '1rem',
                  color: 'var(--text-primary)',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  marginBottom: 2,
                  maxWidth: '100%',
                  minWidth: 0,
                }}>{file.name}</div>
                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: 'center',
                  gap: isMobile ? '0.4rem' : '0.7rem',
                  justifyContent: isMobile ? 'center' : 'flex-end',
                  flexWrap: 'wrap',
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                }}>
                  {isImage ? (
                <button
                      onClick={() => window.open(file.url, '_blank')}
                      style={{
                        padding: isMobile ? '0.35rem 0.7rem' : '0.4rem 0.9rem',
                        borderRadius: '4px',
                        background: 'var(--accent-color)',
                        color: 'white',
                        border: 'none',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: 500,
                        fontSize: isMobile ? '0.98rem' : '1rem',
                        transition: 'background 0.2s',
                        minWidth: 0,
                        maxWidth: '100%',
                        flex: '1 1 auto',
                        cursor: 'pointer',
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      Voir
                    </button>
                  ) : (
                    <button
                      onClick={() => window.open(file.url, '_blank')}
                      style={{
                        padding: isMobile ? '0.35rem 0.7rem' : '0.4rem 0.9rem',
                        borderRadius: '4px',
                        background: 'var(--accent-color)',
                        color: 'white',
                        border: 'none',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: 500,
                        fontSize: isMobile ? '0.98rem' : '1rem',
                        transition: 'background 0.2s',
                        minWidth: 0,
                        maxWidth: '100%',
                        flex: '1 1 auto',
                        cursor: 'pointer',
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      Voir
                    </button>
                  )}
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                      className="delete-button"
                      style={{
                        padding: isMobile ? '0.35rem 0.7rem' : '0.4rem 0.9rem',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'var(--error-color)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: 500,
                        fontSize: isMobile ? '0.98rem' : '1rem',
                        transition: 'background 0.2s',
                        minWidth: 0,
                        maxWidth: '100%',
                        flex: '1 1 auto',
                      }}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 