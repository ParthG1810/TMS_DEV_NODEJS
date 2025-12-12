import type { NextApiRequest, NextApiResponse } from 'next';
import { parseForm, processUploadedFiles, deleteImage } from '../../../src/utils/upload';
import { ApiResponse } from '../../../src/types';
import cors from '../../../src/utils/cors';
import { query } from '../../../src/config/database';

/**
 * @api {post} /api/settings/upload-logo Upload company logo
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ url: string }>>
) {
  await cors(req, res);

  // Disable Next.js body parsing - formidable will handle it
  if (req.method === 'POST') {
    return handlePost(req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res);
  } else {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }
}

// Disable Next.js body parser for file upload
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * POST /api/settings/upload-logo
 * Upload a new company logo
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ url: string }>>
) {
  try {
    const uploadDir = 'public/uploads/company';

    // Parse the multipart form data
    const { files } = await parseForm(req, uploadDir);

    // Process uploaded files with correct upload directory
    const uploadedFiles = processUploadedFiles(files, uploadDir);

    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const logoFile = uploadedFiles[0];

    // Get current logo to delete old one
    const currentSettings = await query<any[]>(
      'SELECT setting_value FROM app_settings WHERE setting_key = ?',
      ['company_logo']
    );

    // Delete old logo if exists
    if (currentSettings.length > 0 && currentSettings[0].setting_value) {
      try {
        await deleteImage(currentSettings[0].setting_value);
      } catch (error) {
        console.error('Error deleting old logo:', error);
        // Continue even if deletion fails
      }
    }

    // Update database with new logo URL
    await query(
      `
        INSERT INTO app_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
      `,
      ['company_logo', logoFile.url]
    );

    return res.status(200).json({
      success: true,
      data: {
        url: logoFile.url,
      },
    });
  } catch (error: any) {
    console.error('Error uploading logo:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload logo',
    });
  }
}

/**
 * DELETE /api/settings/upload-logo
 * Delete the company logo
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<null>>
) {
  try {
    // Get current logo
    const currentSettings = await query<any[]>(
      'SELECT setting_value FROM app_settings WHERE setting_key = ?',
      ['company_logo']
    );

    // Delete logo file if exists
    if (currentSettings.length > 0 && currentSettings[0].setting_value) {
      try {
        await deleteImage(currentSettings[0].setting_value);
      } catch (error) {
        console.error('Error deleting logo file:', error);
        // Continue even if file deletion fails
      }
    }

    // Remove from database
    await query('DELETE FROM app_settings WHERE setting_key = ?', ['company_logo']);

    return res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error: any) {
    console.error('Error deleting logo:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete logo',
    });
  }
}
