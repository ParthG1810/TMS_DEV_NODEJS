import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query } from 'src/config/database';
import {
  LabelTemplate,
  ApiResponse,
  DEFAULT_ZEBRA_PRINT_SETTINGS,
} from 'src/types';

// ----------------------------------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    await cors(req, res);

    const { id } = req.query;

    // Validate ID
    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID',
      });
    }

    const templateId = parseInt(id);
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID format',
      });
    }

    if (req.method === 'PUT') {
      return await handleSetDefault(req, res, templateId);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in label-template default handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * PUT /api/label-templates/:id/default
 * Set a label template as the default
 */
async function handleSetDefault(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: number
) {
  try {
    // Check if template exists
    const existingTemplates = (await query(
      'SELECT * FROM label_templates WHERE id = ?',
      [id]
    )) as LabelTemplate[];

    if (existingTemplates.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Label template not found',
      });
    }

    // Unset current default
    await query('UPDATE label_templates SET is_default = FALSE WHERE is_default = TRUE');

    // Set new default
    await query('UPDATE label_templates SET is_default = TRUE WHERE id = ?', [id]);

    // Fetch updated template
    const updatedTemplates = (await query(
      'SELECT * FROM label_templates WHERE id = ?',
      [id]
    )) as LabelTemplate[];

    const updatedTemplate = {
      ...updatedTemplates[0],
      custom_placeholders: parseJsonField(updatedTemplates[0].custom_placeholders),
      print_settings: parseJsonField(updatedTemplates[0].print_settings) || DEFAULT_ZEBRA_PRINT_SETTINGS,
    };

    return res.status(200).json({
      success: true,
      data: updatedTemplate,
    });
  } catch (error: any) {
    console.error('Error setting default template:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to set default template',
    });
  }
}

/**
 * Safely parse JSON field from database
 */
function parseJsonField(field: any): any {
  if (!field) return null;
  if (typeof field === 'object') return field;
  try {
    return JSON.parse(field);
  } catch {
    return null;
  }
}
