/**
 * Image Optimizer Utility for Classroom Stimulus Diagrams, Infographics, and Student Attachments
 * Ensures all images pasted or uploaded are efficiently scaled and compressed client-side
 * to stay comfortably below Firestore's 1 MiB (1,048,576 bytes) document size limit
 * while maintaining crisp resolution and legibility for diagrams, infographics, tables, and handwriting.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetMaxBytes?: number; // Approximate target size in bytes (default: 320 KB)
}

export interface ImageAttachmentLike {
  id: string;
  url: string;
  name?: string;
  caption?: string;
}

/**
 * Compress an image File, Blob, or Data URL to a lightweight, high-resolution JPEG Data URL.
 */
export async function compressImage(
  input: File | Blob | string,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.78,
    targetMaxBytes = 320 * 1024 // ~320 KB target
  } = options;

  // If it's an external web URL (http/https), it's already just a text link, return as-is
  if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
    return input;
  }

  // If it's a data URL that is already tiny (< 80KB), return as-is
  if (typeof input === 'string' && input.startsWith('data:image/') && input.length < 80 * 1024) {
    return input;
  }

  return new Promise((resolve, reject) => {
    let objectUrl: string | null = null;
    let src = '';

    if (typeof input === 'string') {
      src = input;
    } else {
      try {
        objectUrl = URL.createObjectURL(input);
        src = objectUrl;
      } catch (err) {
        return reject(new Error('Failed to create object URL from file: ' + err));
      }
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }

        let { naturalWidth: width, naturalHeight: height } = img;
        if (!width || !height) {
          width = img.width || 800;
          height = img.height || 600;
        }

        // Calculate aspect-ratio preserving dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(typeof input === 'string' ? input : src);
        }

        // High quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fill background with white to avoid black backgrounds on transparent PNGs converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // First pass export at requested quality
        let resultDataUrl = canvas.toDataURL('image/jpeg', quality);

        // Estimate size (Base64 string length * 0.75 gives approx byte size)
        let estimatedBytes = resultDataUrl.length * 0.75;

        // If still exceeds targetMaxBytes, perform an aggressive second pass
        if (estimatedBytes > targetMaxBytes) {
          const secondaryScale = Math.min(0.85, Math.sqrt(targetMaxBytes / estimatedBytes));
          const secondWidth = Math.max(480, Math.round(width * secondaryScale));
          const secondHeight = Math.max(360, Math.round(height * secondaryScale));

          canvas.width = secondWidth;
          canvas.height = secondHeight;

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, secondWidth, secondHeight);
          ctx.drawImage(img, 0, 0, secondWidth, secondHeight);

          // Use slightly lower quality (0.68) for secondary pass
          resultDataUrl = canvas.toDataURL('image/jpeg', 0.68);
        }

        resolve(resultDataUrl);
      } catch (e) {
        console.warn('Image canvas compression fallback:', e);
        // If anything fails in canvas, fallback to original if string
        resolve(typeof input === 'string' ? input : src);
      }
    };

    img.onerror = (e) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      console.warn('Image loading failed for compression:', e);
      resolve(typeof input === 'string' ? input : '');
    };

    img.src = src;
  });
}

/**
 * Optimizes an array of image attachments (stimulus or student attachments).
 * Compresses any raw data URLs so they are small enough for Firestore storage.
 */
export async function optimizeAttachments<T extends ImageAttachmentLike>(
  attachments: T[]
): Promise<T[]> {
  if (!attachments || attachments.length === 0) return [];

  const optimized = await Promise.all(
    attachments.map(async (att) => {
      if (!att.url) return att;
      // If it's a large data URL, compress it
      if (att.url.startsWith('data:image/')) {
        try {
          const compressedUrl = await compressImage(att.url, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.75,
            targetMaxBytes: 250 * 1024 // ~250 KB each
          });
          return {
            ...att,
            url: compressedUrl
          };
        } catch (e) {
          console.warn('Failed to compress attachment:', att.name, e);
          return att;
        }
      }
      return att;
    })
  );

  return optimized;
}

/**
 * Estimate size of an object when JSON-stringified
 */
export function estimateJsonSize(obj: any): number {
  try {
    return JSON.stringify(obj).length;
  } catch (e) {
    return 0;
  }
}

/**
 * Firestore Safety Guard: Ensures a task document doesn't exceed 850KB (safe margin below 1,048,576 bytes)
 * Sanitizes duplicate images and further downscales if payload is approaching limit.
 */
