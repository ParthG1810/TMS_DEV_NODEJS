# Tiffin Management Frontend Implementation Guide

## Overview
This document provides the complete implementation guide for the Tiffin Management System frontend. The Redux slices and types have been created. Now we need to build the pages and components.

## ✅ Completed

### 1. TypeScript Types (`Frontend/src/@types/tms.ts`)
- Added all Tiffin Management types:
  - `IMealPlan`, `IMealPlanFormValues`
  - `ICustomer`, `ICustomerFormValues`
  - `ICustomerOrder`, `ICustomerOrderFormValues`
  - `IDailyTiffinCount`, `IDailyTiffinSummary`
  - Redux state types

### 2. Redux Slices
Created three new Redux slices following existing patterns:

#### `Frontend/src/redux/slices/mealPlan.ts`
Actions:
- `getMealPlans()` - GET /api/meal-plans
- `getMealPlan(id)` - GET /api/meal-plans/:id
- `createMealPlan(data)` - POST /api/meal-plans
- `updateMealPlan(id, data)` - PUT /api/meal-plans/:id
- `deleteMealPlan(id)` - DELETE /api/meal-plans/:id

#### `Frontend/src/redux/slices/customer.ts`
Actions:
- `getCustomers()` - GET /api/customers
- `getCustomer(id)` - GET /api/customers/:id
- `createCustomer(data)` - POST /api/customers
- `updateCustomer(id, data)` - PUT /api/customers/:id
- `deleteCustomer(id)` - DELETE /api/customers/:id

#### `Frontend/src/redux/slices/customerOrder.ts`
Actions:
- `getCustomerOrders(params)` - GET /api/customer-orders
- `getCustomerOrder(id)` - GET /api/customer-orders/:id
- `createCustomerOrder(data)` - POST /api/customer-orders
- `updateCustomerOrder(id, data)` - PUT /api/customer-orders/:id
- `deleteCustomerOrder(id)` - DELETE /api/customer-orders/:id
- `getDailyTiffinCount(date)` - GET /api/tiffin-reports/daily-count
- `getMonthlyTiffinList(month)` - GET /api/tiffin-reports/monthly-list
- `getCompleteTiffinList(params)` - GET /api/tiffin-reports/complete-list

### 3. Redux Integration (`Frontend/src/redux/rootReducer.ts`)
Added new reducers to the root reducer:
- `mealPlan: mealPlanReducer`
- `customer: customerReducer`
- `customerOrder: customerOrderReducer`

## 📋 To Be Implemented

The following pages and components need to be created following the existing TMS ingredient/recipe patterns:

### Page 1: Meal Plan Management

**Location:** `Frontend/src/pages/dashboard/meal-plans.tsx`

**Pattern:** Follow `ingredient-management.tsx`

**Key Features:**
- List all meal plans in a table
- Search/filter functionality
- Add new meal plan button
- Edit/Delete actions per row
- Pagination

**Components Needed:**
```
Frontend/src/sections/@dashboard/tiffin/meal-plan/
├── MealPlanNewEditForm.tsx       # Form with business logic
├── list/
│   ├── MealPlanTableRow.tsx      # Table row component
│   └── MealPlanTableToolbar.tsx  # Search/filter toolbar
```

**Business Logic in Form:**
```typescript
// When frequency changes to "Daily", automatically set days to "Single"
useEffect(() => {
  if (watch('frequency') === 'Daily') {
    setValue('days', 'Single');
  }
}, [watch('frequency')]);
```

**Form Fields:**
- Meal Name (RHFTextField, required, max 255)
- Description (RHFTextField, multiline)
- Frequency (RHFSelect: Daily, Weekly, Monthly)
- Days (RHFSelect: Mon-Fri, Mon-Sat, Single) - Disabled when frequency = Daily
- Price (RHFTextField, type="number", min=0)

**Validation Schema:**
```typescript
const MealPlanSchema = Yup.object().shape({
  meal_name: Yup.string().required('Meal name is required').max(255),
  description: Yup.string(),
  frequency: Yup.string().required().oneOf(['Daily', 'Weekly', 'Monthly']),
  days: Yup.string().required().oneOf(['Mon-Fri', 'Mon-Sat', 'Single']),
  price: Yup.number().required().positive('Price must be positive'),
});
```

