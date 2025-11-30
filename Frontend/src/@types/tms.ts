// ----------------------------------------------------------------------
// TMS (Table Management System) Type Definitions
// ----------------------------------------------------------------------

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
// Ingredient Types
// ----------------------------------------------------------------------

export type IVendor = {
  id?: number;
  ingredient_id?: number;
  vendor_name: string;
  price: number;
  weight: number;
  package_size: PackageSize;
  is_default: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export type ITMSIngredient = {
  id: number;
  name: string;
  description?: string;
  vendors: IVendor[];
  created_at: Date | string;
  updated_at: Date | string;
};

export type IIngredientFormValues = {
  name: string;
  description: string;
  vendors: IVendor[];
};

// ----------------------------------------------------------------------
// Recipe Types
// ----------------------------------------------------------------------

export type IRecipeImage = {
  id: number;
  recipe_id: number;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  created_at: Date | string;
};

export type IRecipeIngredient = {
  id?: number;
  recipe_id?: number;
  ingredient_id: number;
  quantity: number;
  ingredient_name?: string;
  ingredient_description?: string;
  unit_price?: number;
  weight?: number;
  package_size?: PackageSize;
  total_price?: number;
  created_at?: Date | string;
};

export type ITMSRecipe = {
  id: number;
  name: string;
  description?: string;
  ingredients: IRecipeIngredient[];
  images: IRecipeImage[];
  total_cost?: number;
  created_at: Date | string;
  updated_at: Date | string;
};

export type IRecipeFormValues = {
  name: string;
  description: string;
  ingredients: IRecipeIngredient[];
  images: (File | string)[];
};

// ----------------------------------------------------------------------
// Redux State Types
// ----------------------------------------------------------------------

export type ITMSIngredientState = {
  isLoading: boolean;
  error: Error | string | null;
  ingredients: ITMSIngredient[];
  ingredient: ITMSIngredient | null;
};

export type ITMSRecipeState = {
  isLoading: boolean;
  error: Error | string | null;
  recipes: ITMSRecipe[];
  recipe: ITMSRecipe | null;
};

// ----------------------------------------------------------------------
// API Response Types
// ----------------------------------------------------------------------

export type IApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};
