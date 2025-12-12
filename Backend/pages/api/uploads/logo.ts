import type { NextApiRequest, NextApiResponse } from 'next';
import { parseForm, processUploadedFiles, deleteImage } from '../../../src/utils/upload';
import { ApiResponse } from '../../../src/types';
import cors from '../../../src/utils/cors';
import { query } from '../../../src/config/database';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing, formidable will handle it
  },
};

interface LogoUploadResponse {
  logoUrl: string;
  message: string;
}

/**
 * @api {post} /api/uploads/logo Upload company logo
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<LogoUploadResponse>>
) {
  await cors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    // Parse form with logo upload directory
    const uploadDir = 'public/uploads/logos';
    const { files } = await parseForm(req, uploadDir);

    // Process uploaded file
    const processedFiles = processUploadedFiles(files);

    if (processedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No logo file uploaded',
      });
    }

    // Get the first uploaded file
    const uploadedLogo = processedFiles[0];

    // Convert the URL to a relative path for storage
    // Format: /uploads/logos/filename.jpg
    const logoPath = uploadedLogo.url.replace(/^https?:\/\/[^/]+/, '');

    // Get old logo URL from settings to delete it
    const oldSettings = await query<any[]>(
      'SELECT setting_value FROM app_settings WHERE setting_key = ?',
      ['company_logo_url']
    );

    // Delete old logo if it exists and is not the default
    if (oldSettings.length > 0 && oldSettings[0].setting_value) {
      const oldLogoUrl = oldSettings[0].setting_value;
      if (oldLogoUrl && !oldLogoUrl.includes('/logo/logo_full')) {
        await deleteImage(oldLogoUrl);
      }
    }

    // Update company_logo_url in settings
    await query(
      `
        INSERT INTO app_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
      `,
      ['company_logo_url', logoPath]
    );

    return res.status(200).json({
      success: true,
      data: {
        logoUrl: logoPath,
        message: 'Company logo uploaded successfully',
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
