# Tiffin Management System API Documentation

## Overview

This document describes the API endpoints for the Tiffin (Meal Delivery) Management System. All endpoints follow RESTful conventions and return JSON responses.

## Base URL

```
http://localhost:3000/api
```

## Response Format

All API responses follow this standard format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## 1. Meal Plans API

### GET /api/meal-plans
Fetch all meal plans.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "meal_name": "Standard Lunch",
      "description": "Dal, Roti, Rice, Sabzi",
      "frequency": "Weekly",
      "days": "Mon-Fri",
      "price": 1500.00,
      "created_at": "2025-12-01T00:00:00.000Z",
      "updated_at": "2025-12-01T00:00:00.000Z"
    }
  ]
}
```

### POST /api/meal-plans
Create a new meal plan.

**Request Body:**
```json
{
  "meal_name": "Premium Lunch",
  "description": "Dal, Roti, Rice, Sabzi, Sweet",
  "frequency": "Weekly",
  "days": "Mon-Sat",
  "price": 2000.00
}
```

**Business Rule:** When `frequency` is "Daily", the `days` field is automatically set to "Single".

**Validation:**
- `meal_name`: Required, max 255 characters
- `frequency`: Required, must be one of: "Daily", "Weekly", "Monthly"
- `days`: Optional, must be one of: "Mon-Fri", "Mon-Sat", "Single"
- `price`: Required, must be positive

### GET /api/meal-plans/:id
Fetch a single meal plan by ID.

### PUT /api/meal-plans/:id
Update a meal plan.

**Request Body:** (All fields optional)
```json
{
  "meal_name": "Updated Meal Name",
  "description": "Updated description",
  "frequency": "Monthly",
  "days": "Mon-Sat",
  "price": 2500.00
}
```

### DELETE /api/meal-plans/:id
Delete a meal plan.

**Note:** Cannot delete a meal plan that is referenced in existing orders.

---

## 2. Customers API

### GET /api/customers
Fetch all customers.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Rajesh Kumar",
      "phone": "9876543210",
      "address": "123, MG Road, Bangalore",
      "created_at": "2025-12-01T00:00:00.000Z",
      "updated_at": "2025-12-01T00:00:00.000Z"
    }
  ]
}
```

### POST /api/customers
Create a new customer.

**Request Body:**
```json
{
  "name": "Priya Sharma",
  "phone": "9876543211",
  "address": "456, Park Street, Mumbai"
}
```

**Validation:**
- `name`: Required, max 255 characters
- `phone`: Optional, max 50 characters
- `address`: Required

### GET /api/customers/:id
Fetch a single customer by ID.

### PUT /api/customers/:id
Update a customer.

**Request Body:** (All fields optional)
```json
{
  "name": "Updated Name",
  "phone": "9999999999",
  "address": "Updated Address"
}
```

### DELETE /api/customers/:id
Delete a customer.

**Note:** Deletes all associated orders (CASCADE).

---

## 3. Customer Orders API

### GET /api/customer-orders
Fetch customer orders with filtering and pagination.

**Query Parameters:**
- `filter`: "monthly" | "all" (default: "all")
- `month`: YYYY-MM format (for monthly filter)
- `page`: number (default: 1)
- `limit`: number (default: 50)