**Table Columns:**
- Meal Name
- Frequency
- Days
- Price
- Actions (Edit/Delete buttons)

---

### Page 2: Customer Management

**Location:** `Frontend/src/pages/dashboard/customers.tsx`

**Pattern:** Follow `ingredient-management.tsx`

**Components Needed:**
```
Frontend/src/sections/@dashboard/tiffin/customer/
├── CustomerNewEditForm.tsx
├── list/
│   ├── CustomerTableRow.tsx
│   └── CustomerTableToolbar.tsx
```

**Form Fields:**
- Name (RHFTextField, required, max 255)
- Phone (RHFTextField, optional, max 50)
- Address (RHFTextField, multiline, required)

**Validation Schema:**
```typescript
const CustomerSchema = Yup.object().shape({
  name: Yup.string().required('Customer name is required').max(255),
  phone: Yup.string().max(50),
  address: Yup.string().required('Address is required'),
});
```

**Table Columns:**
- Name
- Phone
- Address
- Actions (Edit/Delete buttons)

---

### Page 3: Customer Tiffin Order (Most Complex)

**Location:** `Frontend/src/pages/dashboard/tiffin-orders.tsx`

**Pattern:** Follow `ingredient-management.tsx` + custom order form

**Components Needed:**
```
Frontend/src/sections/@dashboard/tiffin/order/
├── OrderNewEditForm.tsx          # Complex form with dropdowns
├── list/
│   ├── OrderTableRow.tsx
│   └── OrderTableToolbar.tsx
```

**Form Fields:**
- Customer (RHFAutocomplete, populate from Redux `customers`, required)
- Meal Plan (RHFAutocomplete, populate from Redux `mealPlans`, required)
- Quantity (RHFTextField, type="number", min=1, required)
- Selected Days (RHFCheckbox group: Mon-Sun, pre-select based on meal plan days)
- Price (RHFTextField, type="number", pre-fill from meal plan, editable)
- Start Date (RHFDatePicker, required)
- End Date (RHFDatePicker, required, must be > start date)

**Business Logic:**
```typescript
// Load customers and meal plans on mount
useEffect(() => {
  dispatch(getCustomers());
  dispatch(getMealPlans());
}, [dispatch]);

// When meal plan changes, update selected days and price
useEffect(() => {
  const selectedPlan = mealPlans.find(p => p.id === watch('meal_plan_id'));
  if (selectedPlan) {
    setValue('price', selectedPlan.price);

    // Pre-select days based on meal plan
    if (selectedPlan.days === 'Mon-Fri') {
      setValue('selected_days', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    } else if (selectedPlan.days === 'Mon-Sat') {
      setValue('selected_days', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
    } else {
      setValue('selected_days', []);
    }
  }
}, [watch('meal_plan_id')]);
```

**Validation Schema:**
```typescript
const OrderSchema = Yup.object().shape({
  customer_id: Yup.number().required('Customer is required'),
  meal_plan_id: Yup.number().required('Meal plan is required'),
  quantity: Yup.number().required().min(1, 'Minimum quantity is 1'),
  selected_days: Yup.array().of(Yup.string()),
  price: Yup.number().required().positive('Price must be positive'),
  start_date: Yup.date().required('Start date is required'),
  end_date: Yup.date()
    .required('End date is required')
    .min(Yup.ref('start_date'), 'End date must be after start date'),
});
```

**Table Columns:**
- Customer Name
- Meal Plan
- Quantity
- Selected Days (show as badges)
- Price
- Start Date - End Date
- Actions (Edit/Delete buttons)

---

### Page 4: Daily Tiffin Count

**Location:** `Frontend/src/pages/dashboard/daily-tiffin-count.tsx`

**Pattern:** Simple display page with date picker

**Components Needed:**
```
Frontend/src/sections/@dashboard/tiffin/daily-count/
└── DailyCountTable.tsx
```

**Features:**
- Date picker (defaults to today)
- Display table with customer name, quantity, meal plan
- Total count summary at bottom
- No edit/delete actions (read-only)

