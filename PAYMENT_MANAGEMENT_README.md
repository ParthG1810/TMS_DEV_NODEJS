# Payment Management Feature - Complete Documentation

## Overview

This document provides comprehensive documentation for the Payment Management feature added to the Tiffin Management System (TMS). This feature enables restaurant/catering businesses to track daily tiffin deliveries, calculate monthly billing, and manage customer payments efficiently.

## Table of Contents

1. [Feature Summary](#feature-summary)
2. [Database Schema](#database-schema)
3. [Backend APIs](#backend-apis)
4. [Frontend Components](#frontend-components)
5. [User Workflow](#user-workflow)
6. [Installation & Setup](#installation--setup)
7. [Usage Guide](#usage-guide)
8. [Technical Details](#technical-details)

---

## Feature Summary

The Payment Management feature includes:

### ✅ Monthly Billing Calendar
- Interactive calendar grid showing all customers
- Daily tiffin status tracking (T/A/E)
- Real-time monthly cost calculation
- Month-to-month navigation

### ✅ Calendar Entry Management
- **T** - Tiffin Delivered (Green)
- **A** - Absent/Cancelled (Gray)
- **E** - Extra Tiffin (Blue)
- Click to cycle through statuses
- Automatic price calculation

### ✅ Payment Workflow
1. Mark daily tiffin status on calendar
2. System auto-calculates monthly billing
3. Admin verifies and finalizes billing
4. Status changes to "pending payment"
5. Payment tracking and history

### ✅ Additional Features
- Calculate buttons in Order Lists
- Single customer billing view
- In-app notifications for billing alerts
- Pricing rules management
- Payment history tracking

---

## Database Schema

### Tables Created

#### 1. **tiffin_calendar_entries**
Tracks daily tiffin delivery status for each customer.

```sql
- id (INT, PK, Auto-increment)
- customer_id (INT, FK → customers)
- order_id (INT, FK → customer_orders)
- delivery_date (DATE)
- status (ENUM: 'T', 'A', 'E')
- quantity (INT)
- price (DECIMAL 10,2)
- notes (TEXT, nullable)
- created_at, updated_at (TIMESTAMPS)

Unique: (customer_id, delivery_date)
Indexes: customer_date, order_id, delivery_date, status
```

#### 2. **monthly_billing**
Stores calculated monthly bills for each customer.

```sql
- id (INT, PK, Auto-increment)
- customer_id (INT, FK → customers)
- billing_month (VARCHAR 7, Format: 'YYYY-MM')
- total_delivered (INT)
- total_absent (INT)
- total_extra (INT)
- total_days (INT)
- base_amount (DECIMAL 10,2)
- extra_amount (DECIMAL 10,2)
- total_amount (DECIMAL 10,2)
- status (ENUM: 'calculating', 'pending', 'finalized', 'paid')
- calculated_at, finalized_at, paid_at (TIMESTAMPS)
- finalized_by, payment_method (VARCHAR)
- notes (TEXT)
- created_at, updated_at (TIMESTAMPS)

Unique: (customer_id, billing_month)
Indexes: customer_month, billing_month, status
```

#### 3. **payment_notifications**
Tracks notifications sent to admin for payment verification.

```sql
- id (INT, PK, Auto-increment)
- notification_type (ENUM: 'month_end_calculation', 'payment_received', 'payment_overdue')
- billing_id (INT, FK → monthly_billing)
- customer_id (INT, FK → customers)
- billing_month (VARCHAR 7)
- title, message (VARCHAR/TEXT)
- is_read, is_dismissed (BOOLEAN)
- priority (ENUM: 'low', 'medium', 'high')
- action_url (VARCHAR 500)
- created_at, read_at, dismissed_at (TIMESTAMPS)

Indexes: is_read, billing_id, created_at, notification_type, priority
```

#### 4. **payment_history**
Tracks all payment transactions.

```sql
- id (INT, PK, Auto-increment)
- billing_id (INT, FK → monthly_billing)
- customer_id (INT, FK → customers)
- amount (DECIMAL 10,2)
- payment_method (VARCHAR 50)
- payment_date (DATE)
- transaction_id, reference_number (VARCHAR 100)
- notes (TEXT)
- created_by (VARCHAR 100)
- created_at, updated_at (TIMESTAMPS)

Indexes: billing_id, customer_id, payment_date, transaction_id
```

#### 5. **pricing_rules**
Stores pricing rules for different tiffin types.

```sql
- id (INT, PK, Auto-increment)
- meal_plan_id (INT, FK → meal_plans, nullable)
- rule_name (VARCHAR 255)
- delivered_price (DECIMAL 10,2)
- extra_price (DECIMAL 10,2)
- is_default (BOOLEAN)
- effective_from, effective_to (DATE)
- created_at, updated_at (TIMESTAMPS)

Indexes: meal_plan_id, effective_dates, is_default
Default Rule: delivered_price = ₹50.00, extra_price = ₹60.00
```

### Database Updates

#### **customer_orders** table (modified)
```sql
ALTER TABLE customer_orders
ADD COLUMN payment_id INT NULL,
ADD COLUMN payment_status ENUM('pending', 'received', 'calculating') DEFAULT 'calculating';
```

### Database Views

#### **v_monthly_billing_summary**
Monthly billing with customer details.

#### **v_calendar_entries_detail**
Calendar entries with customer and order details.

#### **v_unread_notifications**
Unread payment notifications.

### Stored Procedures

#### **sp_calculate_monthly_billing(customer_id, billing_month)**
Automatically calculates monthly billing based on calendar entries.

- Counts T/A/E entries for the month
- Calculates base_amount (T * delivered_price)
- Calculates extra_amount (E * extra_price)
- Inserts/updates monthly_billing record
- Called automatically via triggers

### Database Triggers

#### **tr_calendar_entry_after_insert**
Auto-calculates billing when calendar entry is created.

#### **tr_calendar_entry_after_update**
Auto-recalculates billing when calendar entry is updated.

#### **tr_calendar_entry_after_delete**
Auto-recalculates billing when calendar entry is deleted.

---

## Backend APIs

### Base URL: `/api`

### 1. Calendar Entries API

#### **GET /api/calendar-entries**
Get calendar entries with optional filtering.

**Query Parameters:**
- `customer_id` (number, optional)
- `month` (string, YYYY-MM, optional)
- `start_date` (string, YYYY-MM-DD, optional)
- `end_date` (string, YYYY-MM-DD, optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": 5,
      "order_id": 10,
      "delivery_date": "2023-12-15",
      "status": "T",
      "quantity": 1,
      "price": 50.00,
      "customer_name": "John Doe",
      "meal_plan_name": "Lunch Box"
    }
  ]
}
```

#### **POST /api/calendar-entries**
Create or update a calendar entry.

**Request Body:**
```json
{
  "customer_id": 5,
  "order_id": 10,
  "delivery_date": "2023-12-15",
  "status": "T",
  "quantity": 1,
  "price": 50.00
}
```

**Response:** Returns created entry with details.

#### **PUT /api/calendar-entries**
Batch update calendar entries.

**Request Body:**
```json
{
  "customer_id": 5,
  "order_id": 10,
  "entries": [
    {
      "delivery_date": "2023-12-15",
      "status": "T",
      "quantity": 1,
      "price": 50.00
    },
    {
      "delivery_date": "2023-12-16",
      "status": "A"
    }
  ]
}
```

#### **GET /api/calendar-entries/:id**
Get single calendar entry by ID.

#### **PUT /api/calendar-entries/:id**
Update calendar entry.

**Request Body:**
```json
{
  "status": "E",
  "quantity": 2,
  "price": 60.00,
  "notes": "Extra tiffin requested"
}
```

#### **DELETE /api/calendar-entries/:id**
Delete calendar entry.

---

### 2. Monthly Billing API

#### **GET /api/monthly-billing**
Get monthly billing data.

**Query Parameters:**
- `month` (string, YYYY-MM, optional)
- `customer_id` (number, optional)
- `format` ('list' | 'grid', default: 'list')

**Response (list format):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": 5,
      "customer_name": "John Doe",
      "billing_month": "2023-12",
      "total_delivered": 20,
      "total_absent": 3,
      "total_extra": 2,
      "base_amount": 1000.00,
      "extra_amount": 120.00,
      "total_amount": 1120.00,
      "status": "pending"
    }
  ]
}
```

**Response (grid format):**
```json
{
  "success": true,
  "data": {
    "year": 2023,
    "month": 12,
    "customers": [
      {
        "customer_id": 5,
        "customer_name": "John Doe",
        "entries": {
          "2023-12-01": "T",
          "2023-12-02": "A",
          "2023-12-03": "E"
        },
        "total_delivered": 20,
        "total_absent": 3,
        "total_extra": 2,
        "total_amount": 1120.00,
        "billing_status": "pending",
        "billing_id": 1
      }
    ]
  }
}
```

#### **POST /api/monthly-billing**
Calculate monthly billing for a customer.

**Request Body:**
```json
{
  "customer_id": 5,
  "billing_month": "2023-12"
}
```

**Response:** Returns calculated billing record.

#### **GET /api/monthly-billing/:id**
Get billing by ID with customer details.

#### **PUT /api/monthly-billing/:id**
Update or finalize billing.

**Finalize Billing:**
```json
{
  "action": "finalize",
  "billing_id": 1,
  "finalized_by": "admin",
  "notes": "Verified and approved"
}
```

**Update Billing:**
```json
{
  "status": "paid",
  "notes": "Payment received"
}
```

#### **DELETE /api/monthly-billing/:id**
Delete billing record.

---

### 3. Payment Notifications API

#### **GET /api/payment-notifications**
Get payment notifications.

**Query Parameters:**
- `unread_only` (boolean, default: false)
- `limit` (number, default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "notification_type": "month_end_calculation",
      "title": "Billing Finalized - 2023-12",
      "message": "Monthly billing has been finalized. Total amount: ₹1120.00",
      "priority": "high",
      "is_read": false,
      "customer_name": "John Doe",
      "action_url": "/dashboard/tiffin/billing/1"
    }
  ]
}
```

#### **POST /api/payment-notifications**
Create a notification.

#### **GET /api/payment-notifications/:id**
Get notification by ID.

#### **PUT /api/payment-notifications/:id**
Mark as read or dismissed.

**Request Body:**
```json
{
  "is_read": true
}
```

#### **DELETE /api/payment-notifications/:id**
Delete notification.

---

### 4. Pricing Rules API

#### **GET /api/pricing-rules**
Get pricing rules.

**Query Parameters:**
- `is_default` (boolean, optional)
- `meal_plan_id` (number, optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "rule_name": "Default Pricing",
      "delivered_price": 50.00,
      "extra_price": 60.00,
      "is_default": true,
      "effective_from": "2023-01-01"
    }
  ]
}
```

#### **POST /api/pricing-rules**
Create pricing rule.

**Request Body:**
```json
{
  "rule_name": "Premium Pricing",
  "delivered_price": 70.00,
  "extra_price": 85.00,
  "is_default": false,
  "effective_from": "2024-01-01"
}
```

---

## Frontend Components

### Pages

#### **1. Monthly Billing Calendar Page**
**Location:** `/Frontend/src/pages/dashboard/tiffin/billing-calendar.tsx`

**Features:**
- Month/Year navigation
- Summary statistics (customers, total amount, status counts)
- Legend for T/A/E statuses
- Finalize All button
- Filter by customer (via query params)

**URL Parameters:**
- `customer_id` (optional) - Filter to single customer
- `month` (optional) - Select specific month (YYYY-MM)

**Example URLs:**
```
/dashboard/tiffin/billing-calendar
/dashboard/tiffin/billing-calendar?month=2023-12
/dashboard/tiffin/billing-calendar?customer_id=5&month=2023-12
```

### Components

#### **2. CalendarGrid Component**
**Location:** `/Frontend/src/sections/@dashboard/tiffin/billing/CalendarGrid.tsx`

**Props:**
```typescript
{
  year: number;
  month: number; // 1-12
  customers: ICalendarCustomerData[];
  onUpdate: () => void;
}
```

**Features:**
- Sticky customer name column (left)
- Sticky summary column (right)
- Sticky header row
- Interactive day cells (click to cycle T → A → E → null)
- Weekend highlighting
- Real-time totals per customer
- Finalize button per customer
- Status badges

**Cell Colors:**
- **T** - Green (success.main)
- **A** - Gray (grey.400)
- **E** - Blue (info.main)
- **Empty** - Transparent (or light gray for weekends)

#### **3. OrderTableRow (Enhanced)**
**Location:** `/Frontend/src/sections/@dashboard/tiffin/order/list/OrderTableRow.tsx`

**Added Features:**
- Calculate button in actions menu
- Redirects to billing calendar filtered by customer
- Shows calculator icon

---

## User Workflow

### Complete Payment Management Workflow

#### Step 1: Daily Tiffin Tracking
1. Navigate to **Billing Calendar** (`/dashboard/tiffin/billing-calendar`)
2. Select current month (or navigate to desired month)
3. For each customer, click on date cells to mark:
   - **T** - Tiffin delivered (normal delivery)
   - **A** - Customer absent/cancelled
   - **E** - Extra tiffin requested
4. System automatically calculates monthly totals in real-time

#### Step 2: Month-End Calculation
1. At month end, review all customer entries
2. Check the summary statistics at top:
   - Total customers
   - Total billing amount
   - Calculating/Finalized counts
3. Verify each customer's totals in the Summary column

#### Step 3: Finalize Billing
**Option A - Finalize All:**
1. Click **Finalize All** button (top right)
2. System finalizes all customers with "calculating" status
3. Status changes to "pending"
4. Notifications created for admin

**Option B - Finalize Individual:**
1. Scroll to specific customer row
2. Click **Finalize** button in Summary column
3. Status changes to "pending" for that customer
4. Notification created

#### Step 4: Payment Collection
1. When payment is received, mark billing as "paid" (future enhancement)
2. Record payment details in payment history
3. Generate receipt/invoice

#### Alternative: Single Customer Billing
1. Go to **Tiffin Orders** list (`/dashboard/tiffin/orders`)
2. Find customer's order
3. Click **Actions (...)** → **Calculate**
4. Redirected to billing calendar filtered for that customer
5. Mark entries and finalize as needed

---

## Installation & Setup

### 1. Database Migration

Run the migration to create all required tables:

```bash
mysql -u your_username -p your_database < database/migrations/002_create_payment_management_tables.sql
```

**This migration creates:**
- 5 new tables
- 3 database views
- 1 stored procedure
- 3 triggers
- Default pricing rule (₹50 delivered, ₹60 extra)

**Verification:**
```sql
-- Check tables
SHOW TABLES LIKE '%billing%';
SHOW TABLES LIKE '%calendar%';
SHOW TABLES LIKE '%payment%';
SHOW TABLES LIKE '%pricing%';

-- Check default pricing
SELECT * FROM pricing_rules WHERE is_default = TRUE;

-- Check triggers
SHOW TRIGGERS LIKE 'tiffin_calendar_entries';

-- Check stored procedure
SHOW PROCEDURE STATUS WHERE Name = 'sp_calculate_monthly_billing';
```

### 2. Backend Setup

All backend APIs are automatically available once the database is set up.

**Backend files added:**
```
Backend/
├── pages/api/
│   ├── calendar-entries/
│   │   ├── index.ts
│   │   └── [id].ts
│   ├── monthly-billing/
│   │   ├── index.ts
│   │   └── [id].ts
│   ├── payment-notifications/
│   │   ├── index.ts
│   │   └── [id].ts
│   └── pricing-rules/
│       └── index.ts
└── src/types/index.ts (updated)
```

### 3. Frontend Setup

**Files added:**
```
Frontend/
├── src/
│   ├── pages/dashboard/tiffin/
│   │   └── billing-calendar.tsx
│   ├── sections/@dashboard/tiffin/
│   │   └── billing/
│   │       ├── CalendarGrid.tsx
│   │       └── index.ts
│   ├── redux/slices/
│   │   └── payment.ts
│   ├── redux/
│   │   └── rootReducer.ts (updated)
│   └── @types/
│       └── tms.ts (updated)
```

**No additional npm packages required** - uses existing dependencies.

### 4. Navigation Setup (Optional)

Add link to navigation menu in `/Frontend/src/layouts/dashboard/nav/config.tsx`:

```typescript
{
  title: 'Billing Calendar',
  path: '/dashboard/tiffin/billing-calendar',
  icon: ICONS.calendar,
}
```

---

## Usage Guide

### For Administrators

#### Daily Operations
1. **Morning:** Mark deliveries as they go out (T)
2. **During Day:** Mark absences (A) or extra orders (E)
3. **Evening:** Review day's entries for accuracy

#### Monthly Operations
1. **Last Day of Month:**
   - Review entire month's calendar
   - Verify all entries are marked correctly
   - Check totals match delivery records

2. **First Day of New Month:**
   - Click "Finalize All" for previous month
   - Review notifications
   - Generate invoices/bills for customers

3. **Payment Collection:**
   - Mark billings as "paid" when received
   - Record payment method and transaction details

#### Reporting
- Use the monthly billing API to generate reports
- Export data for accounting software
- Track payment histories

### For Developers

#### Extending the Feature

**Add New Status Types:**
1. Update database ENUM in migration
2. Update TypeScript types (`CalendarEntryStatus`)
3. Add color mapping in `CalendarGrid.tsx`
4. Update legend in billing calendar page

**Customize Pricing:**
1. Create new pricing rules via API
2. Link to specific meal plans
3. Set effective date ranges
4. Multiple rules can coexist

**Add Payment Methods:**
1. Extend `payment_history` table
2. Create payment recording UI
3. Integrate with payment gateways

**Custom Notifications:**
1. Use `POST /api/payment-notifications`
2. Set priority levels
3. Add action URLs for quick access

---

## Technical Details

### Auto-Calculation System

The billing auto-calculation is powered by:

1. **Database Triggers** - Automatically call stored procedure on calendar entry changes
2. **Stored Procedure** - `sp_calculate_monthly_billing` recalculates totals
3. **Frontend Updates** - Redux actions refresh calendar grid after changes

**Calculation Logic:**
```sql
base_amount = total_delivered × delivered_price
extra_amount = total_extra × extra_price
total_amount = base_amount + extra_amount
```

### Real-Time Updates

**Frontend Flow:**
1. User clicks cell to change status
2. `createCalendarEntry` action dispatched
3. API creates/updates entry
4. Database trigger recalculates billing
5. `onUpdate` callback refreshes grid
6. Redux state updated with new totals

### Performance Optimizations

1. **Sticky Columns** - Customer name and summary always visible
2. **Efficient Queries** - Indexed columns for fast lookups
3. **Batch Updates** - Multiple entries updated in one transaction
4. **View Caching** - Database views for commonly joined data

### Security Considerations

1. **Input Validation** - All API endpoints validate input
2. **SQL Injection** - Parameterized queries throughout
3. **Authorization** - Requires admin access (add middleware)
4. **Data Integrity** - Foreign keys and constraints enforce relationships

### Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Responsive design for tablets
- Desktop recommended for calendar grid

---

## Troubleshooting

### Common Issues

**Issue: Calendar entries not saving**
- Check database connection
- Verify customer and order IDs exist
- Check browser console for errors
- Ensure delivery_date format is YYYY-MM-DD

**Issue: Totals not updating**
- Verify triggers are active: `SHOW TRIGGERS;`
- Check stored procedure exists
- Manually call: `CALL sp_calculate_monthly_billing(customer_id, 'YYYY-MM');`

**Issue: Finalize button not working**
- Check billing record exists in monthly_billing table
- Verify billing status is 'calculating'
- Check network tab for API errors

**Issue: Navigation not working**
- Verify billing-calendar.tsx is in correct location
- Check Next.js routing configuration
- Clear browser cache and rebuild

### Debug Mode

Enable debug logging in Redux:
```typescript
// In Frontend/src/redux/slices/payment.ts
console.log('Calendar Entry Response:', response.data);
```

Check backend logs:
```typescript
// In Backend/pages/api/calendar-entries/index.ts
console.log('Creating entry:', body);
```

---

## API Testing

### Using cURL

**Create Calendar Entry:**
```bash
curl -X POST http://localhost:3000/api/calendar-entries \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "order_id": 1,
    "delivery_date": "2023-12-15",
    "status": "T",
    "quantity": 1,
    "price": 50.00
  }'
```

**Get Calendar Grid:**
```bash
curl "http://localhost:3000/api/monthly-billing?format=grid&month=2023-12"
```

**Finalize Billing:**
```bash
curl -X PUT http://localhost:3000/api/monthly-billing/1 \
  -H "Content-Type: application/json" \
  -d '{
    "action": "finalize",
    "billing_id": 1,
    "finalized_by": "admin"
  }'
```

---

## Future Enhancements

### Planned Features
- [ ] Payment gateway integration
- [ ] Automated invoice generation (PDF)
- [ ] SMS/Email notifications to customers
- [ ] Mobile app for delivery staff
- [ ] Customer self-service portal
- [ ] Advanced reporting and analytics
- [ ] Multi-currency support
- [ ] Recurring payment automation

### Scalability Considerations
- Partition tables by month for large datasets
- Add caching layer (Redis) for calendar data
- Implement job queue for month-end processing
- Archive old billing records to separate tables

---

## Support

For issues or questions:
1. Check this documentation
2. Review code comments in implementation files
3. Check database logs for errors
4. Contact development team

---

## Credits

**Developed by:** Claude (Anthropic AI Assistant)
**Date:** December 2023
**Version:** 1.0.0
**License:** Proprietary

---

## Appendix

### Complete File Structure

```
TMS_DEV_NODEJS/
├── database/
│   └── migrations/
│       └── 002_create_payment_management_tables.sql
├── Backend/
│   ├── pages/api/
│   │   ├── calendar-entries/
│   │   │   ├── index.ts
│   │   │   └── [id].ts
│   │   ├── monthly-billing/
│   │   │   ├── index.ts
│   │   │   └── [id].ts
│   │   ├── payment-notifications/
│   │   │   ├── index.ts
│   │   │   └── [id].ts
│   │   └── pricing-rules/
│   │       └── index.ts
│   └── src/types/
│       └── index.ts (updated)
└── Frontend/
    └── src/
        ├── pages/dashboard/tiffin/
        │   ├── billing-calendar.tsx
        │   └── orders.tsx (updated)
        ├── sections/@dashboard/tiffin/
        │   ├── billing/
        │   │   ├── CalendarGrid.tsx
        │   │   └── index.ts
        │   └── order/list/
        │       └── OrderTableRow.tsx (updated)
        ├── redux/
        │   ├── slices/
        │   │   └── payment.ts
        │   └── rootReducer.ts (updated)
        └── @types/
            └── tms.ts (updated)
```

### Database ERD

```
┌─────────────────┐
│   customers     │
├─────────────────┤
│ id (PK)         │──┐
│ name            │  │
│ phone           │  │
│ address         │  │
└─────────────────┘  │
                      │
┌─────────────────┐  │  ┌──────────────────────┐
│ customer_orders │  │  │ tiffin_calendar_     │
├─────────────────┤  │  │      entries         │
│ id (PK)         │──┼──├──────────────────────┤
│ customer_id (FK)│──┘  │ id (PK)              │
│ meal_plan_id    │     │ customer_id (FK)     │──┐
│ quantity        │     │ order_id (FK)        │  │
│ price           │     │ delivery_date        │  │
│ payment_id      │     │ status (T/A/E)       │  │
│ payment_status  │     │ quantity, price      │  │
└─────────────────┘     └──────────────────────┘  │
                                                   │
                        ┌──────────────────────┐  │
                        │  monthly_billing     │  │
                        ├──────────────────────┤  │
                        │ id (PK)              │──┼──┐
                        │ customer_id (FK)     │──┘  │
                        │ billing_month        │     │
                        │ total_delivered      │     │
                        │ total_absent         │     │
                        │ total_extra          │     │
                        │ total_amount         │     │
                        │ status               │     │
                        └──────────────────────┘     │
                                                      │
                        ┌──────────────────────┐     │
                        │ payment_             │     │
                        │   notifications      │     │
                        ├──────────────────────┤     │
                        │ id (PK)              │     │
                        │ billing_id (FK)      │─────┘
                        │ customer_id (FK)     │
                        │ title, message       │
                        │ is_read, priority    │
                        └──────────────────────┘
```

---

**End of Documentation**
