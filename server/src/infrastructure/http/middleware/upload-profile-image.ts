import multer from 'multer';
import { UnSupportedImageTypeError } from '../../../app/error/unsupported-image-type-error.js';

const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

export const uploadProfileImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new UnSupportedImageTypeError('Only PNG, JPEG, and WebP images are allowed.'));
      return;
    }

    callback(null, true);
  },
});
