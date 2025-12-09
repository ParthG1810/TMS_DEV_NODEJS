/**
 * Simple migration runner for TMS database
 * Usage: ts-node Backend/run-migration.ts database/migrations/007_add_billing_pending_approval_notification_type.sql
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'tms_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  multipleStatements: true, // Enable multiple SQL statements
};

async function runMigration(sqlFilePath: string) {
  let connection;

  try {
    // Read the SQL file
    const absolutePath = path.resolve(sqlFilePath);
    console.log(`Reading migration file: ${absolutePath}`);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Migration file not found: ${absolutePath}`);
    }

    const sql = fs.readFileSync(absolutePath, 'utf8');

    // Connect to database
    console.log(`Connecting to database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Database connected');

    // Execute migration
    console.log('Executing migration...');
    await connection.query(sql);
    console.log('✓ Migration completed successfully!');

  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Get migration file path from command line arguments
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: ts-node Backend/run-migration.ts <path-to-migration-file>');
  console.error('Example: ts-node Backend/run-migration.ts database/migrations/007_add_billing_pending_approval_notification_type.sql');
  process.exit(1);
}

runMigration(migrationFile);
