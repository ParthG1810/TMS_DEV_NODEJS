# TMS API Documentation

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-production-url.com`

All API endpoints are prefixed with `/api`.

---

## Table of Contents

1. [Product Endpoints](#product-endpoints)
2. [Recipe Endpoints](#recipe-endpoints)
3. [Error Handling](#error-handling)
4. [Request/Response Format](#requestresponse-format)

---

## Product Endpoints

### 1. Get All Products

**Endpoint**: `GET /api/products`

**Description**: Fetch all products with their vendors.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Tomatoes",
      "description": "Fresh red tomatoes",
      "created_at": "2023-11-29T10:00:00.000Z",
      "updated_at": "2023-11-29T10:00:00.000Z",
      "vendors": [
        {
          "id": 1,
          "product_id": 1,
          "vendor_name": "Local Farm",
          "price": 5.99,
          "weight": 1.0,
          "package_size": "kg",
          "is_default": true,
          "created_at": "2023-11-29T10:00:00.000Z",
          "updated_at": "2023-11-29T10:00:00.000Z"
        }
      ]
    }
  ]
}
```

---

### 2. Get Single Product

**Endpoint**: `GET /api/products/:id`

**Description**: Fetch a single product by ID with its vendors.

**URL Parameters**:
- `id` (required): Product ID

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Tomatoes",
    "description": "Fresh red tomatoes",
    "created_at": "2023-11-29T10:00:00.000Z",
    "updated_at": "2023-11-29T10:00:00.000Z",
    "vendors": [...]
  }
}
```

**Error Response** (404):
```json
{
  "success": false,
  "error": "Product not found"
}
```

---

### 3. Create Product

**Endpoint**: `POST /api/products`

**Description**: Create a new product with vendors.

**Request Body**:
```json
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
    },
    {
      "vendor_name": "City Market",
      "price": 6.50,
      "weight": 1.0,
      "package_size": "kg",
      "is_default": false
    }
  ]
}
```

**Validation Rules**:
- `name`: Required, max 255 characters
- `description`: Optional
- `vendors`: Required, array with 1-3 vendors
- Each vendor must have:
  - `vendor_name`: Required
  - `price`: Required, positive number
  - `weight`: Required, positive number
  - `package_size`: Required, one of the supported units (see below)
  - `is_default`: Boolean (automatically set to true for first vendor if not specified)

**Supported Package Sizes**:
- Volume: `tsp`, `tbsp`, `c`, `pt`, `qt`, `gal`, `fl_oz`
- Weight: `oz`, `lb`, `g`, `kg`
- Metric Volume: `ml`, `l`
- Count: `pcs`

**Response** (201):
```json
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

**Error Response** (400):
```json
{
  "success": false,
  "error": "Product name is required, At least one vendor is required"
}
```

---

### 4. Update Product

**Endpoint**: `PUT /api/products/:id`

**Description**: Update a product and/or its vendors.

**URL Parameters**:
- `id` (required): Product ID

**Request Body** (all fields optional):
```json
{
  "name": "Cherry Tomatoes",
  "description": "Sweet cherry tomatoes",
  "vendors": [
    {
      "vendor_name": "Local Farm",
      "price": 7.99,
      "weight": 1.0,
      "package_size": "kg",
      "is_default": true
    }
  ]
}
```

**Notes**:
- If `vendors` is provided, ALL existing vendors are replaced
- Partial updates supported (send only fields you want to update)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Cherry Tomatoes",
    "description": "Sweet cherry tomatoes",
    "vendors": [...]
  }
}
```

---

### 5. Delete Product

**Endpoint**: `DELETE /api/products/:id`

**Description**: Delete a product and its vendors (CASCADE).

**URL Parameters**:
- `id` (required): Product ID

**Notes**:
- Cannot delete if product is used in any recipes (RESTRICT constraint)
- Vendors are automatically deleted (CASCADE)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1
  }
}
```

**Error Response** (409):
```json
{
  "success": false,
  "error": "Cannot delete product: it is used in one or more recipes"
}
```

---

## Recipe Endpoints

### 1. Get All Recipes

**Endpoint**: `GET /api/recipes`