**Example Code:**
```typescript
export default function DailyTiffinCountPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dispatch = useDispatch();
  const { dailySummary, isLoading } = useSelector((state) => state.customerOrder);

  useEffect(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    dispatch(getDailyTiffinCount(dateStr));
  }, [selectedDate, dispatch]);

  return (
    <Container>
      <CustomBreadcrumbs
        heading="Daily Tiffin Count"
        links={[
          { name: 'Dashboard', href: PATH_DASHBOARD.root },
          { name: 'Daily Count' },
        ]}
      />

      <Card>
        <Box sx={{ p: 3 }}>
          <DatePicker
            label="Select Date"
            value={selectedDate}
            onChange={(newDate) => setSelectedDate(newDate)}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer Name</TableCell>
                <TableCell align="center">Quantity</TableCell>
                <TableCell>Meal Plan</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dailySummary?.orders.map((order, index) => (
                <TableRow key={index}>
                  <TableCell>{order.customer_name}</TableCell>
                  <TableCell align="center">{order.quantity}</TableCell>
                  <TableCell>{order.meal_plan_name}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="h6" align="right">
                    Total Count: {dailySummary?.total_count || 0}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Container>
  );
}
```

---

### Page 5: Monthly Tiffin Management List

**Location:** `Frontend/src/pages/dashboard/monthly-tiffin-list.tsx`

**Pattern:** Similar to order list but filtered by month

**Features:**
- Month picker (defaults to current month)
- Display all orders for selected month
- Same table structure as order list
- Read-only (no edit/delete)

**Key Code:**
```typescript
useEffect(() => {
  const monthStr = format(selectedMonth, 'yyyy-MM');
  dispatch(getMonthlyTiffinList(monthStr));
}, [selectedMonth, dispatch]);
```

---

### Page 6: Complete Tiffin Management List

**Location:** `Frontend/src/pages/dashboard/complete-tiffin-list.tsx`

**Pattern:** Full-featured table with search and pagination

**Features:**
- Search bar (searches customer name, meal plan name)
- Sorting columns (click column headers)
- Pagination controls
- All orders from inception to current date

**Key Code:**
```typescript
const [page, setPage] = useState(1);
const [search, setSearch] = useState('');
const [sortBy, setSortBy] = useState('created_at');
const [sortOrder, setSortOrder] = useState('desc');

useEffect(() => {
  dispatch(getCompleteTiffinList({
    search,
    page,
    limit: 50,
    sortBy,
    sortOrder
  }));
}, [search, page, sortBy, sortOrder, dispatch]);
```

---

## 🛣️ Routes Configuration

Update `Frontend/src/routes/paths.ts`:

```typescript
export const PATH_DASHBOARD = {
  // ... existing paths ...

  // Tiffin Management
  tiffin: {
    root: path(ROOTS_DASHBOARD, '/tiffin'),
    mealPlans: path(ROOTS_DASHBOARD, '/meal-plans'),
    mealPlanNew: path(ROOTS_DASHBOARD, '/meal-plans/new'),
    mealPlanEdit: (id: string) => path(ROOTS_DASHBOARD, `/meal-plans/${id}/edit`),

    customers: path(ROOTS_DASHBOARD, '/customers'),
    customerNew: path(ROOTS_DASHBOARD, '/customers/new'),
    customerEdit: (id: string) => path(ROOTS_DASHBOARD, `/customers/${id}/edit`),

    orders: path(ROOTS_DASHBOARD, '/tiffin-orders'),
    orderNew: path(ROOTS_DASHBOARD, '/tiffin-orders/new'),
    orderEdit: (id: string) => path(ROOTS_DASHBOARD, `/tiffin-orders/${id}/edit`),

    dailyCount: path(ROOTS_DASHBOARD, '/daily-tiffin-count'),
    monthlyList: path(ROOTS_DASHBOARD, '/monthly-tiffin-list'),
    completeList: path(ROOTS_DASHBOARD, '/complete-tiffin-list'),
  },
};
```

---

## 🧭 Navigation Configuration

Update `Frontend/src/layouts/dashboard/nav/config-navigation.tsx`:

