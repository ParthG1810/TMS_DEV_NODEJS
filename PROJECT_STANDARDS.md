# TMS_DEV_NODEJS - Project Standards & Development Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Coding Standards](#coding-standards)
5. [API Development Patterns](#api-development-patterns)
6. [Database Integration](#database-integration)
7. [Error Handling & Validation](#error-handling--validation)
8. [Environment Configuration](#environment-configuration)
9. [Migration from Mock to Real Database](#migration-from-mock-to-real-database)

---

## 1. Project Overview

**Project Name**: TMS (Table Management System) - Restaurant Management Application

**Purpose**: A professional desktop and web application for restaurant owners, chefs, and kitchen managers to manage:
- Ingredient pricing from multiple vendors
- Recipe costs automatically calculated
- Product/ingredient database
- Vendor management
- Recipe creation and management

**Architecture**:
- Backend: Next.js API Routes with TypeScript
- Database: MySQL (migrating from mock data)
- Frontend: React-based (separate from Backend folder)

---

## 2. Technology Stack

### Core Technologies
```json
{
  "framework": "Next.js 12.3.1",
  "language": "TypeScript 4.8.4",
  "runtime": "Node.js",
  "database": "MySQL 8.0+",
  "orm": "mysql2 (to be added)"
}
```

### Current Dependencies
```json
{
  "axios": "^1.1.2",
  "cors": "^2.8.5",
  "jsonwebtoken": "^8.5.1",
  "lodash": "^4.17.21",
  "date-fns": "^2.29.3",
  "uuid": "^9.0.0",
  "change-case": "^4.1.2",
  "next": "^12.3.1",
  "react": "^18.2.0"
}
```

### Required Additions for Database
```bash
npm install mysql2
npm install dotenv
npm install --save-dev @types/mysql
```

---

## 3. Project Structure

### Directory Layout
```
TMS_DEV_NODEJS/
├── Backend/
│   ├── pages/
│   │   ├── api/
│   │   │   ├── products/           # Product management endpoints
│   │   │   │   ├── index.tsx       # GET all products
│   │   │   │   ├── [id].tsx        # GET/PUT/DELETE single product
│   │   │   │   └── create.tsx      # POST new product
│   │   │   ├── recipes/            # Recipe management endpoints
│   │   │   │   ├── index.tsx       # GET all recipes
│   │   │   │   ├── [id].tsx        # GET/PUT/DELETE single recipe
│   │   │   │   └── create.tsx      # POST new recipe
│   │   │   └── vendors/            # Vendor endpoints (if needed)
│   │   └── index.tsx
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts         # Database connection pool
│   │   ├── utils/
│   │   │   ├── cors.ts             # CORS middleware
│   │   │   ├── init-middleware.ts  # Middleware wrapper
│   │   │   └── validators.ts       # Validation utilities
│   │   └── types/
│   │       └── index.ts            # TypeScript type definitions
│   ├── .env                        # Environment variables
│   ├── .env.example                # Example environment file
│   ├── config.ts                   # App configuration
│   ├── package.json
│   └── tsconfig.json
└── database/
    ├── schema.sql                  # Database schema
    └── migrations/                 # Migration scripts
```

### File Naming Conventions
- **API Routes**: `kebab-case.tsx` or dynamic `[id].tsx`
- **Utilities**: `camelCase.ts`
- **Config Files**: `lowercase.ts`
- **Type Files**: `index.ts` or `types.ts`

---

## 4. Coding Standards

### 4.1 Import Order & Style

```typescript
// 1. External libraries (alphabetical)
import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

// 2. Internal utilities (using path aliases)
import cors from 'src/utils/cors';
import { query } from 'src/config/database';

// 3. Types
import { Product, Vendor } from 'src/types';

// Separator comment
// ----------------------------------------------------------------------
```

### 4.2 Variable Naming Conventions

```typescript
// camelCase for variables and functions
const accessToken = 'token';
const cleanQuery = query.toLowerCase().trim();

// UPPER_SNAKE_CASE for constants
const JWT_SECRET = 'secret-key';
const MAX_VENDORS = 3;

// Underscore prefix for iteration variables
users.find((_user) => _user.email === email);
products.map((_product) => _product.name);

// Descriptive destructuring
const { name, description, vendors = [] } = req.body;
```

### 4.3 TypeScript Types

```typescript
// Always define types for request/response
interface CreateProductRequest {
  name: string;
  description?: string;
  vendors: VendorInput[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Use TypeScript generics
const apiResponse = <T,>(data: T): ApiResponse<T> => ({
  success: true,
  data,
});
```

### 4.4 Async/Await Pattern

```typescript
// ALWAYS use async/await (NEVER callbacks or raw promises)
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await cors(req, res);

    // Database operations
    const results = await query('SELECT * FROM products');

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
```

---

## 5. API Development Patterns

### 5.1 Standard API Route Structure

```typescript
// pages/api/products/index.tsx
import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query } from 'src/config/database';

// ----------------------------------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 1. Apply CORS middleware
    await cors(req, res);

    // 2. Handle different HTTP methods
    if (req.method === 'GET') {
      return await handleGetProducts(req, res);
    }

    // 3. Method not allowed
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

async function handleGetProducts(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const products = await query(`
    SELECT p.*,
           JSON_ARRAYAGG(
             JSON_OBJECT(
               'id', v.id,
               'vendor_name', v.vendor_name,
               'price', v.price,
               'weight', v.weight,
               'package_size', v.package_size,
               'is_default', v.is_default
             )
           ) as vendors
    FROM products p
    LEFT JOIN vendors v ON p.id = v.product_id
    GROUP BY p.id
  `);

  return res.status(200).json({
    success: true,
    data: products,
  });
}
```

### 5.2 HTTP Method Handling

```typescript
// Use if-else or switch for method routing
if (req.method === 'GET') {
  // Handle GET
} else if (req.method === 'POST') {
  // Handle POST
} else if (req.method === 'PUT') {
  // Handle PUT
} else if (req.method === 'DELETE') {
  // Handle DELETE
} else {
  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
  });
}
```

### 5.3 Response Format Standards

```typescript
// Success Response
res.status(200).json({
  success: true,
  data: { /* response data */ },
});

// Error Response
res.status(400).json({
  success: false,
  error: 'Error message',
});

// Created Response
res.status(201).json({
  success: true,
  data: { /* created resource */ },
});
```

### 5.4 HTTP Status Codes

```typescript
// Success
200 - OK (successful GET, PUT, DELETE)
201 - Created (successful POST)

// Client Errors
400 - Bad Request (validation errors)
401 - Unauthorized (authentication required)
403 - Forbidden (insufficient permissions)
404 - Not Found (resource doesn't exist)
405 - Method Not Allowed (wrong HTTP method)
409 - Conflict (duplicate resource)

// Server Errors
500 - Internal Server Error (unexpected errors)
```

---

## 6. Database Integration

### 6.1 Database Connection Pool

```typescript
// src/config/database.ts
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tms_database',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const query = async (sql: string, params?: any[]) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

export default pool;
```

### 6.2 Database Schema

```sql
-- products table
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- vendors table
CREATE TABLE vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  weight DECIMAL(10, 2) NOT NULL,
  package_size VARCHAR(10) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- recipes table
CREATE TABLE recipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- recipe_ingredients table
CREATE TABLE recipe_ingredients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipe_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);
```

### 6.3 Query Patterns

```typescript
// SELECT with params (prevents SQL injection)
const products = await query(
  'SELECT * FROM products WHERE id = ?',
  [productId]
);

// INSERT with RETURNING data
const result = await query(
  'INSERT INTO products (name, description) VALUES (?, ?)',
  [name, description]
);
const insertId = (result as any).insertId;

// UPDATE
await query(
  'UPDATE products SET name = ?, description = ? WHERE id = ?',
  [name, description, productId]
);

// DELETE
await query('DELETE FROM products WHERE id = ?', [productId]);

// Complex JOIN
const recipes = await query(`
  SELECT r.*,
         JSON_ARRAYAGG(
           JSON_OBJECT(
             'product_id', ri.product_id,
             'quantity', ri.quantity,
             'product_name', p.name
           )
         ) as ingredients
  FROM recipes r
  LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
  LEFT JOIN products p ON ri.product_id = p.id
  GROUP BY r.id
`);
```

### 6.4 Transaction Handling

```typescript
// Use transactions for multi-table operations
import pool from 'src/config/database';

const connection = await pool.getConnection();
try {
  await connection.beginTransaction();

  // Insert product
  const [productResult] = await connection.execute(
    'INSERT INTO products (name, description) VALUES (?, ?)',
    [name, description]
  );
  const productId = (productResult as any).insertId;

  // Insert vendors
  for (const vendor of vendors) {
    await connection.execute(
      'INSERT INTO vendors (product_id, vendor_name, price, weight, package_size, is_default) VALUES (?, ?, ?, ?, ?, ?)',
      [productId, vendor.vendor_name, vendor.price, vendor.weight, vendor.package_size, vendor.is_default]
    );
  }

  await connection.commit();
  return productId;
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

---

## 7. Error Handling & Validation

### 7.1 Error Handling Pattern

```typescript
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await cors(req, res);

    // Validation errors (early return)
    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        error: 'Product name is required',
      });
    }

    // Business logic
    const result = await createProduct(req.body);

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in handler:', error);

    // Database constraint errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Product already exists',
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
```

### 7.2 Validation Patterns

```typescript
// Manual validation (current pattern)
const validateProductInput = (data: any) => {
  const errors: string[] = [];

  if (!data.name || data.name.trim() === '') {
    errors.push('Product name is required');
  }

  if (data.name && data.name.length > 255) {
    errors.push('Product name must be less than 255 characters');
  }

  if (!data.vendors || data.vendors.length === 0) {
    errors.push('At least one vendor is required');
  }

  if (data.vendors) {
    data.vendors.forEach((vendor: any, index: number) => {
      if (!vendor.vendor_name) {
        errors.push(`Vendor ${index + 1}: name is required`);
      }
      if (!vendor.price || vendor.price <= 0) {
        errors.push(`Vendor ${index + 1}: price must be positive`);
      }
      if (!vendor.weight || vendor.weight <= 0) {
        errors.push(`Vendor ${index + 1}: weight must be positive`);
      }
    });
  }

  return errors;
};

// Usage in handler
const errors = validateProductInput(req.body);
if (errors.length > 0) {
  return res.status(400).json({
    success: false,
    error: errors.join(', '),
  });
}
```

### 7.3 Type Coercion & Sanitization

```typescript
// Clean and sanitize input
const cleanQuery = `${query}`.toLowerCase().trim();

// Parse numeric values
const price = parseFloat(req.body.price);
const quantity = parseFloat(req.body.quantity);

// Boolean conversion
const isDefault = Boolean(req.body.is_default);

// Default values
const { description = '', vendors = [] } = req.body;
```

---

## 8. Environment Configuration

### 8.1 .env File Structure

```bash
# Environment
NODE_ENV=development

# Server Configuration
PORT=3000
DEV_API=http://localhost:3000
PRODUCTION_API=https://your-production-url.com

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tms_database
DB_PORT=3306

# JWT Configuration (if using authentication)
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=3d
```

### 8.2 Config File Pattern

```typescript
// config.ts
export const config = {
  env: process.env.NODE_ENV || 'development',

  api: {
    host: process.env.NODE_ENV === 'production'
      ? process.env.PRODUCTION_API
      : process.env.DEV_API,
  },

  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'tms_database',
    port: parseInt(process.env.DB_PORT || '3306'),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '3d',
  },
};
```

---

## 9. Migration from Mock to Real Database

### 9.1 Key Differences

| Aspect | Mock (Current) | Real Database (New) |
|--------|---------------|---------------------|
| Data Storage | TypeScript arrays | MySQL tables |
| Queries | Array methods (`.find()`, `.filter()`) | SQL queries |
| Persistence | None (resets on restart) | Permanent storage |
| Transactions | Not needed | Required for multi-table ops |
| Relations | Manual object nesting | Foreign keys |
| Validation | Client-side only | Database constraints + app-level |

### 9.2 Migration Checklist

- [ ] Install `mysql2` and `dotenv` packages
- [ ] Create `.env` file with database credentials
- [ ] Create `src/config/database.ts` with connection pool
- [ ] Create database schema (`schema.sql`)
- [ ] Update API routes to use real database queries
- [ ] Remove mock data files (or keep for reference)
- [ ] Add proper transaction handling
- [ ] Update error handling for database errors
- [ ] Add database indexes for performance
- [ ] Test all endpoints with real data

---

## 10. API Endpoint Standards

### 10.1 RESTful Naming

```
GET    /api/products           - Get all products
GET    /api/products/:id       - Get single product
POST   /api/products           - Create product
PUT    /api/products/:id       - Update product
DELETE /api/products/:id       - Delete product

GET    /api/recipes            - Get all recipes
GET    /api/recipes/:id        - Get single recipe
POST   /api/recipes            - Create recipe
PUT    /api/recipes/:id        - Update recipe
DELETE /api/recipes/:id        - Delete recipe
```

### 10.2 Request/Response Examples

**POST /api/products**
```json
// Request
{
  "name": "Tomatoes",
  "description": "Fresh red tomatoes",
  "vendors": [
    {
      "vendor_name": "Local Farm",
      "price": 5.99,
      "weight": 1.0,
      "package_size": "kg",
      "is_default": true
    }
  ]
}

// Response (201)
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Tomatoes",
    "description": "Fresh red tomatoes",
    "vendors": [...]
  }
}
```

**GET /api/products**
```json
// Response (200)
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Tomatoes",
      "description": "Fresh red tomatoes",
      "vendors": [...]
    }
  ]
}
```

---

## 11. Development Workflow

### 11.1 Adding a New Feature

1. **Create API Route File**
   ```typescript
   // pages/api/feature/index.tsx
   ```

2. **Define TypeScript Types**
   ```typescript
   // src/types/index.ts
   export interface Feature {
     id: number;
     name: string;
   }
   ```

3. **Implement Handler**
   ```typescript
   export default async function handler(req, res) {
     try {
       await cors(req, res);
       // Implementation
     } catch (error) {
       // Error handling
     }
   }
   ```

4. **Test Endpoint**
   - Use Postman, curl, or frontend
   - Verify response format
   - Test error cases

### 11.2 Code Review Checklist

- [ ] Follows TypeScript standards
- [ ] Uses parameterized queries (no SQL injection)
- [ ] Proper error handling with try-catch
- [ ] Consistent response format
- [ ] Input validation implemented
- [ ] CORS middleware applied
- [ ] Appropriate HTTP status codes
- [ ] Database transactions where needed
- [ ] Commented complex logic
- [ ] No console.logs in production code (use proper logging)

---

## 12. Security Best Practices

### 12.1 SQL Injection Prevention
```typescript
// NEVER do this
const sql = `SELECT * FROM products WHERE name = '${name}'`;

