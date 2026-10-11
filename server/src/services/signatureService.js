// Everything to do with signature image files on disk.
//
// Security notes:
//   * The file name is generated here. Nothing typed or uploaded by the user
//     ever becomes part of a path, so "../../" tricks are impossible.
//   * The file's first bytes are inspected, so renaming virus.exe to sign.png does not work.
//   * Files are NOT served as public static files. They can only be read through
//     GET /api/vouchers/:id/signatures/:type, which checks the user's permission first.

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const SIGNATURE_FOLDER = 'signatures'; // inside env.uploadDir

// Looks at the "magic bytes" every image file starts with.
// Returns the file extension to use, or null when the file is not an allowed image.
function detectImageExtension(buffer) {
  if (!buffer || buffer.length < 12) return null;

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (isJpeg) return 'jpg';

  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.subarray(0, 8).equals(pngHeader)) return 'png';

  const isWebp =
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (isWebp) return 'webp';

  return null;
}

// Saves an uploaded signature and returns the path to store in the database,
// for example "signatures/employee-1760000000000-9f2c4b1a7d3e5f60.png".
// `owner` is 'employee' or 'director' and is only used as a file name prefix.
export async function saveSignature(file, owner) {
  const extension = detectImageExtension(file.buffer);
  if (!extension) {
    throw new AppError(400, 'Validation failed', {
      signature: 'The uploaded file is not a valid JPEG, PNG or WebP image.',
    });
  }

  const fileName = `${owner}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
  const folder = path.join(env.uploadDir, SIGNATURE_FOLDER);

  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, fileName), file.buffer);

  return `${SIGNATURE_FOLDER}/${fileName}`;
}

// Turns a path stored in the database into a full disk path.
// Returns null if the result would be outside the uploads folder.
export function resolveSignaturePath(relativePath) {
  if (!relativePath) return null;

  const uploadRoot = path.resolve(env.uploadDir) + path.sep;
  const absolutePath = path.resolve(env.uploadDir, relativePath);

  return absolutePath.startsWith(uploadRoot) ? absolutePath : null;
}

// Removes a signature file that is no longer needed (replaced, or its draft was deleted).
// Only files inside the signatures folder are removed - the demo images in uploads/seed are shared.
export async function deleteSignature(relativePath) {
  if (!relativePath || !relativePath.startsWith(`${SIGNATURE_FOLDER}/`)) return;

  const absolutePath = resolveSignaturePath(relativePath);
  if (!absolutePath) return;

  try {
    await fs.rm(absolutePath, { force: true });
  } catch (error) {
    // A leftover file is harmless; do not fail the request because of it.
    console.warn(`[uploads] could not delete ${relativePath}: ${error.message}`);
  }
}
