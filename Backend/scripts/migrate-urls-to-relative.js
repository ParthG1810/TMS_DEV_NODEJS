#!/usr/bin/env node
/**
 * Migration Script: Convert full URLs to relative paths
 *
 * This script updates all image URLs in the database from full URLs
 * (e.g., http://localhost:3000/uploads/...) to relative paths
 * (e.g., /uploads/...) to avoid CORS issues.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'tms_db',
};

/**
 * Convert a full URL to a relative path
 * @param {string} url - The URL to convert
 * @returns {string} - The relative path
 */
function convertToRelativePath(url) {
  if (!url) return url;

  // Already a relative path
  if (url.startsWith('/')) {
    return url;
  }

  // Extract pathname from URL
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch (error) {
    // If URL parsing fails, assume it's already a path
    return url;
  }
}

async function runMigration() {
  let connection;

  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Start transaction
    await connection.beginTransaction();

    // 1. Update company logo
    console.log('\n📝 Updating company logo URLs...');
    const [logoRows] = await connection.execute(
      'SELECT setting_key, setting_value FROM app_settings WHERE setting_key = ? AND setting_value IS NOT NULL',
      ['company_logo']
    );

    for (const row of logoRows) {
      const oldUrl = row.setting_value;
      const newUrl = convertToRelativePath(oldUrl);

      if (oldUrl !== newUrl) {
        await connection.execute(
          'UPDATE app_settings SET setting_value = ? WHERE setting_key = ?',
          [newUrl, row.setting_key]
        );
        console.log(`   ✓ Updated: ${oldUrl} → ${newUrl}`);
      } else {
        console.log(`   ⊘ Already relative: ${oldUrl}`);
      }
    }

    // 2. Update recipe images
    console.log('\n📝 Updating recipe image URLs...');
    const [recipeRows] = await connection.execute(
      'SELECT id, image_url FROM recipe_images WHERE image_url IS NOT NULL'
    );

    let recipeUpdateCount = 0;
    for (const row of recipeRows) {
      const oldUrl = row.image_url;
      const newUrl = convertToRelativePath(oldUrl);

      if (oldUrl !== newUrl) {
        await connection.execute(
          'UPDATE recipe_images SET image_url = ? WHERE id = ?',
          [newUrl, row.id]
        );
        recipeUpdateCount++;
      }
    }
    console.log(`   ✓ Updated ${recipeUpdateCount} recipe image URLs`);

    // Commit transaction
    await connection.commit();

    // Display results
    console.log('\n📊 Migration Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const [finalLogoRows] = await connection.execute(
      'SELECT setting_value FROM app_settings WHERE setting_key = ?',
      ['company_logo']
    );

    if (finalLogoRows.length > 0) {
      console.log(`Company Logo: ${finalLogoRows[0].setting_value}`);
    }

    const [finalRecipeCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM recipe_images WHERE image_url LIKE "/%"'
    );
    console.log(`Recipe Images (relative): ${finalRecipeCount[0].count}`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n🎉 All URLs have been converted to relative paths.');
    console.log('   No more CORS errors! Restart your servers to see the changes.');

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the migration
console.log('🚀 Starting URL Migration to Relative Paths');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
runMigration();
