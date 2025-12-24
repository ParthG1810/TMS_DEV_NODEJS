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
  order_count?: number;
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
  order_count?: number;
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
  payment_id?: number;
  payment_status: PaymentStatus;
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

// ----------------------------------------------------------------------
// Payment Management Types
// ----------------------------------------------------------------------

export type PaymentStatus = 'calculating' | 'pending' | 'finalized' | 'paid' | 'partial_paid';
export type CalendarEntryStatus = 'T' | 'A' | 'E';
export type BillingStatus = 'calculating' | 'pending' | 'finalized' | 'paid' | 'partial_paid';
export type NotificationType = 'month_end_calculation' | 'payment_received' | 'payment_overdue';
export type NotificationPriority = 'low' | 'medium' | 'high';

// Tiffin Calendar Entry
export type ITiffinCalendarEntry = {
  id: number;
  customer_id: number;
  order_id: number;
  delivery_date: string;
  status: CalendarEntryStatus;
  quantity: number;
  price: number;
  notes?: string;
  created_at: Date | string;
  updated_at: Date | string;
  // Joined data
  customer_name?: string;
  customer_phone?: string;
  meal_plan_id?: number;
  meal_plan_name?: string;
};

// Monthly Billing
export type IMonthlyBilling = {
  id: number;
  customer_id: number;
  billing_month: string;
  total_delivered: number;
  total_absent: number;
  total_extra: number;
  total_days: number;
  base_amount: number;
  extra_amount: number;
  total_amount: number;
  status: BillingStatus;
  calculated_at?: Date | string;
  finalized_at?: Date | string;
  finalized_by?: string;
  paid_at?: Date | string;
  payment_method?: string;
  notes?: string;
  created_at: Date | string;
  updated_at: Date | string;
  // Joined data
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
};

// Payment Notification
export type IPaymentNotification = {
  id: number;
  notification_type: NotificationType;
  billing_id?: number;
  customer_id?: number;
  billing_month?: string;
  title: string;
  message: string;
  is_read: boolean;
  is_dismissed: boolean;
  priority: NotificationPriority;
  action_url?: string;
  created_at: Date | string;
  read_at?: Date | string;
  dismissed_at?: Date | string;
  // Joined data
  customer_name?: string;
};

// Payment History
export type IPaymentHistory = {
  id: number;
  billing_id: number;
  customer_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  transaction_id?: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at: Date | string;
  updated_at: Date | string;
};

// Pricing Rule
export type IPricingRule = {
  id: number;
  meal_plan_id?: number;
  rule_name: string;
  delivered_price: number;
  extra_price: number;
  is_default: boolean;
  effective_from: string;
  effective_to?: string;
  created_at: Date | string;
  updated_at: Date | string;
};

// Calendar Grid Data
export type ICalendarGridData = {
  year: number;
  month: number;
  customers: ICalendarCustomerData[];
};

export type ICalendarCustomerData = {
  customer_id: number;
  customer_name: string;
  customer_phone?: string;
  entries: { [date: string]: CalendarEntryStatus | null };
  total_delivered: number;
  total_absent: number;
  total_extra: number;
  total_amount: number;
  // Per-order billing status (for individual order finalization)
  billing_status: BillingStatus;
  billing_id?: number; // order_billing.id
  order_billing_id?: number; // order_billing.id (alias)
  // Combined invoice billing (for customer-level finalization)
  combined_billing_id?: number;
  combined_billing_status?: BillingStatus;
  orders?: Array<{
    id: number;
    start_date: string;
    end_date: string;
    selected_days?: string[]; // Array of day names: ['Monday', 'Tuesday', etc.]
    meal_plan_name?: string; // Name of the meal plan for this order
  }>;
};

// Monthly Calendar Data
export type IMonthlyCalendarData = {
  customer_id: number;
  customer_name: string;
  billing_month: string;
  entries: ITiffinCalendarEntry[];
  billing?: IMonthlyBilling;
  active_orders: ICustomerOrder[];
};

// Billing Calculation
export type IBillingCalculation = {
  customer_id: number;
  billing_month: string;
  total_delivered: number;
  total_absent: number;
  total_extra: number;
  total_days: number;
  delivered_price: number;
  extra_price: number;
  base_amount: number;
  extra_amount: number;
  total_amount: number;
};

// Form Values
export type ICalendarEntryFormValues = {
  customer_id: number;
  order_id: number;
  delivery_date: string;
  status: CalendarEntryStatus;
  quantity: number;
  price: number;
  notes?: string;
};

// Redux State Types
export type IPaymentState = {
  isLoading: boolean;
  error: Error | string | null;
  calendarData: ICalendarGridData | null;
  monthlyBillings: IMonthlyBilling[];
  currentBilling: IMonthlyBilling | null;
  notifications: IPaymentNotification[];
  unreadCount: number;
  pricingRules: IPricingRule[];
};
