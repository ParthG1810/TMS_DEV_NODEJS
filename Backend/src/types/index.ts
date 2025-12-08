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
 * Ingredient entity from database
 */
export interface Ingredient {
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
  ingredient_id: number;
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
  ingredient_id: number;
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
 * Vendor input for creating/updating ingredients
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
 * Request body for creating an ingredient
 */
export interface CreateIngredientRequest {
  name: string;
  description?: string;
  vendors: VendorInput[];
}

/**
 * Request body for updating an ingredient
 */
export interface UpdateIngredientRequest {
  name?: string;
  description?: string;
  vendors?: VendorInput[];
}

/**
 * Recipe ingredient input for creating/updating recipes
 */
export interface RecipeIngredientInput {
  ingredient_id: number;
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
 * Ingredient with vendors (joined data)
 */
export interface IngredientWithVendors extends Ingredient {
  vendors: Vendor[];
}

/**
 * Recipe with ingredients and images (joined data)
 */
export interface RecipeWithDetails extends Recipe {
  ingredients: RecipeIngredientWithDetails[];
  images: RecipeImage[];
  total_cost?: number; // Calculated field
}

/**
 * Recipe ingredient with ingredient details
 */
export interface RecipeIngredientWithDetails extends RecipeIngredient {
  ingredient_name: string;
  ingredient_description?: string;
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

// ----------------------------------------------------------------------
// TIFFIN MANAGEMENT SYSTEM TYPES
// ----------------------------------------------------------------------

/**
 * Meal plan frequency enum
 */
export type MealFrequency = 'Daily' | 'Weekly' | 'Monthly';

/**
 * Days enum
 */
export type MealDays = 'Mon-Fri' | 'Mon-Sat' | 'Single';

/**
 * Day names for order selection
 */
export type DayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

/**
 * Meal Plan entity from database
 */
export interface MealPlan {
  id: number;
  meal_name: string;
  description?: string;
  frequency: MealFrequency;
  days: MealDays;
  price: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Customer entity from database
 */
export interface Customer {
  id: number;
  name: string;
  phone?: string;
  address: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Customer Order entity from database
 */
export interface CustomerOrder {
  id: number;
  customer_id: number;
  meal_plan_id: number;
  quantity: number;
  selected_days: DayName[];
  price: number;
  start_date: string; // YYYY-MM-DD format
  end_date: string; // YYYY-MM-DD format
  created_at: Date;
  updated_at: Date;
}

/**
 * Request body for creating a meal plan
 */
export interface CreateMealPlanRequest {
  meal_name: string;
  description?: string;
  frequency: MealFrequency;
  days?: MealDays;
  price: number;
}

/**
 * Request body for updating a meal plan
 */
export interface UpdateMealPlanRequest {
  meal_name?: string;
  description?: string;
  frequency?: MealFrequency;
  days?: MealDays;
  price?: number;
}

/**
 * Request body for creating a customer
 */
export interface CreateCustomerRequest {
  name: string;
  phone?: string;
  address: string;
}

/**
 * Request body for updating a customer
 */
export interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
  address?: string;
}

/**
 * Request body for creating a customer order
 */
export interface CreateCustomerOrderRequest {
  customer_id: number;
  meal_plan_id: number;
  quantity: number;
  selected_days: DayName[];
  price: number;
  start_date: string; // YYYY-MM-DD format
  end_date: string; // YYYY-MM-DD format
}

/**
 * Request body for updating a customer order
 */
export interface UpdateCustomerOrderRequest {
  customer_id?: number;
  meal_plan_id?: number;
  quantity?: number;
  selected_days?: DayName[];
  price?: number;
  start_date?: string;
  end_date?: string;
}

/**
 * Customer order with customer and meal plan details (joined data)
 */
export interface CustomerOrderWithDetails extends CustomerOrder {
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  meal_plan_name: string;
  meal_plan_description?: string;
  meal_plan_frequency: MealFrequency;
  meal_plan_days: MealDays;
}

/**
 * Daily tiffin count item
 */
export interface DailyTiffinCount {
  customer_name: string;
  quantity: number;
  meal_plan_name: string;
}

/**
 * Daily tiffin summary
 */
export interface DailyTiffinSummary {
  date: string; // YYYY-MM-DD format
  orders: DailyTiffinCount[];
  total_count: number;
}
