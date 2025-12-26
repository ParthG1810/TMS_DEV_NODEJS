import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { query } from '../../../src/config/database';
import cors from '../../../src/utils/cors';

/**
 * @api {get} /api/settings/logo Get company logo as base64
 * Returns the company logo as a base64-encoded data URL for direct embedding
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await cors(req, res);

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    // Get logo path from database
    const settings = await query<any[]>(
      'SELECT setting_value FROM app_settings WHERE setting_key = ?',
      ['company_logo']
    );

    if (settings.length === 0 || !settings[0].setting_value) {
      return res.status(404).json({
        success: false,
        error: 'No logo configured',
      });
    }

    let logoPath = settings[0].setting_value;

    // Extract pathname if it's a full URL
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
      try {
        const url = new URL(logoPath);
        logoPath = url.pathname;
      } catch (e) {
        console.error('Failed to parse logo URL:', e);
      }
    }

    // Convert to filesystem path
    // /uploads/company/logo.jpg -> public/uploads/company/logo.jpg
    const filePath = path.join(process.cwd(), 'public', logoPath);

    console.log('Reading logo from:', filePath);

    // Read file
    const fileBuffer = await fs.readFile(filePath);

    // Detect MIME type from extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const mimeType = mimeTypes[ext] || 'image/jpeg';

    // Convert to base64
    const base64 = fileBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return res.status(200).json({
      success: true,
      data: {
        dataUrl,
        mimeType,
        size: fileBuffer.length,
      },
    });
  } catch (error: any) {
    console.error('Error reading logo:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to read logo',
    });
  }
}
