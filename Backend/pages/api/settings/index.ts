import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import { ApiResponse } from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * Application settings
 */
export interface AppSettings {
  // Company Information
  company_name: string;
  company_phone: string;
  company_email: string;
  company_address: string;
  company_logo: string;

  // Payment Settings
  etransfer_email: string;
  default_currency: string;

  // Application Settings
  default_timezone: string;
  date_format: string;

  // Server Configuration (read-only from .env)
  port: string;
  node_env: string;

  // Database Configuration (read-only from .env)
  db_host: string;
  db_port: string;
  db_name: string;
}

/**
 * @api {get} /api/settings Get all application settings
 * @api {put} /api/settings Update application settings
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<AppSettings | null>>
) {
  await cors(req, res);

  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'PUT') {
    return handlePut(req, res);
  } else {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }
}

/**
 * GET /api/settings
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse<ApiResponse<AppSettings>>) {
  try {
    // Check if settings table exists, if not create it
    await query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Get all settings from database
    const dbSettings = await query<any[]>('SELECT setting_key, setting_value FROM app_settings');

    // Convert to object
    const settingsObj: any = {};
    dbSettings.forEach((row) => {
      settingsObj[row.setting_key] = row.setting_value;
    });

    // Merge with defaults and environment variables
    const settings: AppSettings = {
      // Company Information
      company_name: settingsObj.company_name || 'TIFFIN MANAGEMENT SYSTEM',
      company_phone: settingsObj.company_phone || '+1-123-456-7890',
      company_email: settingsObj.company_email || 'admin@tiffinservice.com',
      company_address:
        settingsObj.company_address || '123 Main Street, City, Province, Postal Code',
      company_logo: settingsObj.company_logo || process.env.DEFAULT_COMPANY_LOGO || '',

      // Payment Settings
      etransfer_email: settingsObj.etransfer_email || 'admin@tiffinservice.com',
      default_currency: settingsObj.default_currency || 'CAD',

      // Application Settings
      default_timezone: settingsObj.default_timezone || 'America/Toronto',
      date_format: settingsObj.date_format || 'YYYY-MM-DD',

      // Server Configuration (from .env - read-only)
      port: process.env.PORT || '3000',
      node_env: process.env.NODE_ENV || 'development',

      // Database Configuration (from .env - read-only)
      db_host: process.env.DB_HOST || 'localhost',
      db_port: process.env.DB_PORT || '3306',
      db_name: process.env.DB_NAME || 'tms_db',
    };

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch settings',
    });
  }
}

/**
 * PUT /api/settings
 */
async function handlePut(req: NextApiRequest, res: NextApiResponse<ApiResponse<AppSettings>>) {
  try {
    const updates = req.body;

    // Define editable settings (exclude read-only env variables)
    const editableSettings = [
      'company_name',
      'company_phone',
      'company_email',
      'company_address',
      'company_logo',
      'etransfer_email',
      'default_currency',
      'default_timezone',
      'date_format',
    ];

    // Update each editable setting
    for (const key of editableSettings) {
      if (updates[key] !== undefined) {
        await query(
          `
            INSERT INTO app_settings (setting_key, setting_value)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
          `,
          [key, updates[key]]
        );
      }
    }

    // Fetch updated settings
    return handleGet(req, res);
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update settings',
    });
  }
}