// ALWAYS use parameterized queries
const sql = 'SELECT * FROM products WHERE name = ?';
await query(sql, [name]);
```

### 12.2 Input Validation
- Validate all user inputs
- Sanitize strings
- Validate data types
- Check ranges for numbers
- Enforce maximum lengths

### 12.3 Authentication & Authorization
```typescript
// Verify JWT token (when implemented)
const token = req.headers.authorization?.split(' ')[1];
if (!token) {
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
  });
}
```

---

## 13. Performance Considerations

### 13.1 Database Indexing
```sql
-- Index frequently queried columns
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_vendors_product_id ON vendors(product_id);
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
```

### 13.2 Query Optimization
- Use `SELECT` with specific columns instead of `SELECT *`
- Use JOINs efficiently
- Implement pagination for large datasets
- Use connection pooling

### 13.3 Caching Strategy
```typescript
// Implement caching for frequently accessed data
// Consider using Redis or in-memory cache
```

---

## Summary

This document defines the coding standards and patterns for the TMS_DEV_NODEJS project. All new development should follow these guidelines to maintain consistency and code quality.

**Key Principles:**
1. TypeScript throughout
2. Async/await exclusively
3. Parameterized SQL queries
4. Consistent error handling
5. Standardized API responses
6. Proper validation
7. Transaction support for multi-table operations

For questions or clarifications, refer to existing code examples in the `Backend/pages/api/` directory.

---

**Last Updated**: 2025-11-29
**Version**: 1.0