**Example:**
```
GET /api/customer-orders?filter=monthly&month=2025-12&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 1,
        "customer_id": 1,
        "meal_plan_id": 1,
        "quantity": 2,
        "selected_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "price": 1500.00,
        "start_date": "2025-12-01",
        "end_date": "2025-12-31",
        "customer_name": "Rajesh Kumar",
        "customer_phone": "9876543210",
        "customer_address": "123, MG Road, Bangalore",
        "meal_plan_name": "Standard Lunch",
        "meal_plan_description": "Dal, Roti, Rice, Sabzi",
        "meal_plan_frequency": "Weekly",
        "meal_plan_days": "Mon-Fri"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

### POST /api/customer-orders
Create a new customer order.

**Request Body:**
```json
{
  "customer_id": 1,
  "meal_plan_id": 1,
  "quantity": 2,
  "selected_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "price": 1500.00,
  "start_date": "2025-12-01",
  "end_date": "2025-12-31"
}
```

**Validation:**
- `customer_id`: Required, must exist
- `meal_plan_id`: Required, must exist
- `quantity`: Required, minimum 1
- `selected_days`: Required, array of valid day names
- `price`: Required, must be positive
- `start_date`: Required, format YYYY-MM-DD
- `end_date`: Required, format YYYY-MM-DD, must be after start_date

**Day Names:** "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"

### GET /api/customer-orders/:id
Fetch a single customer order by ID.

### PUT /api/customer-orders/:id
Update a customer order.

**Request Body:** (All fields optional)
```json
{
  "customer_id": 2,
  "meal_plan_id": 2,
  "quantity": 3,
  "selected_days": ["Monday", "Wednesday", "Friday"],
  "price": 1800.00,
  "start_date": "2025-12-05",
  "end_date": "2025-12-25"
}
```

### DELETE /api/customer-orders/:id
Delete a customer order.

---

## 4. Tiffin Reports API

### GET /api/tiffin-reports/daily-count
Get daily tiffin count for operations.

**Query Parameters:**
- `date`: YYYY-MM-DD format (default: today)

**Example:**
```
GET /api/tiffin-reports/daily-count?date=2025-12-04
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2025-12-04",
    "orders": [
      {
        "customer_name": "Rajesh Kumar",
        "quantity": 2,
        "meal_plan_name": "Standard Lunch"
      },
      {
        "customer_name": "Priya Sharma",
        "quantity": 1,
        "meal_plan_name": "Premium Lunch"
      }
    ],
    "total_count": 3
  }
}
```

**Business Logic:**
- Only includes orders where the date falls within start_date and end_date
- Filters by selected_days (checks if the weekday matches)
- For Daily frequency meals, selected_days is empty array (all days included)

### GET /api/tiffin-reports/monthly-list
Get all tiffin orders for a specific month.

**Query Parameters:**
- `month`: YYYY-MM format (default: current month)

**Example:**
```
GET /api/tiffin-reports/monthly-list?month=2025-12
```

**Response:**
```json
{
  "success": true,
  "data": {
    "month": "2025-12",
    "orders": [ ... ],
    "total_orders": 15
  }
}
```

### GET /api/tiffin-reports/complete-list
Get all tiffin orders with search and pagination.

**Query Parameters:**
- `search`: Search term (searches customer name and meal plan name)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `sortBy`: Field to sort by (default: "created_at")
  - Options: "created_at", "start_date", "end_date", "customer_name", "meal_plan_name", "price", "quantity"
- `sortOrder`: "asc" | "desc" (default: "desc")

**Example:**
```
GET /api/tiffin-reports/complete-list?search=Rajesh&page=1&limit=20&sortBy=start_date&sortOrder=desc
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    },
    "filters": {
      "search": "Rajesh",
      "sortBy": "start_date",
      "sortOrder": "desc"
    }
  }
}
```

---

## Database Schema

### meal_plans
```sql
CREATE TABLE meal_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meal_name VARCHAR(255) NOT NULL,
  description TEXT,
  frequency ENUM('Daily', 'Weekly', 'Monthly') NOT NULL,
  days ENUM('Mon-Fri', 'Mon-Sat', 'Single') DEFAULT 'Single',
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### customers
```sql
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### customer_orders
```sql
CREATE TABLE customer_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  meal_plan_id INT NOT NULL,
  quantity INT NOT NULL CHECK (quantity >= 1),
  selected_days JSON NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE RESTRICT,
  CHECK (end_date > start_date)
);
```

---

## Error Codes

- **200**: Success (GET, PUT, DELETE)
- **201**: Created (POST)
- **400**: Bad Request (validation errors)
- **404**: Not Found (resource doesn't exist)
- **405**: Method Not Allowed
- **409**: Conflict (e.g., cannot delete meal plan in use)
- **500**: Internal Server Error

---

## Installation & Setup

1. Run the database migration:
```bash
mysql -u root -p tms_db < database/migrations/001_create_tiffin_management_tables.sql
```

2. Start the backend server:
```bash
cd Backend
npm run dev
```

3. API will be available at `http://localhost:3000/api`

---

## Frontend Implementation Notes

For each page mentioned in the requirements:

### 1. Meal Plan Management Page
- **API Endpoint**: `/api/meal-plans`
- **Methods**: GET (list), POST (create)
- **Business Logic**: When "Daily" frequency is selected, automatically set days to "Single"

### 2. Customer Management Page
- **API Endpoint**: `/api/customers`
- **Methods**: GET (list), POST (create)

### 3. Customer Tiffin Order Page
- **API Endpoints**:
  - `/api/customers` (to populate customer dropdown)
  - `/api/meal-plans` (to populate meal plan dropdown)
  - `/api/customer-orders` (to create order)
- **Business Logic**:
  - Pre-populate selected_days based on meal plan's days field
  - Pre-fill price from meal plan
  - Validate end_date > start_date

### 4. Monthly Tiffin Management List Page
- **API Endpoint**: `/api/tiffin-reports/monthly-list?month=YYYY-MM`
- **Features**: Filter by current month, sortable table

### 5. Complete Tiffin Management List Page
- **API Endpoint**: `/api/tiffin-reports/complete-list`
- **Features**: Search, pagination, sorting

### 6. Daily Tiffin Count Page
- **API Endpoint**: `/api/tiffin-reports/daily-count?date=YYYY-MM-DD`
- **Features**: Display today's orders with total count

---

## Testing Examples

### Create a Meal Plan
```bash
curl -X POST http://localhost:3000/api/meal-plans \
  -H "Content-Type: application/json" \
  -d '{
    "meal_name": "Breakfast Special",
    "description": "Idli, Vada, Sambar",
    "frequency": "Daily",
    "price": 50.00
  }'
```

### Create a Customer
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "9876543210",
    "address": "123 Main Street, City"
  }'
```

### Create an Order
```bash
curl -X POST http://localhost:3000/api/customer-orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "meal_plan_id": 1,
    "quantity": 2,
    "selected_days": ["Monday", "Wednesday", "Friday"],
    "price": 1500.00,
    "start_date": "2025-12-01",
    "end_date": "2025-12-31"
  }'
```

### Get Daily Count
```bash
curl http://localhost:3000/api/tiffin-reports/daily-count?date=2025-12-04
```

---

## Notes

1. All timestamps are in UTC
2. Date format is YYYY-MM-DD for start_date and end_date
3. Month format is YYYY-MM for monthly reports
4. selected_days is stored as JSON array in database
5. Price is stored as DECIMAL(10, 2)
6. Foreign key constraints ensure data integrity
7. CASCADE delete on customers removes their orders
8. RESTRICT delete on meal_plans prevents deletion if orders exist
