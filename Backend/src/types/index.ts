// ============================================================
// TMS Database Type Definitions
// ============================================================

/**
 * Package size enum matching database ENUM
 * Volume measurements: tsp, tbsp, c, pt, qt, gal, fl_oz
 * Weight measurements: oz, lb, g, kg
 * Metric volume: ml, l
 * Count: pcs
 */
export type PackageSize =
  | 'tsp'    // Teaspoon
  | 'tbsp'   // Tablespoon
  | 'c'      // Cup
  | 'pt'     // Pint
  | 'qt'     // Quart
  | 'gal'    // Gallon
  | 'fl_oz'  // Fluid ounce
  | 'oz'     // Ounce
  | 'lb'     // Pound
  | 'g'      // Gram
  | 'kg'     // Kilogram
  | 'ml'     // Milliliter
  | 'l'      // Liter
  | 'pcs';   // Pieces

// ----------------------------------------------------------------------
// DATABASE ENTITY TYPES
// ----------------------------------------------------------------------

/**
 * Product entity from database
 */
export interface Product {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Vendor entity from database
 */
export interface Vendor {
  id: number;
  product_id: number;
  vendor_name: string;
  price: number;
  weight: number;
  package_size: PackageSize;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Recipe entity from database
 */
export interface Recipe {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Recipe Ingredient entity from database
 */
export interface RecipeIngredient {
  id: number;
  recipe_id: number;
  product_id: number;
  quantity: number;
  created_at: Date;
}

/**
 * Recipe Image entity from database
 */
export interface RecipeImage {
  id: number;
  recipe_id: number;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  created_at: Date;
}

// ----------------------------------------------------------------------
// API REQUEST TYPES
// ----------------------------------------------------------------------

/**
 * Vendor input for creating/updating products
 */
export interface VendorInput {
  id?: number; // Optional for updates
  vendor_name: string;
  price: number;
  weight: number;
  package_size: PackageSize;
  is_default: boolean;
}

/**
 * Request body for creating a product
 */
export interface CreateProductRequest {
  name: string;
  description?: string;
  vendors: VendorInput[];
}

/**
 * Request body for updating a product
 */
export interface UpdateProductRequest {
  name?: string;
  description?: string;
  vendors?: VendorInput[];
}

/**
 * Recipe ingredient input for creating/updating recipes
 */
export interface RecipeIngredientInput {
  product_id: number;
  quantity: number;
}

/**
 * Request body for creating a recipe
 */
export interface CreateRecipeRequest {
  name: string;
  description?: string;
  ingredients: RecipeIngredientInput[];
  images?: string[]; // Image URLs from upload
}

/**
 * Request body for updating a recipe
 */
export interface UpdateRecipeRequest {
  name?: string;
  description?: string;
  ingredients?: RecipeIngredientInput[];
  images?: string[]; // Image URLs from upload
}

// ----------------------------------------------------------------------
// API RESPONSE TYPES
// ----------------------------------------------------------------------

/**
 * Product with vendors (joined data)
 */
export interface ProductWithVendors extends Product {
  vendors: Vendor[];
}

/**
 * Recipe with ingredients and images (joined data)
 */
export interface RecipeWithDetails extends Recipe {
  ingredients: RecipeIngredientWithProduct[];
  images: RecipeImage[];
  total_cost?: number; // Calculated field
}

/**
 * Recipe ingredient with product details
 */
export interface RecipeIngredientWithProduct extends RecipeIngredient {
  product_name: string;
  product_description?: string;
  unit_price?: number; // From default vendor
  total_price?: number; // quantity * unit_price
}

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
}

/**
 * Generic API response type
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// ----------------------------------------------------------------------
// UTILITY TYPES
// ----------------------------------------------------------------------

/**
 * Database query result types
 */
export interface QueryResult {
  affectedRows: number;
  insertId: number;
  warningStatus: number;
}

/**
 * File upload result
 */
export interface UploadedFile {
  filename: string;
  originalFilename: string;
  filepath: string;
  mimetype: string;
  size: number;
  url: string; // Public URL to access the file
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
