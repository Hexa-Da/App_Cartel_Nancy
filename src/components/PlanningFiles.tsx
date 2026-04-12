import { useState, useEffect, useRef } from 'react';
import { ref, get, push, remove, set } from 'firebase/database';
import { database, app } from '../firebase';
import { PlanningFile, type PlanningFileCategory } from '../types';
import { ref as storageRef, getDownloadURL, uploadBytesResumable, deleteObject, getStorage } from 'firebase/storage';
import { firebaseLogger } from '../services/FirebaseLogger';
import { BREAKPOINTS } from '../config/responsive';
import logger from '../services/Logger';
import {
  matchesHotelBroad,
  matchesHotelSpecific,
  matchesPartyBroad,
  matchesPartySpecific,
  matchesRestaurantBroad,
  matchesRestaurantSpecific,
  passesCategoryGate,
} from '../services/planningFileFilters';
import {
  LEGACY_PARC_EXPO_HALL_RESTAURANT_SLUG,
  normalizeFilterToPartySlug,
  normalizeFilterToRestaurantSlug,
} from '../config/planningVenueSlugs';
import './PlanningFiles.css';

const PLANNING_SPORTS_EVENT_TYPES: readonly string[] = [
  'Football', 'Basketball', 'Handball', 'Rugby', 'Ultimate', 'Natation',
  'Badminton', 'Tennis', 'Cross', 'Volleyball', 'Ping-pong', 'Echecs',
  'Athlétisme', 'Spikeball', 'Pétanque', 'Escalade'
];

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
      logger.warn('⚠️ Limite de transfert quotidien atteinte à 80%');
    }
  }

  trackStorage(bytes: number) {
    this.dailyStorage += bytes;
    if (this.dailyStorage > this.MAX_DAILY_STORAGE * 0.8) {
      logger.warn('⚠️ Limite de stockage quotidien atteinte à 80%');
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
      const maxWidth = BREAKPOINTS.large;
      const maxHeight = BREAKPOINTS.large;
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

interface Hotel {
  id: string;
  name: string;
}

interface Restaurant {
  id: string;
  name: string;
}

interface Party {
  id: string;
  name: string;
  sport?: string;
  description?: string;
}

interface PlanningFilesProps {
  isAdmin?: boolean;
  filter?: string;
  showFilterSelector?: boolean;
  uploading?: boolean;
  setUploading?: (uploading: boolean) => void;
  uploadProgress?: number;
  setUploadProgress?: (progress: number) => void;
  hotels?: Hotel[];
  restaurants?: Restaurant[];
  parties?: Party[];
  onLoadingChange?: (isLoading: boolean) => void;
}

// Tableaux vides stables pour éviter les re-renders infinis
const EMPTY_HOTELS: Hotel[] = [];
const EMPTY_RESTAURANTS: Restaurant[] = [];
const EMPTY_PARTIES: Party[] = [];

export default function PlanningFiles({ 
  isAdmin = false, 
  filter, 
  showFilterSelector = true,
  uploading: externalUploading,
  setUploading: externalSetUploading,
  setUploadProgress: externalSetUploadProgress,
  hotels = EMPTY_HOTELS,
  restaurants = EMPTY_RESTAURANTS,
  parties = EMPTY_PARTIES,
  onLoadingChange
}: PlanningFilesProps) {
  const [files, setFiles] = useState<PlanningFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<PlanningFile[]>([]);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [fileCategory, setFileCategory] = useState<string>(''); // sports, hotel, restaurant, party, hse
  const [specificItem, setSpecificItem] = useState<string>(''); // ID ou nom de l'élément spécifique
  const [newFile, setNewFile] = useState({
    name: '',
    type: 'image' as const,
    url: '',
    eventType: ''
  });
  const [internalUploading, setInternalUploading] = useState(false);
  const [_, setInternalUploadProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Utiliser les props externes si fournies, sinon les états internes
  const uploading = externalUploading !== undefined ? externalUploading : internalUploading;
  const setUploading = externalSetUploading || setInternalUploading;
  const setUploadProgress = externalSetUploadProgress || setInternalUploadProgress;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Obtenir l'instance réelle de storage (le Proxy ne fonctionne pas avec storageRef)
  const storageInstance = getStorage(app);


  // Liste des types d'événements disponibles
  const eventTypes = [
    { value: 'all', label: 'Tous les fichiers' },
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
    { value: 'Echecs', label: 'Echecs ♟️' },
    { value: 'Athlétisme', label: 'Athlétisme 🏃‍♂️' },
    { value: 'Spikeball', label: 'Spikeball ⚡️' },
    { value: 'Pétanque', label: 'Pétanque 🍹' },
    { value: 'Escalade', label: 'Escalade 🧗‍♂️' },
    { value: 'Hotel', label: 'Hôtel' },
    { value: 'Restaurant', label: 'Restaurant' },
    { value: 'HSE', label: 'HSE' }
  ];

  // Initialiser le filtre basé sur la prop
  useEffect(() => {
    if (filter) {
      if (filter === 'sports') {
        // Afficher tous les sports (exclure restaurants, hôtels, soirées)
        setEventTypeFilter('sports');
      } else if (filter === 'restaurants') {
        setEventTypeFilter('Restaurant');
      } else if (filter === 'hotel') {
        setEventTypeFilter('Hotel');
      } else if (filter === 'party') {
        setEventTypeFilter('party');
      } else if (filter === 'hse') {
        setEventTypeFilter('HSE');
      } else if (filter === 'all') {
        setEventTypeFilter('all');
      } else {
        // Hotels use numeric ids ('1'–'17') that collide with legacy party/restaurant slugs.
        // Check hotels FIRST to avoid mis-routing (e.g. hotel '4' → party 'zenith').
        const hotelHit = hotels.find((h) => h.id === filter);
        if (hotelHit) {
          setEventTypeFilter(hotelHit.id);
        } else {
          const asParty = normalizeFilterToPartySlug(filter);
          const asRest = normalizeFilterToRestaurantSlug(filter);
          const partyHit = parties.find((p) => p.id === asParty);
          const restHit = restaurants.find((r) => r.id === asRest);
          if (partyHit) setEventTypeFilter(partyHit.id);
          else if (restHit) setEventTypeFilter(restHit.id);
          else if (asRest === LEGACY_PARC_EXPO_HALL_RESTAURANT_SLUG) setEventTypeFilter('Restaurant');
          else setEventTypeFilter(filter);
        }
      }
    }
  }, [filter, parties, restaurants, hotels]);

  useEffect(() => {
    if (!isVisible) return;

    const optimizer = FirebaseOptimizer.getInstance();
    
    if (!optimizer.canCreateConnection()) {
      logger.warn('Limite de connexions Firebase atteinte pour les fichiers');
      setIsLoading(false);
      onLoadingChange?.(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    onLoadingChange?.(true);

    const loadFiles = async () => {
      try {
        const filesRef = ref(database, 'planningFiles');
        const snapshot = await get(filesRef);
        if (cancelled) return;

        const data = snapshot.val();
        if (data) {
          optimizer.trackTransfer(JSON.stringify(data).length);
          const filesArray = Object.entries(data).map(([id, value]) => ({
            id,
            ...(value as Omit<PlanningFile, 'id'>)
          }));
          setFiles(filesArray);
        } else {
          setFiles([]);
        }
      } catch (error) {
        if (!cancelled) {
          firebaseLogger.logError('read:planningFiles', 'planningFiles', error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          onLoadingChange?.(false);
        }
      }
    };

    loadFiles();

    return () => { cancelled = true; };
  }, [isVisible, onLoadingChange]);

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

    const partyIds = parties.map((p) => p.id);
    const restaurantIds = restaurants.map((r) => r.id);
    const hotelIds = hotels.map((h) => h.id);

    if (eventTypeFilter === 'sports') {
      filtered = filtered.filter(
        (file) =>
          passesCategoryGate(file, 'sports') && PLANNING_SPORTS_EVENT_TYPES.includes(file.eventType)
      );
    } else if (eventTypeFilter === 'party') {
      filtered = filtered.filter((file) => matchesPartyBroad(file, partyIds));
    } else if (eventTypeFilter === 'Restaurant' || eventTypeFilter === 'restaurants') {
      filtered = filtered.filter((file) => matchesRestaurantBroad(file, restaurantIds));
    } else if (eventTypeFilter === 'hotel' || eventTypeFilter === 'Hotel') {
      filtered = filtered.filter((file) => matchesHotelBroad(file, hotelIds));
    } else if (eventTypeFilter === 'hse' || eventTypeFilter === 'HSE') {
      filtered = filtered.filter(
        (file) =>
          passesCategoryGate(file, 'hse') &&
          (file.eventType === 'HSE' || (file.eventType?.toLowerCase().includes('hse') ?? false))
      );
    } else if (eventTypeFilter !== 'all') {
      const hotel = hotels.find((h) => h.id === eventTypeFilter);
      const restaurant = restaurants.find((r) => r.id === eventTypeFilter);
      const party = parties.find((p) => p.id === eventTypeFilter);

      if (hotel) {
        filtered = filtered.filter((file) => matchesHotelSpecific(file, hotel));
      } else if (restaurant) {
        filtered = filtered.filter((file) => matchesRestaurantSpecific(file, restaurant));
      } else if (party) {
        filtered = filtered.filter((file) => matchesPartySpecific(file, party.id, parties));
      } else {
        filtered = filtered.filter((file) => {
          if (file.eventType !== eventTypeFilter) return false;
          if (PLANNING_SPORTS_EVENT_TYPES.includes(eventTypeFilter)) {
            return passesCategoryGate(file, 'sports');
          }
          return true;
        });
      }
    }

    setFilteredFiles(filtered);
  }, [eventTypeFilter, files, hotels, restaurants, parties]);

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
            await firebaseLogger.wrapOperation(
              () => deleteObject(storageRef(storageInstance, storagePath)),
              'delete:storageFile',
              `planningFiles/${storagePath}`
            );
          } catch (error: any) {
            // Les erreurs sont déjà loggées par wrapOperation
            if (error.code === 'storage/object-not-found') {
              // Fichier déjà supprimé, ce n'est pas grave
            } else if (error.code === 'storage/unauthorized' || error.code === 'storage/forbidden') {
              // Permissions insuffisantes, on continue quand même avec la suppression de la DB
            }
          }
        }
        // Supprimer de la base (toujours)
        await firebaseLogger.wrapOperation(
          () => remove(ref(database, `planningFiles/${fileId}`)),
          'delete:planningFile',
          `planningFiles/${fileId}`
        );
      } catch (error) {
        // L'erreur est déjà loggée par wrapOperation
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

    const capturedNewFile = { ...newFile };
    const capturedFileCategory = fileCategory;

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
          logger.log(`Image compressée: ${file.size} bytes → ${fileToUpload.size} bytes (${Math.round((1 - fileToUpload.size / file.size) * 100)}% de réduction)`);
        } catch (compressionError) {
          logger.warn('Erreur de compression, utilisation du fichier original:', compressionError);
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
      const storageReference = storageRef(storageInstance, storagePath);
      const uploadTask = uploadBytesResumable(storageReference, fileToUpload);

      // Gérer le suivi de la progression
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          firebaseLogger.logError('upload:planningFile', `planningFiles/${storagePath}`, error, { 
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          });
          if (error.code === 'storage/unauthorized' || error.code === 'storage/forbidden') {
            logger.warn('Permissions insuffisantes pour l\'upload. Vérifiez les règles de sécurité Firebase Storage.');
          }
          setUploading(false);
          setUploadProgress(0);
          throw error;
        },
        async () => {
          let fileData:
            | (Omit<PlanningFile, 'id'> & {
                originalSize: number;
                compressedSize: number;
                compressionRatio: number;
                fileCategory?: PlanningFileCategory;
              })
            | undefined;
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            const category: PlanningFileCategory | undefined =
              capturedFileCategory === 'sports' ||
              capturedFileCategory === 'party' ||
              capturedFileCategory === 'restaurant' ||
              capturedFileCategory === 'restaurants' ||
              capturedFileCategory === 'hotel' ||
              capturedFileCategory === 'hse'
                ? (capturedFileCategory === 'restaurant' ? 'restaurants' : capturedFileCategory as PlanningFileCategory)
                : undefined;

            fileData = {
              ...capturedNewFile,
              url: downloadURL,
              uploadDate: Date.now(),
              uploadedBy: 'admin',
              originalSize: file.size,
              compressedSize: fileToUpload.size,
              compressionRatio: file.type.startsWith('image/') ? Math.round((1 - fileToUpload.size / file.size) * 100) : 0,
              ...(category ? { fileCategory: category } : {})
            };
            
            const dataSize = JSON.stringify(fileData).length;
            optimizer.trackTransfer(dataSize);

            // Save file info to database
            const newFileRef = push(ref(database, 'planningFiles'));
            await firebaseLogger.wrapOperation(
              () => set(newFileRef, fileData),
              'write:planningFile',
              'planningFiles'
            );

      setNewFile({
        name: '',
        type: 'image',
        url: '',
        eventType: ''
      });
      setFileCategory('');
      setSpecificItem('');
      setShowAddForm(false);

            // Reset file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            
            // Upload terminé avec succès
            setUploading(false);
            setUploadProgress(0);
          } catch (error) {
            firebaseLogger.logError('write:planningFile', 'planningFiles', error, { fileData });
            setUploading(false);
            setUploadProgress(0);
            throw error;
          }
        }
      );
    } catch (error) {
      logger.error('Erreur lors de l\'ajout du fichier:', error);
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
            onClick={() => {
              setShowAddForm(!showAddForm);
              if (showAddForm) {
                // Réinitialiser les états si on ferme le formulaire
                setFileCategory('');
                setSpecificItem('');
                setNewFile({ name: '', type: 'image', url: '', eventType: '' });
              }
            }}
          >
              {showAddForm ? 'Annuler' : 'Ajouter un fichier'}
          </button>
        </div>
      )}

      {showAddForm && isAdmin && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">
                  Ajouter un fichier
                </h3>
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setFileCategory('');
                  setSpecificItem('');
                  setNewFile({ name: '', type: 'image', url: '', eventType: '' });
                }}
                className="modal-close-button"
              >
                ×
              </button>
              </div>

              <div className="modal-scrollable">

              <form onSubmit={handleAddFile} className="modal-form">
          <div className="form-group">
                  <label htmlFor="fileName">Nom du fichier</label>
            <input
              type="text"
              id="fileName"
              value={newFile.name}
              onChange={(e) => setNewFile({ ...newFile, name: e.target.value })}
              required
              placeholder="Ex: Fichier Basketball M"
                    className="modal-input"
            />
          </div>

          <div className="form-group">
                  <label htmlFor="fileCategory">Catégorie de fichier</label>
                  <select
                    id="fileCategory"
                    value={fileCategory}
                    onChange={(e) => {
                      const nextCategory = e.target.value;
                      setFileCategory(nextCategory);
                      setSpecificItem(''); // Réinitialiser l'élément spécifique quand la catégorie change
                      setNewFile((prev) => ({
                        ...prev,
                        // HSE n'a pas de sous-catégorie : l'eventType suffit.
                        eventType: nextCategory === 'hse' ? 'HSE' : ''
                      }));
                    }}
                    required
                    className="modal-select"
                  >
                    <option value="">Sélectionnez une catégorie</option>
                    <option value="sports">Sports</option>
                    <option value="hotel">Hôtels</option>
                    <option value="restaurant">Restaurants</option>
                    <option value="party">Soirées/Défilé</option>
                    <option value="hse">HSE</option>
                  </select>
                </div>

                {fileCategory && fileCategory !== 'hse' && (
                  <div className="form-group">
                    <label htmlFor="specificItem">
                      {fileCategory === 'sports' ? 'Sport :' :
                       fileCategory === 'hotel' ? 'Hôtel :' :
                       fileCategory === 'restaurant' ? 'Restaurant :' :
                       fileCategory === 'party' ? 'Soirée/Défilé :' : 'Élément :'}
                    </label>
                    <select
                      id="specificItem"
                      value={specificItem}
                      onChange={(e) => {
                        setSpecificItem(e.target.value);
                        setNewFile((prev) => ({ ...prev, eventType: e.target.value }));
                      }}
                      required
                      className="modal-select"
                    >
                      <option value="">Sélectionnez un élément</option>
                      {fileCategory === 'sports' && eventTypes
                        .filter((type) => PLANNING_SPORTS_EVENT_TYPES.includes(type.value))
                        .map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      {fileCategory === 'hotel' && hotels.map(hotel => (
                        <option key={hotel.id} value={hotel.id}>
                          {hotel.name}
                        </option>
                      ))}
                      {fileCategory === 'restaurant' && restaurants.map(restaurant => (
                        <option key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </option>
                      ))}
                      {fileCategory === 'party' && parties.map(party => (
                        <option key={party.id} value={party.id}>
                          {party.name} {party.sport === 'Defile' ? '🎺' : party.sport === 'Pompom' ? '🎀' : party.sport === 'Party' && party.description?.includes('DJ Contest') ? '🎧' : party.sport === 'Party' && party.description?.includes('Showcase') ? '🎤' : '🎉'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="fileInput">Fichier</label>
            <input
                    type="file"
                    id="fileInput"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
              required
                    className="file-input modal-input"
            />
          </div>

          <div className="modal-buttons">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setFileCategory('');
                      setSpecificItem('');
                      setNewFile({ name: '', type: 'image', url: '', eventType: '' });
                    }}
                    className="modal-cancel-button"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    disabled={uploading}
                    className="modal-submit-button"
                  >
                    {uploading ? 'Upload en cours...' : 'Ajouter le fichier'}
          </button>
                </div>
        </form>
              </div>
            </div>
          </div>
      )}

      {filteredFiles.length === 0 && !isLoading ? (
          <p className="no-files">Aucun fichier disponible</p>
      ) : filteredFiles.length > 0 ? (
          <div className="files-list">
          {filteredFiles.map((file) => {
            return (
              <div key={file.id} className="file-item">
                <div className="file-name">{file.name}</div>
                <div className="file-actions-container">
                  <button
                    onClick={() => window.open(file.url, '_blank')}
                    className="file-view-button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    Voir
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="delete-button"
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
      ) : null}
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