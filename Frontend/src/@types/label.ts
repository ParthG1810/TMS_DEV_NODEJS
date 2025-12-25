// ----------------------------------------------------------------------
// LABEL PRINTING SYSTEM TYPES
// For Zebra GX430d Thermal Label Printer
// ----------------------------------------------------------------------

/**
 * Print method for Zebra GX430d
 */
export type PrintMethod = 'native' | 'usb-direct';

/**
 * Media type for thermal printing
 */
export type MediaType = 'direct-thermal' | 'thermal-transfer';

/**
 * Zebra printer settings
 */
export interface ZebraPrintSettings {
  dpi: number;
  mediaType: MediaType;
  printSpeed: number;
  darkness: number;
  labelTop: number;
  labelShift: number;
  printMethod: PrintMethod;
}

/**
 * Custom placeholder definition
 */
export interface CustomPlaceholder {
  key: string;
  defaultValue: string;
  description: string;
}

/**
 * Label Template entity
 */
export interface LabelTemplate {
  id: number;
  name: string;
  description?: string;
  width_inches: number;
  height_inches: number;
  template_html: string;
  custom_placeholders?: CustomPlaceholder[];
  print_settings?: ZebraPrintSettings;
  is_default: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Customer Print Order entity
 */
export interface CustomerPrintOrder {
  id: number;
  customer_id: number;
  print_order: number;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Customer with print order (for ordering page)
 */
export interface CustomerWithPrintOrder {
  id: number;
  name: string;
  phone?: string;
  address: string;
  print_order: number;
  created_at?: Date | string;
  updated_at?: Date | string;
}

/**
 * Request body for creating a label template
 */
export interface CreateLabelTemplateRequest {
  name: string;
  description?: string;
  width_inches: number;
  height_inches: number;
  template_html: string;
  custom_placeholders?: CustomPlaceholder[];
  print_settings?: ZebraPrintSettings;
  is_default?: boolean;
}

/**
 * Request body for updating a label template
 */
export interface UpdateLabelTemplateRequest {
  name?: string;
  description?: string;
  width_inches?: number;
  height_inches?: number;
  template_html?: string;
  custom_placeholders?: CustomPlaceholder[];
  print_settings?: ZebraPrintSettings;
  is_default?: boolean;
}

/**
 * Request body for updating customer print order (bulk)
 */
export interface UpdateCustomerPrintOrderRequest {
  orders: {
    customer_id: number;
    print_order: number;
  }[];
}

/**
 * Label data for printing (with replaced placeholders)
 */
export interface LabelPrintData {
  customer_id: number;
  customer_name: string;
  customer_address: string;
  customer_phone?: string;
  delivery_date?: string;
  order_quantity?: number;
  meal_plan_name?: string;
  current_date: string;
  serial_number: string;
  custom_values?: Record<string, string>;
}

/**
 * Print job request
 */
export interface PrintLabelsRequest {
  template_id: number;
  labels: {
    customer_id: number;
    copies: number;
    custom_values?: Record<string, string>;
  }[];
}

/**
 * Customer for bulk print table
 */
export interface CustomerForPrint {
  id: number;
  name: string;
  phone?: string;
  address: string;
  copies: number;
  selected: boolean;
}

/**
 * Label editor form state
 */
export interface LabelEditorFormState {
  name: string;
  description: string;
  width_inches: number;
  height_inches: number;
  template_html: string;
  custom_placeholders: CustomPlaceholder[];
  print_settings: ZebraPrintSettings;
  is_default: boolean;
}

/**
 * System placeholder info
 */
export interface SystemPlaceholder {
  key: string;
  description: string;
  example: string;
}

/**
 * Preset label size
 */
export interface PresetLabelSize {
  name: string;
  width: number;
  height: number;
}

/**
 * Font preset for toolbar
 */
export interface FontPreset {
  name: string;
  reason: string;
}

/**
 * Font size preset for toolbar
 */
export interface FontSizePreset {
  label: string;
  value: string;
  useCase: string;
}

// ----------------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------------

/**
 * System placeholders available for labels
 */
export const SYSTEM_PLACEHOLDERS: SystemPlaceholder[] = [
  { key: 'customerName', description: 'Customer full name', example: 'Parthkumar Patel' },
  { key: 'customerAddress', description: 'Delivery address', example: '333 Main Avenue' },
  { key: 'customerPhone', description: 'Phone number', example: '(555) 123-4567' },
  { key: 'deliveryDate', description: 'Delivery date', example: 'Dec 25, 2025' },
  { key: 'orderQuantity', description: 'Number of tiffins', example: '2' },
  { key: 'mealPlanName', description: 'Meal plan type', example: 'Daily Lunch' },
  { key: 'currentDate', description: "Today's date", example: 'Dec 25, 2025' },
  { key: 'serialNumber', description: 'Print serial #', example: '001' },
];

/**
 * Preset label sizes for Zebra GX430d (max width 4.09")
 */
export const PRESET_LABEL_SIZES: PresetLabelSize[] = [
  { name: '4" x 6" (Shipping)', width: 4.00, height: 6.00 },
  { name: '4" x 3" (Large)', width: 4.00, height: 3.00 },
  { name: '4" x 2" (Standard)', width: 4.00, height: 2.00 },
  { name: '4" x 1" (Slim)', width: 4.00, height: 1.00 },
  { name: '3" x 2" (Medium)', width: 3.00, height: 2.00 },
  { name: '2.25" x 1.25" (Small)', width: 2.25, height: 1.25 },
  { name: '2" x 1" (Mini)', width: 2.00, height: 1.00 },
];

/**
 * Recommended fonts for thermal printing at 300 DPI
 */
export const RECOMMENDED_FONTS: FontPreset[] = [
  { name: 'Arial', reason: 'Clear at all sizes' },
  { name: 'Verdana', reason: 'Excellent readability' },
  { name: 'Roboto', reason: 'Modern, clean' },
  { name: 'OCR-A', reason: 'For barcodes/scanning' },
];

/**
 * Font size presets for label editor toolbar
 */
export const FONT_SIZE_PRESETS: FontSizePreset[] = [
  { label: '8pt', value: '8pt', useCase: 'Fine print' },
  { label: '10pt', value: '10pt', useCase: 'Secondary info' },
  { label: '12pt', value: '12pt', useCase: 'Body text' },
  { label: '14pt', value: '14pt', useCase: 'Emphasis' },
  { label: '18pt', value: '18pt', useCase: 'Headers' },
  { label: '24pt', value: '24pt', useCase: 'Large titles' },
];

/**
 * Default Zebra GX430d print settings
 */
export const DEFAULT_ZEBRA_PRINT_SETTINGS: ZebraPrintSettings = {
  dpi: 300,
  mediaType: 'direct-thermal',
  printSpeed: 4,
  darkness: 15,
  labelTop: 0,
  labelShift: 0,
  printMethod: 'native',
};

/**
 * Keyboard shortcuts for label editor
 */
export const KEYBOARD_SHORTCUTS: Record<string, string> = {
  'Ctrl+S': 'Save template',
  'Ctrl+Z': 'Undo',
  'Ctrl+Y': 'Redo',
  'Ctrl+P': 'Print preview',
  'Ctrl+D': 'Duplicate template',
  'Escape': 'Cancel editing',
};

/**
 * Zebra GX430d specifications
 */
export const ZEBRA_GX430D_SPECS = {
  maxPrintWidth: 4.09, // inches
  minLabelWidth: 0.75, // inches
  dpi: 300,
  maxPrintSpeed: 4, // inches per second
  darknessRange: { min: 0, max: 30, default: 15 },
};

/**
 * Inches to pixels conversion (for screen preview)
 */
export const INCH_TO_PX = 96; // 96 DPI for standard screens

/**
 * Helper function to convert inches to pixels
 */
export const inchesToPixels = (inches: number): number => Math.round(inches * INCH_TO_PX);

/**
 * Helper function to replace placeholders in template
 */
export const replacePlaceholders = (
  template: string,
  data: Record<string, string | number | undefined>
): string => {
  let result = template;
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), String(value ?? ''));
  });
  return result;
};

/**
 * Generate sample data for preview
 */
export const getSamplePreviewData = (): Record<string, string> => ({
  customerName: 'Parthkumar Patel',
  customerAddress: '333 Main Avenue, City, State 12345',
  customerPhone: '(555) 123-4567',
  deliveryDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  orderQuantity: '2',
  mealPlanName: 'Daily Lunch',
  currentDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  serialNumber: '001',
});
