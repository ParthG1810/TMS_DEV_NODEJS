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
    const migrationPath = path.join(__dirname, '../database/migrations/011_fix_null_handling_in_billing_calculation.sql');
    let sql = await fs.readFile(migrationPath, 'utf8');

    console.log('Processing SQL (removing DELIMITER commands)...');
    // Remove DELIMITER commands as they are MySQL client-specific
    sql = sql.replace(/DELIMITER\s+\$\$/gi, '');
    sql = sql.replace(/DELIMITER\s+;/gi, '');
    // Replace $$ with ; for procedure end
    sql = sql.replace(/END\$\$/gi, 'END');

    console.log('Executing migration...');
    await connection.query(sql);

    console.log('✓ Migration 011 applied successfully!');
    console.log('✓ Calendar deletion error should now be fixed');
    console.log('');
    console.log('Next steps:');
    console.log('1. Test deleting a calendar entry - it should work without errors');
    console.log('2. Run billing verification: mysql -u root -pMysql tms_db < database\\scripts\\verify-billing-calculations.sql');
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
