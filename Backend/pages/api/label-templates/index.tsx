import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query } from 'src/config/database';
import {
  LabelTemplate,
  CreateLabelTemplateRequest,
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

    if (req.method === 'GET') {
      return await handleGetTemplates(req, res);
    } else if (req.method === 'POST') {
      return await handleCreateTemplate(req, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in label-templates handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/label-templates
 * Fetch all label templates
 */
async function handleGetTemplates(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const templates = (await query(
      `SELECT * FROM label_templates ORDER BY is_default DESC, name ASC`
    )) as LabelTemplate[];

    // Parse JSON fields
    const parsedTemplates = templates.map((template) => ({
      ...template,
      custom_placeholders: parseJsonField(template.custom_placeholders),
      print_settings: parseJsonField(template.print_settings) || DEFAULT_ZEBRA_PRINT_SETTINGS,
    }));

    return res.status(200).json({
      success: true,
      data: parsedTemplates,
    });
  } catch (error: any) {
    console.error('Error fetching label templates:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch label templates',
    });
  }
}

/**
 * POST /api/label-templates
 * Create a new label template
 */
async function handleCreateTemplate(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const {
      name,
      description,
      width_inches,
      height_inches,
      template_html,
      custom_placeholders,
      print_settings,
      is_default,
    } = req.body as CreateLabelTemplateRequest;

    // Validation
    const errors = validateTemplateInput({
      name,
      description,
      width_inches,
      height_inches,
      template_html,
    });
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors.join(', '),
      });
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      await query('UPDATE label_templates SET is_default = FALSE WHERE is_default = TRUE');
    }

    // Insert template
    const result = (await query(
      `INSERT INTO label_templates
       (name, description, width_inches, height_inches, template_html, custom_placeholders, print_settings, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || null,
        width_inches,
        height_inches,
        template_html,
        custom_placeholders ? JSON.stringify(custom_placeholders) : null,
        print_settings ? JSON.stringify(print_settings) : JSON.stringify(DEFAULT_ZEBRA_PRINT_SETTINGS),
        is_default ? true : false,
      ]
    )) as any;

    const templateId = result.insertId;

    // Fetch the created template
    const createdTemplates = (await query(
      'SELECT * FROM label_templates WHERE id = ?',
      [templateId]
    )) as LabelTemplate[];

    const createdTemplate = {
      ...createdTemplates[0],
      custom_placeholders: parseJsonField(createdTemplates[0].custom_placeholders),
      print_settings: parseJsonField(createdTemplates[0].print_settings) || DEFAULT_ZEBRA_PRINT_SETTINGS,
    };

    return res.status(201).json({
      success: true,
      data: createdTemplate,
    });
  } catch (error: any) {
    console.error('Error creating label template:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create label template',
    });
  }
}

/**
 * Validate template input data
 */
function validateTemplateInput(data: Partial<CreateLabelTemplateRequest>): string[] {
  const errors: string[] = [];

  // Validate name
  if (!data.name || data.name.trim() === '') {
    errors.push('Template name is required');
  }
  if (data.name && data.name.length > 255) {
    errors.push('Template name must be less than 255 characters');
  }

  // Validate description
  if (data.description && data.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }

  // Validate width (Zebra GX430d max: 4.09 inches, min: 0.75 inches)
  if (data.width_inches === undefined || data.width_inches === null) {
    errors.push('Label width is required');
  } else if (data.width_inches < 0.75) {
    errors.push('Label width must be at least 0.75 inches');
  } else if (data.width_inches > 4.09) {
    errors.push('Label width cannot exceed 4.09 inches (Zebra GX430d limit)');
  }

  // Validate height
  if (data.height_inches === undefined || data.height_inches === null) {
    errors.push('Label height is required');
  } else if (data.height_inches < 0.5) {
    errors.push('Label height must be at least 0.5 inches');
  } else if (data.height_inches > 12) {
    errors.push('Label height cannot exceed 12 inches');
  }

  // Validate template HTML
  if (!data.template_html || data.template_html.trim() === '') {
    errors.push('Template content is required');
  }

  return errors;
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
