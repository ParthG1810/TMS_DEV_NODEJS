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
  payment_id?: number;
  payment_status: PaymentStatus;
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
  customer_id: number;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  quantity: number;
  meal_plan_name: string;
  print_order: number;
}

/**
 * Daily tiffin summary
 */
export interface DailyTiffinSummary {
  date: string; // YYYY-MM-DD format
  orders: DailyTiffinCount[];
  total_count: number;
}

// ----------------------------------------------------------------------
// PAYMENT MANAGEMENT TYPES
// ----------------------------------------------------------------------

/**
 * Payment status enum
 * Flow: calculating → pending → finalized → paid/partial_paid
 */
export type PaymentStatus = 'calculating' | 'pending' | 'finalized' | 'paid' | 'partial_paid';

/**
 * Calendar entry status enum
 * T = Tiffin Delivered
 * A = Absent/Cancelled
 * E = Extra Tiffin
 */
export type CalendarEntryStatus = 'T' | 'A' | 'E';

/**
 * Billing status enum
 * Flow: calculating → pending → finalized → paid/partial_paid
 */
export type BillingStatus = 'calculating' | 'pending' | 'finalized' | 'paid' | 'partial_paid';

/**
 * Notification type enum
 */
export type NotificationType = 'month_end_calculation' | 'payment_received' | 'payment_overdue';

/**
 * Notification priority enum
 */
export type NotificationPriority = 'low' | 'medium' | 'high';

/**
 * Tiffin Calendar Entry entity from database
 */
