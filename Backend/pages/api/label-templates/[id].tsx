import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query } from 'src/config/database';
import {
  LabelTemplate,
  UpdateLabelTemplateRequest,
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

    if (req.method === 'GET') {
      return await handleGetTemplate(req, res, templateId);
    } else if (req.method === 'PUT') {
      return await handleUpdateTemplate(req, res, templateId);
    } else if (req.method === 'DELETE') {
      return await handleDeleteTemplate(req, res, templateId);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in label-template handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/label-templates/:id
 * Fetch a single label template by ID
 */
async function handleGetTemplate(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: number
) {
  try {
    const templates = (await query(
      'SELECT * FROM label_templates WHERE id = ?',
      [id]
    )) as LabelTemplate[];

    if (templates.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Label template not found',
      });
    }

    const template = {
      ...templates[0],
      custom_placeholders: parseJsonField(templates[0].custom_placeholders),
      print_settings: parseJsonField(templates[0].print_settings) || DEFAULT_ZEBRA_PRINT_SETTINGS,
    };

    return res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error('Error fetching label template:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch label template',
    });
  }
}

/**
 * PUT /api/label-templates/:id
 * Update a label template
 */
async function handleUpdateTemplate(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: number
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
    } = req.body as UpdateLabelTemplateRequest;

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

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      if (name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Template name cannot be empty',
        });
      }
      if (name.length > 255) {
        return res.status(400).json({
          success: false,
          error: 'Template name must be less than 255 characters',
        });
      }
      updates.push('name = ?');
      values.push(name);
    }

    if (description !== undefined) {
      if (description && description.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'Description must be less than 500 characters',
        });
      }
      updates.push('description = ?');
      values.push(description || null);
    }

    if (width_inches !== undefined) {
      if (width_inches < 0.75 || width_inches > 4.09) {
        return res.status(400).json({
          success: false,
          error: 'Label width must be between 0.75 and 4.09 inches',
        });
      }
      updates.push('width_inches = ?');
      values.push(width_inches);
    }

    if (height_inches !== undefined) {
      if (height_inches < 0.5 || height_inches > 12) {
        return res.status(400).json({
          success: false,
          error: 'Label height must be between 0.5 and 12 inches',
        });
      }
      updates.push('height_inches = ?');
      values.push(height_inches);
    }

    if (template_html !== undefined) {
      if (template_html.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Template content cannot be empty',
        });
      }
      updates.push('template_html = ?');
      values.push(template_html);
    }

    if (custom_placeholders !== undefined) {
      updates.push('custom_placeholders = ?');
      values.push(custom_placeholders ? JSON.stringify(custom_placeholders) : null);
    }

    if (print_settings !== undefined) {
      updates.push('print_settings = ?');
      values.push(print_settings ? JSON.stringify(print_settings) : null);
    }

    if (is_default !== undefined) {
      // If setting as default, unset other defaults first
      if (is_default) {
        await query('UPDATE label_templates SET is_default = FALSE WHERE is_default = TRUE AND id != ?', [id]);
      }
      updates.push('is_default = ?');
      values.push(is_default);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
    }

    // Add ID to values for WHERE clause
    values.push(id);

    // Execute update
    await query(`UPDATE label_templates SET ${updates.join(', ')} WHERE id = ?`, values);

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
    console.error('Error updating label template:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update label template',
    });
  }
}

/**
 * DELETE /api/label-templates/:id
 * Delete a label template
 */
async function handleDeleteTemplate(
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

    const wasDefault = existingTemplates[0].is_default;

    // Delete template
    await query('DELETE FROM label_templates WHERE id = ?', [id]);

    // If deleted template was default, set the first remaining template as default
    if (wasDefault) {
      const remainingTemplates = (await query(
        'SELECT id FROM label_templates ORDER BY created_at ASC LIMIT 1'
      )) as any[];

      if (remainingTemplates.length > 0) {
        await query('UPDATE label_templates SET is_default = TRUE WHERE id = ?', [
          remainingTemplates[0].id,
        ]);
      }
    }

    return res.status(200).json({
      success: true,
      data: { message: 'Label template deleted successfully' },
    });
  } catch (error: any) {
    console.error('Error deleting label template:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete label template',
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
