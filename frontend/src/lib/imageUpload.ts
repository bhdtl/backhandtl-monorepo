import { supabase } from './supabase';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // Upgrade auf 10MB für Handy-Fotos
const TARGET_SIZE = 600; // Etwas größer für bessere Qualität auf Retina-Displays

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// FIX: Diese Funktion war zu streng. Jetzt ist sie "smart".
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // 1. Check: Ist es überhaupt ein Bild?
  // Wir prüfen, ob der Typ mit "image/" beginnt (das fängt jpg, png, webp, heic etc. ab)
  const isImageType = file.type.startsWith('image/');
  
  // Fallback: Manchmal fehlt der MIME-Type, dann prüfen wir die Endung
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif'];
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const isValidExt = fileExt && validExtensions.includes(fileExt);

  if (!isImageType && !isValidExt) {
    return {
      valid: false,
      error: `Invalid file type (${file.type || 'unknown'}). Please upload an image.`
    };
  }

  // 2. Check: Größe
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.'
    };
  }

  return { valid: true };
};

// Diese Funktion behalten wir bei, sie ist gut für die Performance!
export const resizeImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // Wenn es kein Standard-Bild ist (z.B. HEIC), überspringen wir Resize
    // damit es nicht abstürzt, und laden das Original hoch.
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
       resolve(file); 
       return;
    }

    const img = new Image();
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Berechne neue Dimensionen (Seitenverhältnis beibehalten)
      if (width > height) {
        if (width > TARGET_SIZE) {
          height = (height * TARGET_SIZE) / width;
          width = TARGET_SIZE;
        }
      } else {
        if (height > TARGET_SIZE) {
          width = (width * TARGET_SIZE) / height;
          height = TARGET_SIZE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      // Konvertiere zu modernem JPEG
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback: Originaldatei nutzen, falls Blob fehlschlägt
            resolve(file);
          }
        },
        'image/jpeg',
        0.85 // Gute Qualität, kleine Größe
      );
    };

    img.onerror = () => {
      // Bei Fehler (z.B. korruptes Bild) nicht abstürzen, sondern Original nehmen
      console.warn('Resize failed, using original file');
      resolve(file);
    };

    try {
        img.src = URL.createObjectURL(file);
    } catch (e) {
        resolve(file);
    }
  });
};

export const uploadPlayerImage = async (
  file: File,
  playerId: string
): Promise<UploadResult> => {
  try {
    // 1. Validierung (Jetzt mobilfreundlich)
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 2. Versuch zu verkleinern (mit Fallback auf Original)
    let fileToUpload: Blob = file;
    try {
        fileToUpload = await resizeImage(file);
    } catch (e) {
        console.warn("Skipping resize due to error, uploading original");
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    // Timestamp verhindert Caching-Probleme im Browser
    const fileName = `${playerId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // WICHTIG: Bucket Name angepasst auf 'player-images' (passend zum SQL Code)
    const BUCKET_NAME = 'player-images'; 

    // 3. Alte Bilder aufräumen (Clean Code)
    const { data: existingFiles } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { search: playerId });

    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles.map(x => x.name);
      await supabase.storage.from(BUCKET_NAME).remove(filesToRemove);
    }

    // 4. Upload
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileToUpload, {
        contentType: file.type || 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase Upload Error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // 5. URL holen
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl
    };

  } catch (error) {
    console.error('Upload Process Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
};

export const deletePlayerImage = async (imageUrl: string): Promise<boolean> => {
  try {
    const fileName = imageUrl.split('/').pop();
    if (!fileName) return false;

    // WICHTIG: Auch hier Bucket Name angepasst
    const { error } = await supabase.storage
      .from('player-images')
      .remove([fileName]);

    return !error;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};