**Description**: Fetch all recipes with ingredients, images, and calculated cost.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Pasta Pomodoro",
      "description": "Classic Italian tomato pasta",
      "created_at": "2023-11-29T10:00:00.000Z",
      "updated_at": "2023-11-29T10:00:00.000Z",
      "ingredients": [
        {
          "id": 1,
          "recipe_id": 1,
          "product_id": 1,
          "quantity": 500,
          "product_name": "Tomatoes",
          "product_description": "Fresh red tomatoes",
          "unit_price": 5.99,
          "weight": 1000,
          "package_size": "g",
          "total_price": 2.995,
          "created_at": "2023-11-29T10:00:00.000Z"
        }
      ],
      "images": [
        {
          "id": 1,
          "recipe_id": 1,
          "image_url": "/uploads/recipes/abc123-1234567890.jpg",
          "is_primary": true,
          "display_order": 0,
          "created_at": "2023-11-29T10:00:00.000Z"
        }
      ],
      "total_cost": 15.50
    }
  ]
}
```

---

### 2. Get Single Recipe

**Endpoint**: `GET /api/recipes/:id`

**Description**: Fetch a single recipe by ID with ingredients, images, and cost.

**URL Parameters**:
- `id` (required): Recipe ID

**Response**: Same structure as single recipe in Get All Recipes

**Error Response** (404):
```json
{
  "success": false,
  "error": "Recipe not found"
}
```

---

### 3. Create Recipe

**Endpoint**: `POST /api/recipes`

**Content-Type**: `multipart/form-data`

**Description**: Create a new recipe with ingredients and images.

**Form Fields**:
- `name` (required): Recipe name
- `description` (optional): Recipe description
- `ingredients` (required): JSON string of ingredient array
- `images` (optional): Multiple image files

**Example Form Data**:
```
name: "Pasta Pomodoro"
description: "Classic Italian tomato pasta"
ingredients: '[{"product_id": 1, "quantity": 500}, {"product_id": 2, "quantity": 50}]'
images: [file1.jpg, file2.jpg]
```

**Ingredients JSON Format**:
```json
[
  {
    "product_id": 1,
    "quantity": 500
  },
  {
    "product_id": 2,
    "quantity": 50
  }
]
```

**Validation Rules**:
- `name`: Required, max 255 characters
- `description`: Optional
- `ingredients`: Required, array with at least 1 ingredient
- Each ingredient must have:
  - `product_id`: Required, must exist in products table
  - `quantity`: Required, positive number
- `images`: Optional, max 10 files
- Each image:
  - Max size: 5MB
  - Allowed types: JPEG, PNG, GIF, WebP
  - First image becomes primary image

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Pasta Pomodoro",
    "description": "Classic Italian tomato pasta",
    "ingredients": [...],
    "images": [...]
  }
}
```

**Error Response** (400):
```json
{
  "success": false,
  "error": "Recipe name is required, At least one ingredient is required"
}
```

---

### 4. Update Recipe

**Endpoint**: `PUT /api/recipes/:id`

**Content-Type**: `multipart/form-data`

**Description**: Update a recipe with ingredients and/or images.

**URL Parameters**:
- `id` (required): Recipe ID

**Form Fields** (all optional):
- `name`: Recipe name
- `description`: Recipe description
- `ingredients`: JSON string of ingredient array
- `images`: Multiple image files (replaces existing images)
- `keepExistingImages`: 'true' or 'false' (default: false)

**Notes**:
- If `ingredients` is provided, ALL existing ingredients are replaced
- If new `images` are uploaded, old images are deleted from filesystem
- Set `keepExistingImages: 'true'` to keep existing images when not uploading new ones
- Partial updates supported

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated Pasta Pomodoro",
    "ingredients": [...],
    "images": [...]
  }
}
```

---

### 5. Delete Recipe

**Endpoint**: `DELETE /api/recipes/:id`

**Description**: Delete a recipe, its ingredients, and images (CASCADE).

**URL Parameters**:
- `id` (required): Recipe ID

**Notes**:
- Recipe ingredients are automatically deleted (CASCADE)
- Recipe images are automatically deleted from database (CASCADE)
- Image files are deleted from filesystem

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1
  }
}
```

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

- `200 OK`: Successful GET, PUT, DELETE request
- `201 Created`: Successful POST request
- `400 Bad Request`: Validation error or malformed request
- `404 Not Found`: Resource not found
- `405 Method Not Allowed`: Invalid HTTP method for endpoint
- `409 Conflict`: Duplicate entry or constraint violation
- `500 Internal Server Error`: Unexpected server error

---

## Request/Response Format

### Standard Success Response

```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Testing with cURL

### Create Product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

### Get All Products

```bash
curl http://localhost:3000/api/products
```

### Create Recipe with Images

```bash
curl -X POST http://localhost:3000/api/recipes \
  -F "name=Pasta Pomodoro" \
  -F "description=Classic Italian pasta" \
  -F 'ingredients=[{"product_id": 1, "quantity": 500}]' \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

### Get All Recipes

```bash
curl http://localhost:3000/api/recipes
```

---

## Notes

- All timestamps are in ISO 8601 format
- Decimal values (price, weight, quantity) support up to 2 decimal places
- Images are stored in `public/uploads/recipes/` directory
- Image URLs are relative (e.g., `/uploads/recipes/filename.jpg`)
- CORS is enabled for all endpoints
- Database transactions ensure data integrity for multi-table operations

---

## Rate Limiting

Currently, no rate limiting is implemented. For production, consider implementing rate limiting to prevent abuse.

---

## Authentication

Authentication is not currently implemented. The JWT configuration in `.env` is prepared for future authentication features.
