import formidable, { File } from 'formidable';
import { NextApiRequest } from 'next';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from 'src/types';

// ----------------------------------------------------------------------

// Backend server URL for serving uploaded files
// Uses runtime PORT env var if available, falls back to default
const getBackendUrl = () => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) return process.env.NEXT_PUBLIC_BACKEND_URL;
  const port = process.env.PORT || '47847';
  return `http://localhost:${port}`;
};
const BACKEND_URL = getBackendUrl();

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp)$/i;

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Validate uploaded image file
 * @param file - Formidable file object
 * @returns Array of error messages (empty if valid)
 */
export const validateImage = (file: File): string[] => {
  const errors: string[] = [];

  // Check MIME type
  if (file.mimetype && !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    errors.push(
      `Invalid file type: ${file.mimetype}. Only JPEG, PNG, GIF, and WebP images are allowed.`
    );
  }

  // Check file extension
  if (file.originalFilename && !ALLOWED_EXTENSIONS.test(file.originalFilename)) {
    errors.push(
      `Invalid file extension. Only .jpg, .jpeg, .png, .gif, and .webp files are allowed.`
    );
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    errors.push(`File size (${sizeMB}MB) exceeds the 5MB limit.`);
  }

  return errors;
};

/**
 * Parse multipart form data with file uploads
 * @param req - Next.js API request
 * @param uploadDir - Directory to save uploaded files
 * @returns Parsed fields and files
 */
export const parseForm = async (
  req: NextApiRequest,
  uploadDir: string = 'public/uploads/recipes'
): Promise<{
  fields: formidable.Fields;
  files: formidable.Files;
}> => {
  // Ensure upload directory exists
  await ensureUploadDir(uploadDir);

  const form = formidable({
    uploadDir,
    keepExtensions: false,
    maxFileSize: MAX_FILE_SIZE,
    maxFiles: 10,
    filename: (name, ext, part) => {
      // Generate unique filename: uuid-timestamp.extension
      const extension = part.originalFilename
        ? path.extname(part.originalFilename)
        : '.jpg';
      return `${uuidv4()}-${Date.now()}${extension}`;
    },
    filter: (part) => {
      // Only accept image files
      return part.mimetype?.startsWith('image/') || false;
    },
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });
};

/**
 * Process uploaded files and validate them
 * @param files - Files from formidable
 * @param uploadDir - Directory where files were uploaded (e.g., 'public/uploads/company')
 * @returns Array of processed file information
 */
export const processUploadedFiles = (files: formidable.Files, uploadDir: string = 'public/uploads/recipes'): UploadedFile[] => {
  const processedFiles: UploadedFile[] = [];

  // Convert uploadDir to URL path (e.g., 'public/uploads/company' -> '/uploads/company')
  const urlPath = uploadDir.replace(/^public/, '');

  // Handle both single and multiple file uploads
  for (const [fieldName, fileOrFiles] of Object.entries(files)) {
    const fileArray = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];

    for (const file of fileArray) {
      // Validate image
      const errors = validateImage(file);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      // Extract filename from filepath
      const filename = path.basename(file.filepath);

      // Store relative paths instead of full URLs to avoid CORS issues
      // Frontend will resolve these relative to its own origin
      processedFiles.push({
        filename,
        originalFilename: file.originalFilename || 'unknown',
        filepath: file.filepath,
        mimetype: file.mimetype || 'application/octet-stream',
        size: file.size,
        url: `${urlPath}/${filename}`,
      });
    }
  }

  return processedFiles;
};

/**
 * Delete image file from filesystem
 * @param imageUrl - Public URL of the image (e.g., /uploads/recipes/image.jpg or http://localhost:3000/uploads/recipes/image.jpg)
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract path from URL (handle both relative and absolute URLs)
    let relativePath = imageUrl;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const url = new URL(imageUrl);
      relativePath = url.pathname;
    }

    const filepath = path.join(process.cwd(), 'public', relativePath);
    await fs.unlink(filepath);
  } catch (error: any) {
    console.error('Error deleting image:', error.message);
    // Don't throw error - file might already be deleted
  }
};

/**
 * Delete multiple images from filesystem
 * @param imageUrls - Array of public URLs
 */
export const deleteImages = async (imageUrls: string[]): Promise<void> => {
  await Promise.all(imageUrls.map((url) => deleteImage(url)));
};

/**
 * Ensure upload directory exists
 * @param dirPath - Directory path
 */
export const ensureUploadDir = async (dirPath: string): Promise<void> => {
  try {
    await fs.access(dirPath);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(dirPath, { recursive: true });
  }
};

/**
 * Get file extension from filename
 * @param filename - Filename with extension
 * @returns Extension (e.g., 'jpg', 'png')
 */
export const getFileExtension = (filename: string): string => {
  return path.extname(filename).substring(1).toLowerCase();
};

/**
 * Check if file is an image
 * @param mimetype - MIME type
 * @returns True if image
 */
export const isImage = (mimetype: string): boolean => {
  return ALLOWED_MIME_TYPES.includes(mimetype);
};