```typescript
const navConfig = [
  // ... existing nav items ...

  // TIFFIN MANAGEMENT
  {
    subheader: 'Tiffin Management',
    items: [
      {
        title: 'Meal Plans',
        path: PATH_DASHBOARD.tiffin.mealPlans,
        icon: ICONS.menuItem,
      },
      {
        title: 'Customers',
        path: PATH_DASHBOARD.tiffin.customers,
        icon: ICONS.user,
      },
      {
        title: 'Tiffin Orders',
        path: PATH_DASHBOARD.tiffin.orders,
        icon: ICONS.cart,
      },
      {
        title: 'Daily Count',
        path: PATH_DASHBOARD.tiffin.dailyCount,
        icon: ICONS.analytics,
      },
      {
        title: 'Monthly List',
        path: PATH_DASHBOARD.tiffin.monthlyList,
        icon: ICONS.calendar,
      },
      {
        title: 'Complete List',
        path: PATH_DASHBOARD.tiffin.completeList,
        icon: ICONS.kanban,
      },
    ],
  },
];
```

---

## 📦 Components to Reuse

Use these existing components from the project:

**Forms:**
- `RHFTextField` - Text inputs
- `RHFSelect` - Dropdown selects
- `RHFCheckbox` - Checkboxes
- `RHFAutocomplete` - Autocomplete dropdowns
- `RHFDatePicker` - Date pickers

**Tables:**
- `useTable` - Table state hook
- `TableHeadCustom` - Custom table header
- `TablePaginationCustom` - Pagination
- `TableNoData` - Empty state
- `TableSelectedAction` - Bulk actions

**UI:**
- `CustomBreadcrumbs` - Page breadcrumbs
- `Iconify` - Icons
- `ConfirmDialog` - Delete confirmations
- `Scrollbar` - Custom scrollbar
- `useSnackbar` - Toast notifications

---

## 🎨 Styling Guidelines

Follow Material-UI theming:
- Use `sx` prop for inline styles
- Use theme spacing: `sx={{ p: 3, mb: 2 }}`
- Use theme colors: `color="primary"`, `color="error"`
- Responsive: `sx={{ display: { xs: 'none', md: 'block' } }}`

---

## ✅ Validation Best Practices

1. **Required fields:** Use Yup `.required('Field is required')`
2. **String lengths:** Use `.max(255, 'Too long')`
3. **Positive numbers:** Use `.positive('Must be positive')`
4. **Date ranges:** Use `.min(Yup.ref('start_date'))`
5. **Enums:** Use `.oneOf(['Daily', 'Weekly', 'Monthly'])`

---

## 🧪 Testing Checklist

For each page:
- [ ] Form validation works
- [ ] Create new record
- [ ] Edit existing record
- [ ] Delete record (with confirmation)
- [ ] Search/filter works
- [ ] Pagination works
- [ ] Loading states display correctly
- [ ] Error messages show properly
- [ ] Business rules are enforced (Daily → Single)
- [ ] API calls use correct endpoints

---

## 🚀 Implementation Priority

1. **Meal Plan Management** (simple CRUD, establishes pattern)
2. **Customer Management** (simple CRUD, similar to meal plans)
3. **Daily Tiffin Count** (simple read-only report)
4. **Monthly Tiffin List** (filtered report)
5. **Complete Tiffin List** (advanced features)
6. **Customer Tiffin Order** (most complex, dependent on 1 & 2)

---

## 📝 Notes

- All pages use `DashboardLayout`
- All pages need `Head` component for SEO
- Use `PATH_DASHBOARD` for navigation
- Dispatch Redux actions in `useEffect`
- Use `useSnackbar` for success/error messages
- Follow existing patterns in `ingredient-management.tsx` and `recipe-management.tsx`

---

## 🔗 API Endpoints Reference

All endpoints are documented in `/TIFFIN_MANAGEMENT_API.md`

Backend is running on: `http://localhost:3000/api`
Frontend should proxy to backend via `axios` base URL configuration.

---

This guide provides everything needed to implement the 6 Tiffin Management pages. Follow the existing ingredient/recipe patterns and use this as a reference.
