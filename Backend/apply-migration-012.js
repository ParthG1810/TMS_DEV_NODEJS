const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function applyMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tms_database',
    port: parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true
  });

  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '../database/migrations/012_fix_billing_use_full_month_weekdays.sql');
    let sql = await fs.readFile(migrationPath, 'utf8');

    console.log('Processing SQL (removing DELIMITER commands)...');
    sql = sql.replace(/DELIMITER\s+\$\$/gi, '');
    sql = sql.replace(/DELIMITER\s+;/gi, '');
    sql = sql.replace(/END\$\$/gi, 'END');

    console.log('Executing migration...');
    await connection.query(sql);

    console.log('✓ Migration 012 applied successfully!');
    console.log('✓ Billing now uses full month weekdays for calculation');
    console.log('');
    console.log('Formula: per_tiffin = order_price / total_weekdays_in_month');
    console.log('Example: $50 Mon-Fri in Dec (23 weekdays) = $50/23 = $2.17 per tiffin');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

applyMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