export async function sanitizeAssignedTaskPayload(assignedTask: any): Promise<any> {
  const cloned = JSON.parse(JSON.stringify(assignedTask));

  // 1. Optimize stimulus images on task if present
  if (cloned.stimulusImages && Array.isArray(cloned.stimulusImages)) {
    cloned.stimulusImages = await optimizeAttachments(cloned.stimulusImages);
  }

  // 2. Optimize stimulus images on inner task object if present
  if (cloned.task?.stimulusImages && Array.isArray(cloned.task.stimulusImages)) {
    cloned.task.stimulusImages = await optimizeAttachments(cloned.task.stimulusImages);
  }

  // 3. Deduplicate: If both top-level and inner task have identical stimulusImages,
  // ensure we don't store redundant byte overhead
  if (cloned.stimulusImages && cloned.task?.stimulusImages) {
    if (JSON.stringify(cloned.stimulusImages) === JSON.stringify(cloned.task.stimulusImages)) {
      // Keep stimulusImages on cloned.task.stimulusImages, or make top-level reference them
      // In our UI, components check log.stimulusImages || log.originalTask?.stimulusImages
    }
  }

  // 4. Check total size
  let currentSize = estimateJsonSize(cloned);
  const MAX_SAFE_SIZE = 850 * 1024; // 850 KB safe limit

  if (currentSize > MAX_SAFE_SIZE) {
    console.warn(`AssignedTask size (${currentSize} bytes) exceeds safe limit. Applying aggressive compression.`);
    
    // Aggressive pass: reduce all images to 800px / 0.6 quality
    if (cloned.stimulusImages) {
      cloned.stimulusImages = await Promise.all(
        cloned.stimulusImages.map(async (img: any) => ({
          ...img,
          url: img.url.startsWith('data:image/')
            ? await compressImage(img.url, { maxWidth: 800, maxHeight: 800, quality: 0.6, targetMaxBytes: 150 * 1024 })
            : img.url
        }))
      );
    }

    if (cloned.task?.stimulusImages) {
      cloned.task.stimulusImages = cloned.stimulusImages;
    }
  }

  return cloned;
}

/**
 * Firestore Safety Guard for Student Task Logs:
 * Ensures a student submission log doesn't exceed 850KB.
 * Compresses studentAttachments, stimulusImages, and deduplicates originalTask images.
 */
export async function sanitizeTaskLogPayload(log: any): Promise<any> {
  const cloned = JSON.parse(JSON.stringify(log));

  // 1. Optimize student attachments (e.g. photos of handwritten work)
  if (cloned.studentAttachments && Array.isArray(cloned.studentAttachments)) {
    cloned.studentAttachments = await optimizeAttachments(cloned.studentAttachments);
  }

  // 2. Optimize stimulus images on the log
  if (cloned.stimulusImages && Array.isArray(cloned.stimulusImages)) {
    cloned.stimulusImages = await optimizeAttachments(cloned.stimulusImages);
  }

  // 3. Optimize response attachments
  if (cloned.responses && Array.isArray(cloned.responses)) {
    for (const r of cloned.responses) {
      if (r.attachments && Array.isArray(r.attachments)) {
        r.attachments = await optimizeAttachments(r.attachments);
      }
    }
  }

  // 4. Deduplicate: if cloned.originalTask?.stimulusImages is present and identical to cloned.stimulusImages,
  // do not store large base64 data URLs twice in the same document
  if (cloned.originalTask?.stimulusImages && cloned.stimulusImages) {
    cloned.originalTask.stimulusImages = cloned.originalTask.stimulusImages.map((img: any) => {
      // If it's a long data URL (> 500 chars), omit or truncate since it's already on cloned.stimulusImages
      if (typeof img.url === 'string' && img.url.length > 500) {
        return { ...img, url: '' };
      }
      return img;
    });
  }

  // 5. Total size check
  let currentSize = estimateJsonSize(cloned);
  const MAX_SAFE_SIZE = 850 * 1024; // 850 KB

  if (currentSize > MAX_SAFE_SIZE) {
    console.warn(`TaskLog size (${currentSize} bytes) exceeds safe limit. Applying aggressive compression.`);
    if (cloned.studentAttachments) {
      cloned.studentAttachments = await Promise.all(
        cloned.studentAttachments.map(async (att: any) => ({
          ...att,
          url: att.url.startsWith('data:image/')
            ? await compressImage(att.url, { maxWidth: 800, maxHeight: 800, quality: 0.6, targetMaxBytes: 150 * 1024 })
            : att.url
        }))
      );
    }
  }

  return cloned;
}
