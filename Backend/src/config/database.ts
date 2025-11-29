import mysql from 'mysql2/promise';

// ----------------------------------------------------------------------

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tms_database',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test database connection on startup
pool.getConnection()
  .then((connection) => {
    console.log('✓ Database connection established');
    connection.release();
  })
  .catch((error) => {
    console.error('✗ Database connection failed:', error.message);
  });

/**
 * Execute a query with parameterized values
 * @param sql - SQL query string with ? placeholders
 * @param params - Array of parameters to bind to the query
 * @returns Query results
 */
export const query = async (sql: string, params?: any[]) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

/**
 * Get a connection from the pool for transaction handling
 * @returns Database connection
 */
export const getConnection = async () => {
  return await pool.getConnection();
};

export default pool;
