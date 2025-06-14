import { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, remove, set } from 'firebase/database';
import { database, storage } from '../firebase';
import { PlanningFile } from '../types';
import { auth } from '../firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, uploadBytesResumable, deleteObject } from 'firebase/storage';

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
  const imageModalRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 });

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

  // Helper pour détecter mobile
  const isMobile = window.innerWidth < 600;

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
          // Supprimer du storage
          await deleteObject(storageRef(storage, storagePath));
        }
        // Supprimer de la base
        await remove(ref(database, `planningFiles/${fileId}`));
      } catch (error) {
        console.error('Erreur lors de la suppression du fichier:', error);
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

    try {
      setUploading(true);
      setUploadProgress(0);

      // Vérifier la taille du fichier (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        throw new Error('Le fichier est trop volumineux. Taille maximum : 100MB');
      }

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `planningFiles/${timestamp}_${sanitizedFileName}`;

      // Upload file to Firebase Storage with progress tracking
      const storageReference = storageRef(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageReference, file);

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
              type: 'file',
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

  // Nouvelle barre de chargement globale
  const uploadBar = uploading ? (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      zIndex: 3000,
      background: 'rgba(20,20,20,0.98)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      padding: '0.5rem 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      transition: 'all 0.2s',
      maxWidth: '100vw',
    }}>
      <div style={{
        width: '92vw',
        maxWidth: 500,
        height: '12px',
        background: '#333',
        borderRadius: '6px',
        overflow: 'hidden',
        marginBottom: '0.3rem',
        maxWidth: '100%',
      }}>
        <div style={{
          width: `${uploadProgress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, var(--accent-color), #4CAF50)',
          transition: 'width 0.3s',
          borderRadius: '6px',
        }}></div>
      </div>
      <div style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '1.1rem', wordBreak: 'break-word' }}>{Math.round(uploadProgress)}%</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: 2, wordBreak: 'break-word' }}>{uploadProgress < 100 ? 'Upload en cours...' : 'Finalisation...'}</div>
    </div>
  ) : null;

  // Gérer le mode plein écran natif pour l'image
  useEffect(() => {
    if (selectedImage && imageModalRef.current) {
      const el = imageModalRef.current;
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      } else if ((el as any).msRequestFullscreen) {
        (el as any).msRequestFullscreen();
      }
    } else if (!selectedImage && document.fullscreenElement) {
      document.exitFullscreen?.();
    }
    // Sortir du fullscreen si on ferme la modale
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    };
  }, [selectedImage]);

  // Reset zoom à chaque nouvelle image
  useEffect(() => {
    setZoom(1);
    setImgOffset({ x: 0, y: 0 });
  }, [selectedImage]);

  // Gestion du zoom/pan façon Leaflet (mobile & desktop)
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    // On ne gère plus le tactile ici
    // On garde seulement la gestion souris et molette
    function onMouseDown(e: MouseEvent) {
      if (zoom === 1) return;
      let mode: 'none' | 'pan' = 'pan';
      let start = { x: e.clientX, y: e.clientY };
      let panInitial = { ...imgOffset };
      function onMouseMove(ev: MouseEvent) {
        if (mode !== 'pan') return;
        const dx = ev.clientX - start.x;
        const dy = ev.clientY - start.y;
        setImgOffset(clampPan(panInitial.x + dx, panInitial.y + dy, zoom));
      }
      function onMouseUp() {
        mode = 'none';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      let newZoom = zoom - e.deltaY * 0.1;
      newZoom = Math.max(1, Math.min(5, newZoom));
      setZoom(newZoom);
    }
    function clampPan(x: number, y: number, zoom: number) {
      if (!img) return { x, y };
      const rect = img.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const imgW = rect.width * zoom;
      const imgH = rect.height * zoom;
      const maxX = Math.max(0, (imgW - vw) / 2);
      const maxY = Math.max(0, (imgH - vh) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y))
      };
    }
    if (selectedImage) {
      img.addEventListener('mousedown', onMouseDown);
      img.addEventListener('wheel', onWheel, { passive: false });
    }
    return () => {
      img.removeEventListener('mousedown', onMouseDown);
      img.removeEventListener('wheel', onWheel);
      window.removeEventListener('mousemove', () => {});
      window.removeEventListener('mouseup', () => {});
    };
    // eslint-disable-next-line
  }, [selectedImage, zoom, imgOffset]);

  // Ajoute la navigation par flèches
  const handleArrowPan = (dx: number, dy: number) => {
    setImgOffset(prev => {
      const clamp = (x: number, y: number) => {
        const img = imgRef.current;
        if (!img) return { x, y };
        const rect = img.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const imgW = rect.width * zoom;
        const imgH = rect.height * zoom;
        const maxX = Math.max(0, (imgW - vw) / 2);
        const maxY = Math.max(0, (imgH - vh) / 2);
        return {
          x: Math.max(-maxX, Math.min(maxX, x)),
          y: Math.max(-maxY, Math.min(maxY, y))
        };
      };
      // Inversion du déplacement : ← = +x, → = -x, ↑ = +y, ↓ = -y
      return clamp(prev.x - dx, prev.y - dy);
    });
  };

  if (uploading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(10,10,10,0.92)',
        zIndex: 5000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(30,30,30,0.98)',
          borderRadius: '16px',
          padding: '2.5rem 2rem',
          minWidth: 220,
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          border: '2px solid var(--accent-color)'
        }}>
          {/* Spinner animé */}
          <div style={{ marginBottom: '1.2rem' }}>
            <span style={{
              display: 'inline-block',
              width: 48,
              height: 48,
              border: '6px solid #fff',
              borderTop: '6px solid var(--accent-color)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
          <div style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.7rem' }}>
            Upload en cours...
          </div>
          <div style={{ width: 180, height: 12, background: '#333', borderRadius: 6, overflow: 'hidden', marginBottom: '0.7rem' }}>
            <div style={{
              width: `${uploadProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent-color), #4CAF50)',
              transition: 'width 0.3s',
              borderRadius: 6,
            }}></div>
          </div>
          <div style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem' }}>{Math.round(uploadProgress)}%</div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

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
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div className="modal-content" style={{
              padding: isMobile ? '1rem 0.5rem' : '2rem 1rem',
              borderRadius: '12px',
              width: '100%',
              maxWidth: isMobile ? '95vw' : '500px',
              minWidth: 0,
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
              border: '2px solid var(--accent-color)',
              background: 'rgba(10, 10, 10, 0.98)',
              color: 'var(--text-primary)',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              boxSizing: 'border-box',
            }}>
              <button 
                onClick={() => setShowAddForm(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ×
              </button>

              <h2 style={{ marginTop: 0, marginBottom: '1.5rem', textAlign: 'center' }}>Ajouter un planning</h2>

              {uploadBar}

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

          <div className="form-group">
            <label htmlFor="fileDescription">Description (optionnelle)</label>
            <textarea
              id="fileDescription"
              value={newFile.description}
              onChange={(e) => setNewFile({ ...newFile, description: e.target.value })}
                    placeholder="Description du planning..."
                    style={{
                      width: '100%',
                      padding: isMobile ? '0.4rem' : '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      minHeight: isMobile ? '60px' : '100px',
                      resize: 'vertical',
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
                      onClick={() => setSelectedImage(file.url)}
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
                    <a 
                      href={file.url} 
                      download 
                      className="download-button"
                      style={{
                        padding: isMobile ? '0.35rem 0.7rem' : '0.4rem 0.9rem',
                        borderRadius: '4px',
                        background: 'var(--accent-color)',
                        color: 'white',
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
                      }}
                >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                      Télécharger
                    </a>
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

      {selectedImage && (
        <div ref={imageModalRef} className="image-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 4000,
          background: 'rgba(10,10,10,0.98)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Bouton fermer en haut à droite de la page */}
          <button className="close-button" onClick={closeImageModal} style={{
            background: 'rgba(0, 0, 0, 0.5)',
            border: 'none',
            fontSize: '2.2rem',
            cursor: 'pointer',
            position: 'fixed',
            right: '2vw',
            top: '3vh',
            color: 'white',
            zIndex: 4100,
            padding: 0,
            lineHeight: 1,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}>×</button>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            borderRadius: '12px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            boxShadow: 'none',
            position: 'relative',
          }}>
            <img
              ref={imgRef}
              src={selectedImage}
              alt="Planning en plein écran"
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                display: 'block',
                margin: '0 auto',
                cursor: zoom > 1 ? 'grab' : 'zoom-in',
                transform: `scale(${zoom}) translate(${imgOffset.x / zoom}px, ${imgOffset.y / zoom}px)`,
                transition: 'transform 0.2s',
                touchAction: 'none',
              }}
              onDoubleClick={() => setZoom(z => (z === 1 ? 2 : 1))}
            />
            {/* Barre de navigation minimaliste en bas */}
            <div style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              zIndex: 4200,
              background: 'transparent',
              borderRadius: 0,
              boxShadow: 'none',
              padding: 0,
              minWidth: 0,
              maxWidth: '100vw',
              border: 'none',
              backdropFilter: 'none',
            }}>
              <button aria-label="Gauche" style={{...arrowBtnMinimal}} onClick={() => handleArrowPan(-40, 0)}>&larr;</button>
              <button aria-label="Haut" style={{...arrowBtnMinimal}} onClick={() => handleArrowPan(0, -40)}>&uarr;</button>
              <button aria-label="Zoom out" style={{...arrowBtnMinimal}} onClick={() => {
                setZoom(z => {
                  const newZoom = Math.max(1, z - 0.5);
                  if (newZoom === 1) setImgOffset({ x: 0, y: 0 });
                  return newZoom;
                });
              }}>−</button>
              <button aria-label="Zoom in" style={{...arrowBtnMinimal}} onClick={() => setZoom(z => Math.min(5, z + 0.5))}>+</button>
              <button aria-label="Bas" style={{...arrowBtnMinimal}} onClick={() => handleArrowPan(0, 40)}>&darr;</button>
              <button aria-label="Droite" style={{...arrowBtnMinimal}} onClick={() => handleArrowPan(40, 0)}>&rarr;</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Ajoute ce style en haut du composant
const arrowBtnMinimal = {
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: '50%',
  width: 32,
  height: 32,
  color: '#111',
  fontSize: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: 'none',
  transition: 'background 0.18s',
  outline: 'none',
  padding: 0,
}; 