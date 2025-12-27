# TMS Backend - Restaurant Management System

A Next.js-based REST API backend for managing restaurant ingredients, vendors, and recipes with MySQL database integration.

## Features

- ✅ **Product Management**: CRUD operations for ingredients with multi-vendor pricing
- ✅ **Recipe Management**: Create recipes with ingredients and multiple images
- ✅ **Image Upload**: Support for recipe images with validation
- ✅ **Cost Calculation**: Automatic recipe cost calculation based on default vendor pricing
- ✅ **Database Transactions**: Atomic operations for data integrity
- ✅ **TypeScript**: Full type safety throughout the application
- ✅ **Comprehensive Units**: Support for 14+ measurement units (tsp, tbsp, oz, lb, g, kg, ml, l, etc.)

## Tech Stack

- **Framework**: Next.js 12.3.1
- **Language**: TypeScript 4.8.4
- **Database**: MySQL 8.0+
- **File Upload**: Formidable
- **Authentication**: JWT (prepared, not implemented yet)
- **API Style**: RESTful

## Prerequisites

- Node.js 16+ and npm
- MySQL 8.0+
- MySQL server running

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE tms_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import schema
mysql -u root -p tms_database < ../database/schema.sql
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and update your database credentials
nano .env
```

Update these values in `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tms_database
DB_PORT=3306
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:47847`

## Project Structure

```
Backend/
├── pages/
│   ├── api/
│   │   ├── products/          # Product endpoints
│   │   │   ├── index.tsx      # GET all, POST new
│   │   │   └── [id].tsx       # GET, PUT, DELETE by ID
│   │   └── recipes/           # Recipe endpoints
│   │       ├── index.tsx      # GET all, POST new (with images)
│   │       └── [id].tsx       # GET, PUT, DELETE by ID (with images)
│   └── index.tsx
├── src/
│   ├── config/
│   │   └── database.ts        # MySQL connection pool
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   └── utils/
│       ├── cors.ts            # CORS middleware
│       ├── init-middleware.ts # Middleware wrapper
│       └── upload.ts          # Image upload utilities
├── public/
│   └── uploads/
│       └── recipes/           # Uploaded recipe images
├── .env.example               # Environment template
├── config.ts                  # App configuration
├── package.json
└── tsconfig.json
```

## API Endpoints

### Products

- `GET /api/products` - Get all products with vendors
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Recipes

- `GET /api/recipes` - Get all recipes with ingredients and images
- `GET /api/recipes/:id` - Get single recipe
- `POST /api/recipes` - Create new recipe (with image upload)
- `PUT /api/recipes/:id` - Update recipe (with image upload)
- `DELETE /api/recipes/:id` - Delete recipe

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed API documentation.

## Development

### NPM Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
```

### Database Management

```bash
# Reset database
mysql -u root -p -e "DROP DATABASE tms_database; CREATE DATABASE tms_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p tms_database < ../database/schema.sql

# Backup database
mysqldump -u root -p tms_database > backup.sql

# Restore database
mysql -u root -p tms_database < backup.sql
```

## Testing

### Test Product API

```bash
# Get all products
curl http://localhost:47847/api/products

# Create product
curl -X POST http://localhost:47847/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tomatoes",
    "description": "Fresh tomatoes",
    "vendors": [{
      "vendor_name": "Local Farm",
      "price": 5.99,
      "weight": 1.0,
      "package_size": "kg",
      "is_default": true
    }]
  }'
```

### Test Recipe API

```bash
# Create recipe with images
curl -X POST http://localhost:47847/api/recipes \
  -F "name=Pasta Pomodoro" \
  -F "description=Classic pasta" \
  -F 'ingredients=[{"product_id": 1, "quantity": 500}]' \
  -F "images=@/path/to/image.jpg"
```

## Coding Standards

This project follows strict coding standards documented in [PROJECT_STANDARDS.md](../PROJECT_STANDARDS.md):

- TypeScript throughout with strict typing
- Async/await exclusively (no callbacks)
- Parameterized SQL queries (SQL injection prevention)
- Consistent error handling with try-catch blocks
- Transaction support for multi-table operations
- Standardized API response format

## Database Schema

### Tables

1. **products** - Core ingredient information
2. **vendors** - Vendor-specific pricing (1-3 vendors per product)
3. **recipes** - Recipe information
4. **recipe_ingredients** - Recipe-to-product relationships
5. **recipe_images** - Recipe images (multiple per recipe)

### Measurement Units

Supports 14 measurement units:
- **Volume**: tsp, tbsp, c, pt, qt, gal, fl_oz
- **Weight**: oz, lb, g, kg
- **Metric Volume**: ml, l
- **Count**: pcs

See [../database/README.md](../database/README.md) for detailed schema documentation.

## Security

- **SQL Injection**: Prevented via parameterized queries
- **File Upload**: Validated file types and sizes
- **CORS**: Enabled for cross-origin requests
- **Input Validation**: Server-side validation for all inputs

## Troubleshooting

### Database Connection Failed

```bash
# Check MySQL is running
sudo systemctl status mysql

# Start MySQL
sudo systemctl start mysql

# Verify connection
mysql -u root -p -e "SELECT 1;"
```

### Port Already in Use

```bash
# Kill process on port 47847
lsof -ti:47847 | xargs kill -9

# Or use different port
PORT=47849 npm run dev
```

### Image Upload Fails

```bash
# Ensure upload directory exists and has write permissions
mkdir -p public/uploads/recipes
chmod 755 public/uploads/recipes
```

## Contributing

1. Follow the coding standards in PROJECT_STANDARDS.md
2. Write TypeScript types for all new entities
3. Use transactions for multi-table operations
4. Add API documentation for new endpoints
5. Test all CRUD operations before committing

## License

Proprietary - All rights reserved

## Support

For issues or questions, please refer to:
- [API Documentation](./API_DOCUMENTATION.md)
- [Project Standards](../PROJECT_STANDARDS.md)
- [Database Setup Guide](../database/README.md)
