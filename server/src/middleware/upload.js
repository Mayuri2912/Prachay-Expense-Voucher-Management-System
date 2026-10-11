// Multer configuration for signature images (multipart/form-data).
//
// The file is kept in memory first (it is at most a couple of MB). The
// signature service then checks that it really is an image before anything
// is written to disk, so a bad upload never touches the uploads folder.

import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { ALLOWED_IMAGE_MIME_TYPES } from '../utils/constants.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxSignatureSizeMb * 1024 * 1024,
    files: 1,
    fields: 20,
  },
  fileFilter(req, file, callback) {
    if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new AppError(400, 'Validation failed', {
          signature: 'The signature must be a JPEG, PNG or WebP image.',
        })
      );
    }
  },
});

// Accepts one optional file in the form field named "signature".
// After this middleware: req.file is the image (or undefined) and req.body holds the text fields.
export const uploadSignature = upload.single('signature');