export interface TiffinCalendarEntry {
  id: number;
  customer_id: number;
  order_id: number;
  delivery_date: string; // YYYY-MM-DD format
  status: CalendarEntryStatus;
  quantity: number;
  price: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Monthly Billing entity from database
 */
export interface MonthlyBilling {
  id: number;
  customer_id: number;
  billing_month: string; // YYYY-MM format
  total_delivered: number;
  total_absent: number;
  total_extra: number;
  total_days: number;
  base_amount: number;
  extra_amount: number;
  total_amount: number;
  status: BillingStatus;
  calculated_at?: Date;
  finalized_at?: Date;
  finalized_by?: string;
  paid_at?: Date;
  payment_method?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Payment Notification entity from database
 */
export interface PaymentNotification {
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
  created_at: Date;
  read_at?: Date;
  dismissed_at?: Date;
}

/**
 * Payment History entity from database
 */
export interface PaymentHistory {
  id: number;
  billing_id: number;
  customer_id: number;
  amount: number;
  payment_method: string;
  payment_date: string; // YYYY-MM-DD format
  transaction_id?: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Pricing Rule entity from database
 */
export interface PricingRule {
  id: number;
  meal_plan_id?: number;
  rule_name: string;
  delivered_price: number;
  extra_price: number;
  is_default: boolean;
  effective_from: string; // YYYY-MM-DD format
  effective_to?: string; // YYYY-MM-DD format
  created_at: Date;
  updated_at: Date;
}

/**
 * Request body for creating a calendar entry
 */
export interface CreateCalendarEntryRequest {
  customer_id: number;
  order_id: number;
  delivery_date: string; // YYYY-MM-DD format
  status: CalendarEntryStatus;
  quantity?: number;
  price?: number;
  notes?: string;
}

/**
 * Request body for updating a calendar entry
 */
export interface UpdateCalendarEntryRequest {
  status?: CalendarEntryStatus;
  quantity?: number;
  price?: number;
  notes?: string;
}

/**
 * Request body for batch updating calendar entries
 */
export interface BatchUpdateCalendarEntriesRequest {
  entries: {
    delivery_date: string;
    status: CalendarEntryStatus;
    quantity?: number;
    price?: number;
  }[];
  customer_id: number;
  order_id: number;
}

/**
 * Request body for finalizing monthly billing
 */
export interface FinalizeBillingRequest {
  billing_id: number;
  finalized_by: string;
  notes?: string;
}

/**
 * Request body for recording payment
 */
export interface RecordPaymentRequest {
  billing_id: number;
  amount: number;
  payment_method: string;
  payment_date: string; // YYYY-MM-DD format
  transaction_id?: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
}

/**
 * Calendar entry with customer and order details (joined data)
 */
export interface CalendarEntryWithDetails extends TiffinCalendarEntry {
  customer_name: string;
  customer_phone?: string;
  meal_plan_id: number;
  meal_plan_name: string;
}

/**
 * Monthly billing with customer details (joined data)
 */
export interface MonthlyBillingWithDetails extends MonthlyBilling {
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
}

/**
 * Payment notification with customer details (joined data)
 */
export interface PaymentNotificationWithDetails extends PaymentNotification {
  customer_name?: string;
}

/**
 * Monthly calendar data for a customer
 */
export interface MonthlyCalendarData {
  customer_id: number;
  customer_name: string;
  billing_month: string; // YYYY-MM format
  entries: TiffinCalendarEntry[];
  billing?: MonthlyBilling;
  active_orders: CustomerOrder[];
}

/**
 * Calendar grid data for the frontend
 */
export interface CalendarGridData {
  year: number;
  month: number;
  customers: {
    customer_id: number;
    customer_name: string;
    customer_phone?: string;
    entries: {
      [date: string]: CalendarEntryStatus | null; // date in format 'YYYY-MM-DD'
    };
    total_delivered: number;
    total_absent: number;
    total_extra: number;
    total_amount: number;
    billing_status: BillingStatus;
    billing_id?: number;
    orders?: Array<{
      id: number;
      start_date: string;
      end_date: string;
      selected_days?: string[];
      meal_plan_name?: string;
    }>;
  }[];
}

/**
 * Billing calculation result
 */
export interface BillingCalculation {
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
}

// ----------------------------------------------------------------------
// PAYMENT WORKFLOW TYPES (Gmail Integration, Interac, Payments)
// ----------------------------------------------------------------------

/**
 * Gmail OAuth Settings entity
 */
export interface GmailOAuthSettings {
  id: number;
  account_name: string;
  email_address: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  last_sync_email_id?: string;
  last_sync_email_date?: Date;
  last_sync_email_subject?: string;
  last_sync_at?: Date;
  sync_enabled: boolean;
  is_active: boolean;
  created_at: Date;
  created_by?: number;
  updated_at: Date;
}

/**
 * Interac Transaction status enum
 */
export type InteracTransactionStatus = 'pending' | 'allocated' | 'ignored' | 'deleted';

/**
 * Interac Transaction entity
 */
export interface InteracTransaction {
  id: number;
  gmail_settings_id: number;
  gmail_message_id: string;
  email_date: Date;
  sender_name: string;
  reference_number: string;
  amount: number;
  currency: string;
  raw_email_body?: string;
  auto_matched_customer_id?: number;
  confirmed_customer_id?: number;
  match_confidence: number;
  status: InteracTransactionStatus;
  created_at: Date;
  updated_at: Date;
  deleted_flag: boolean;
  deleted_at?: Date;
  deleted_by?: number;
}

/**
 * Interac Transaction with customer details
 */
export interface InteracTransactionWithDetails extends InteracTransaction {
  auto_matched_customer_name?: string;
  confirmed_customer_name?: string;
}

/**
 * Customer Name Alias entity
 */
export interface CustomerNameAlias {
  id: number;
  customer_id: number;
  alias_name: string;
  source: 'manual' | 'learned';
  created_at: Date;
  created_by?: number;
}

/**
 * Payment type enum
 */
export type PaymentType = 'online' | 'cash';

/**
 * Allocation status enum
 */
export type AllocationStatus = 'unallocated' | 'partial' | 'fully_allocated' | 'has_excess';

/**
 * Payment Record entity
 */
export interface PaymentRecord {
  id: number;
  payment_type: PaymentType;
  payment_source?: string;
  interac_transaction_id?: number;
  customer_id?: number;
  payer_name?: string;
  payment_date: string;
  amount: number;
  reference_number?: string;
  notes?: string;
  total_allocated: number;
  excess_amount: number;
  allocation_status: AllocationStatus;
  created_at: Date;
  created_by?: number;
  updated_at: Date;
  updated_by?: number;
  deleted_flag: boolean;
  deleted_at?: Date;
  deleted_by?: number;
  delete_reason?: string;
}

/**
 * Payment Record with details
 */
export interface PaymentRecordWithDetails extends PaymentRecord {
  customer_name?: string;
  allocations?: PaymentAllocation[];
}

/**
 * Payment Allocation entity
 */
export interface PaymentAllocation {
  id: number;
  payment_record_id: number;
  billing_id: number;
  customer_id: number;
  allocation_order: number;
  allocated_amount: number;
  invoice_balance_before: number;
  invoice_balance_after: number;
  resulting_status: 'partial_paid' | 'paid';
  created_at: Date;
  created_by?: number;
  deleted_flag: boolean;
  deleted_at?: Date;
  deleted_by?: number;
}

/**
 * Payment Allocation with details
 */
export interface PaymentAllocationWithDetails extends PaymentAllocation {
  billing_month?: string;
  customer_name?: string;
}

/**
 * Customer Credit status enum
 */
export type CustomerCreditStatus = 'available' | 'used' | 'refunded' | 'expired';

/**
 * Customer Credit entity
 */
export interface CustomerCredit {
  id: number;
  customer_id: number;
  payment_record_id: number;
  original_amount: number;
  current_balance: number;
  status: CustomerCreditStatus;
  created_at: Date;
  updated_at: Date;
  notes?: string;
}

/**
 * Customer Credit with details
 */
export interface CustomerCreditWithDetails extends CustomerCredit {
  customer_name?: string;
  payment_date?: string;
}

/**
 * Customer Credit Usage entity
 */
export interface CustomerCreditUsage {
  id: number;
  credit_id: number;
  billing_id: number;
  amount_used: number;
  used_at: Date;
  used_by?: number;
}

/**
 * Refund source type enum
 */
export type RefundSourceType = 'credit' | 'payment';

/**
 * Refund method enum
 */
export type RefundMethod = 'interac' | 'cash' | 'cheque' | 'other';

/**
 * Refund status enum
 */
export type RefundStatus = 'pending' | 'completed' | 'cancelled';

/**
 * Refund Record entity
 */
export interface RefundRecord {
  id: number;
  source_type: RefundSourceType;
  credit_id?: number;
  payment_record_id?: number;
  customer_id: number;
  refund_amount: number;
  refund_method: RefundMethod;
  refund_date: string;
  reference_number?: string;
  reason: string;
  status: RefundStatus;
  requested_by: number;
  approved_by?: number;
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_flag: boolean;
  deleted_at?: Date;
  deleted_by?: number;
}

/**
 * Refund Record with details
 */
export interface RefundRecordWithDetails extends RefundRecord {
  customer_name?: string;
  requested_by_name?: string;
  approved_by_name?: string;
}

/**
 * User Role enum
 */
export type UserRole = 'admin' | 'manager' | 'staff' | 'viewer';

/**
 * User Role entity
 */
export interface UserRoleRecord {
  id: number;
  user_id: string;
  email?: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

/**
 * Delete Authorization Log entity
 */
export interface DeleteAuthorizationLog {
  id: number;
  user_id: string;
  user_email?: string;
  table_name: string;
  record_id: number;
  action_type: 'soft_delete' | 'restore';
  password_verified: boolean;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

/**
 * Extended Payment Notification types
 */
export type ExtendedNotificationType =
  | 'month_end_calculation'
  | 'payment_received'
  | 'payment_overdue'
  | 'billing_pending_approval'
  | 'interac_received'
  | 'payment_allocated'
  | 'invoice_paid'
  | 'excess_payment'
  | 'refund_request'
  | 'refund_completed'
  | 'refund_cancelled';

// ----------------------------------------------------------------------
// PAYMENT WORKFLOW REQUEST TYPES
// ----------------------------------------------------------------------

/**
 * Request body for creating a cash payment
 */
export interface CreateCashPaymentRequest {
  customer_id: number;
  payer_name?: string;
  amount: number;
  payment_date: string;
  notes?: string;
}

/**
 * Request body for allocating a payment to invoices
 */
export interface AllocatePaymentRequest {
  payment_record_id: number;
  billing_ids: number[];  // Array of billing IDs in order
}

/**
 * Request body for confirming a customer match
 */
export interface ConfirmCustomerMatchRequest {
  interac_transaction_id: number;
  customer_id: number;
}

/**
 * Request body for creating a refund
 */
export interface CreateRefundRequest {
  source_type: RefundSourceType;
  credit_id?: number;
  payment_record_id?: number;
  customer_id: number;
  refund_amount: number;
  refund_method: RefundMethod;
  refund_date: string;
  reference_number?: string;
  reason: string;
}

/**
 * Request body for soft delete with password confirmation
 */
export interface SoftDeleteRequest {
  password: string;
  reason?: string;
}

/**
 * Monthly billing with balance (for allocation UI)
 */
export interface MonthlyBillingWithBalance extends MonthlyBilling {
  amount_paid: number;
  credit_applied: number;
  balance_due: number;
  last_payment_date?: string;
  payment_count: number;
  customer_name?: string;
  customer_phone?: string;
}

// ----------------------------------------------------------------------
// LABEL PRINTING SYSTEM TYPES
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
  dpi: number;                    // 300 for GX430d
  mediaType: MediaType;
  printSpeed: number;             // inches per second (1-4)
  darkness: number;               // 0-30, default 15
  labelTop: number;               // vertical offset
  labelShift: number;             // horizontal offset
  printMethod: PrintMethod;
}

/**
 * Custom placeholder definition
 */
export interface CustomPlaceholder {
  key: string;                    // e.g., "routeNumber"
  defaultValue: string;           // e.g., "R1"
  description: string;            // e.g., "Route number for delivery"
}

/**
 * Label Template entity from database
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
  created_at: Date;
  updated_at: Date;
}

/**
 * Customer Print Order entity from database
 */
export interface CustomerPrintOrder {
  id: number;
  customer_id: number;
  print_order: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Customer with print order (joined data)
 */
export interface CustomerWithPrintOrder extends Customer {
  print_order: number;
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
 * System placeholders available for labels
 */
export const SYSTEM_PLACEHOLDERS = [
  { key: 'customerName', description: 'Customer full name', example: 'Parthkumar Patel' },
  { key: 'customerAddress', description: 'Delivery address', example: '333 Main Avenue' },
  { key: 'customerPhone', description: 'Phone number', example: '(555) 123-4567' },
  { key: 'deliveryDate', description: 'Delivery date', example: 'Dec 25, 2025' },
  { key: 'orderQuantity', description: 'Number of tiffins', example: '2' },
  { key: 'mealPlanName', description: 'Meal plan type', example: 'Daily Lunch' },
  { key: 'currentDate', description: "Today's date", example: 'Dec 25, 2025' },
  { key: 'serialNumber', description: 'Print serial #', example: '001' },
] as const;

/**
 * Preset label sizes for Zebra GX430d
 */
export const PRESET_LABEL_SIZES = [
  { name: '4" x 6" (Shipping)', width: 4.00, height: 6.00 },
  { name: '4" x 3" (Large)', width: 4.00, height: 3.00 },
  { name: '4" x 2" (Standard)', width: 4.00, height: 2.00 },
  { name: '4" x 1" (Slim)', width: 4.00, height: 1.00 },
  { name: '3" x 2" (Medium)', width: 3.00, height: 2.00 },
  { name: '2.25" x 1.25" (Small)', width: 2.25, height: 1.25 },
  { name: '2" x 1" (Mini)', width: 2.00, height: 1.00 },
] as const;

/**
 * Recommended fonts for thermal printing at 300 DPI
 */
export const RECOMMENDED_FONTS = [
  { name: 'Arial', reason: 'Clear at all sizes' },
  { name: 'Verdana', reason: 'Excellent readability' },
  { name: 'Roboto', reason: 'Modern, clean' },
  { name: 'OCR-A', reason: 'For barcodes/scanning' },
] as const;

/**
 * Font size presets for label editor toolbar
 */
export const FONT_SIZE_PRESETS = [
  { label: '8pt', value: '8pt', useCase: 'Fine print' },
  { label: '10pt', value: '10pt', useCase: 'Secondary info' },
  { label: '12pt', value: '12pt', useCase: 'Body text' },
  { label: '14pt', value: '14pt', useCase: 'Emphasis' },
  { label: '18pt', value: '18pt', useCase: 'Headers' },
  { label: '24pt', value: '24pt', useCase: 'Large titles' },
] as const;

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
export const KEYBOARD_SHORTCUTS = {
  'Ctrl+S': 'Save template',
  'Ctrl+Z': 'Undo',
  'Ctrl+Y': 'Redo',
  'Ctrl+P': 'Print preview',
  'Ctrl+D': 'Duplicate template',
  'Escape': 'Cancel editing',
} as const;
