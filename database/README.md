# Database Setup Guide

## Prerequisites

- MySQL 8.0 or higher installed
- MySQL server running
- Root or admin access to MySQL

## Quick Setup

### 1. Create Database

```bash
mysql -u root -p -e "CREATE DATABASE tms_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 2. Import Schema

```bash
mysql -u root -p tms_database < schema.sql
```

### 3. Verify Setup

```bash
mysql -u root -p tms_database -e "SHOW TABLES;"
```

You should see:
- products
- vendors
- recipes
- recipe_ingredients
- recipe_images

### 4. Configure Environment

Copy the `.env.example` file in the Backend directory:

```bash
cd ../Backend
cp .env.example .env
```

Edit `.env` and update your database credentials:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tms_database
DB_PORT=3306
```

## Database Schema

### Tables Overview

1. **products** - Core ingredient/product information
   - Stores product name and description
   - Each product can have multiple vendors

2. **vendors** - Vendor-specific pricing
   - Links to products table
   - Stores vendor name, price, weight, package size
   - One vendor marked as default per product

3. **recipes** - Recipe information
   - Stores recipe name and description

4. **recipe_ingredients** - Recipe ingredients (join table)
   - Links recipes to products
   - Stores quantity needed for each ingredient

5. **recipe_images** - Recipe images
   - Multiple images per recipe
   - Supports primary image designation
   - Display order for image galleries

### Relationships

```
products (1) ──< (many) vendors
products (1) ──< (many) recipe_ingredients
recipes (1) ──< (many) recipe_ingredients
recipes (1) ──< (many) recipe_images
```

### Package Size Units

The system supports the following measurement units:

**Volume Measurements:**
- `tsp` - Teaspoon
- `tbsp` - Tablespoon
- `c` - Cup
- `pt` - Pint
- `qt` - Quart
- `gal` - Gallon
- `fl_oz` - Fluid ounce

**Weight Measurements:**
- `oz` - Ounce
- `lb` - Pound
- `g` - Gram
- `kg` - Kilogram

**Metric Volume:**
- `ml` - Milliliter
- `l` - Liter

**Count:**
- `pcs` - Pieces

## Sample Data

The schema includes sample data for testing:

- 5 sample products (Tomatoes, Olive Oil, Garlic, Pasta, Cheese)
- Multiple vendors for each product
- 2 sample recipes (Pasta Pomodoro, Aglio e Olio)
- Recipe ingredients linking recipes to products

## Resetting Database

To reset the database and start fresh:

```bash
mysql -u root -p -e "DROP DATABASE tms_database;"
mysql -u root -p -e "CREATE DATABASE tms_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p tms_database < schema.sql
```

## Backup Database

To backup your data:

```bash
mysqldump -u root -p tms_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

To restore from backup:

```bash
mysql -u root -p tms_database < backup_20231129_120000.sql
```

## Troubleshooting

### Connection Refused

If you get "Connection refused" error:
1. Check if MySQL is running: `sudo systemctl status mysql`
2. Start MySQL: `sudo systemctl start mysql`

### Access Denied

If you get "Access denied" error:
1. Verify username and password
2. Grant privileges: `GRANT ALL PRIVILEGES ON tms_database.* TO 'root'@'localhost';`

### Character Encoding Issues

If you see weird characters:
1. Ensure database uses utf8mb4: `ALTER DATABASE tms_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
2. Restart the application

## Migration Notes

This database schema is designed to replace the mock data system. Key differences:

- Persistent storage (data survives server restart)
- Foreign key constraints for data integrity
- Transactions for atomic operations
- Indexes for improved query performance
- CASCADE delete for cleanup (e.g., deleting a product deletes its vendors)
- RESTRICT delete for protection (e.g., can't delete a product used in recipes)
