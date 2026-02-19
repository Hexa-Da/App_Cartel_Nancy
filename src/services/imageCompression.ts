/**
 * @fileoverview Compression d'images pour l'upload
 */

import { BREAKPOINTS } from '../config/responsive';

export const compressImage = (
  file: File,
  maxSizeKB = 500,
  quality = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image loading failed'));
    };
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
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

      const tryBlob = (q: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed'));
              return;
            }
            if (blob.size > maxSizeKB * 1024 && q > 0.3) {
              tryBlob(Math.max(0.3, q - 0.1));
            } else {
              const baseName = file.name.replace(/\.[^.]+$/, '');
              const compressedFile = new File([blob], `${baseName}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            }
          },
          'image/jpeg',
          q
        );
      };

      tryBlob(quality);
    };

    img.src = objectUrl;
  });
};
