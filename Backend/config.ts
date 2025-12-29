// Next.js automatically loads .env files, no need for dotenv.config()

// ----------------------------------------------------------------------
// API Configuration
// ----------------------------------------------------------------------

export const HOST_API =
  process.env.NODE_ENV === 'production' ? process.env.PRODUCTION_API : process.env.DEV_API;

// ----------------------------------------------------------------------
// Database Configuration
// ----------------------------------------------------------------------

export const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tms_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

// ----------------------------------------------------------------------
// JWT Configuration
// ----------------------------------------------------------------------

export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'minimal-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '3d',
};

// ----------------------------------------------------------------------
// Upload Configuration
// ----------------------------------------------------------------------

export const UPLOAD_CONFIG = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB default
  uploadDir: process.env.UPLOAD_DIR || 'public/uploads/recipes',
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
};
