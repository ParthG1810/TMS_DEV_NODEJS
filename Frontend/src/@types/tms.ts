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

// ----------------------------------------------------------------------
// Tiffin Management Types
// ----------------------------------------------------------------------

export type MealFrequency = 'Daily' | 'Weekly' | 'Monthly';
export type MealDays = 'Mon-Fri' | 'Mon-Sat' | 'Single';
export type DayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

// Meal Plan
export type IMealPlan = {
  id: number;
  meal_name: string;
  description?: string;
  frequency: MealFrequency;
  days: MealDays;
  price: number;
  created_at: Date | string;
  updated_at: Date | string;
};

export type IMealPlanFormValues = {
  meal_name: string;
  description: string;
  frequency: MealFrequency;
  days: MealDays;
  price: number;
};

// Customer
export type ICustomer = {
  id: number;
  name: string;
  phone?: string;
  address: string;
  created_at: Date | string;
  updated_at: Date | string;
};

export type ICustomerFormValues = {
  name: string;
  phone: string;
  address: string;
};

// Customer Order
export type ICustomerOrder = {
  id: number;
  customer_id: number;
  meal_plan_id: number;
  quantity: number;
  selected_days: DayName[];
  price: number;
  start_date: string;
  end_date: string;
  created_at: Date | string;
  updated_at: Date | string;
  // Joined data
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  meal_plan_name?: string;
  meal_plan_description?: string;
  meal_plan_frequency?: MealFrequency;
  meal_plan_days?: MealDays;
};

export type ICustomerOrderFormValues = {
  customer_id: number;
  meal_plan_id: number;
  quantity: number;
  selected_days: DayName[];
  price: number;
  start_date: string;
  end_date: string;
};

// Daily Tiffin Count
export type IDailyTiffinCount = {
  customer_name: string;
  quantity: number;
  meal_plan_name: string;
};

export type IDailyTiffinSummary = {
  date: string;
  orders: IDailyTiffinCount[];
  total_count: number;
};

// Redux State Types
export type IMealPlanState = {
  isLoading: boolean;
  error: Error | string | null;
  mealPlans: IMealPlan[];
  mealPlan: IMealPlan | null;
};

export type ICustomerState = {
  isLoading: boolean;
  error: Error | string | null;
  customers: ICustomer[];
  customer: ICustomer | null;
};

export type ICustomerOrderState = {
  isLoading: boolean;
  error: Error | string | null;
  orders: ICustomerOrder[];
  order: ICustomerOrder | null;
  dailySummary: IDailyTiffinSummary | null;
};
