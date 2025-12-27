import mysql from 'mysql2/promise';
import log from 'electron-log';
import { getConfig, setConfigSection } from './config';

export interface DBConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface ConnectionResult {
  success: boolean;
  error?: string;
}

// Get database configuration from config store
export function getDBConfig(): DBConfig {
  const config = getConfig();
  return {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
  };
}

// Save database configuration to config store
export function saveDBConfig(dbConfig: Partial<DBConfig>): void {
  const current = getConfig().database;
  setConfigSection('database', {
    host: dbConfig.host ?? current.host,
    port: dbConfig.port ?? current.port,
    user: dbConfig.user ?? current.user,
    password: dbConfig.password ?? current.password,
    name: dbConfig.database ?? current.name,
  });
  log.info('Database configuration saved');
}

// Check MySQL connection
export async function checkMySQLConnection(): Promise<ConnectionResult> {
  const config = getDBConfig();

  log.info(`Checking MySQL connection to ${config.host}:${config.port}/${config.database}`);
  log.info(`Using user: ${config.user}`);

  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 10000,
    });

    // Test query
    await connection.query('SELECT 1 as test');

    // Get MySQL version
    const [rows] = await connection.query('SELECT VERSION() as version');
    const version = (rows as any[])[0]?.version || 'Unknown';
    log.info(`MySQL version: ${version}`);

    await connection.end();

    log.info('MySQL connection test successful');
    return { success: true };
  } catch (error: any) {
    log.error('MySQL connection failed:', error.message);
    log.error('Error code:', error.code);

    let errorMessage = 'Unknown database error';

    switch (error.code) {
      case 'ECONNREFUSED':
        errorMessage = `Cannot connect to MySQL at ${config.host}:${config.port}.\n\nPlease ensure MySQL server is installed and running.`;
        break;
      case 'ER_ACCESS_DENIED_ERROR':
        errorMessage = `Access denied for user '${config.user}'.\n\nPlease check your username and password.`;
        break;
      case 'ER_BAD_DB_ERROR':
        errorMessage = `Database '${config.database}' does not exist.\n\nPlease create the database first:\nCREATE DATABASE ${config.database};`;
        break;
      case 'ETIMEDOUT':
        errorMessage = `Connection timed out to ${config.host}:${config.port}.\n\nPlease check if MySQL is accessible.`;
        break;
      case 'ENOTFOUND':
        errorMessage = `Host '${config.host}' not found.\n\nPlease check the hostname.`;
        break;
      case 'ER_NOT_SUPPORTED_AUTH_MODE':
        errorMessage = `Authentication mode not supported.\n\nTry running in MySQL:\nALTER USER '${config.user}'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';`;
        break;
      default:
        errorMessage = error.message || 'Unknown database error';
    }

    return { success: false, error: errorMessage };
  }
}

// Test connection with custom config (without saving)
export async function testConnection(config: Partial<DBConfig>): Promise<ConnectionResult> {
  const fullConfig = { ...getDBConfig(), ...config };

  log.info(`Testing connection to ${fullConfig.host}:${fullConfig.port}/${fullConfig.database}`);

  try {
    const connection = await mysql.createConnection({
      host: fullConfig.host,
      port: fullConfig.port,
      user: fullConfig.user,
      password: fullConfig.password,
      database: fullConfig.database,
      connectTimeout: 10000,
    });

    await connection.query('SELECT 1');
    await connection.end();

    log.info('Test connection successful');
    return { success: true };
  } catch (error: any) {
    log.error('Test connection failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Create database if it doesn't exist
export async function ensureDatabaseExists(): Promise<ConnectionResult> {
  const config = getDBConfig();

  log.info(`Ensuring database '${config.database}' exists...`);

  try {
    // Connect without specifying database
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      connectTimeout: 10000,
    });

    // Create database if not exists
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    await connection.end();

    log.info(`Database '${config.database}' ensured`);
    return { success: true };
  } catch (error: any) {
    log.error('Failed to create database:', error.message);
    return { success: false, error: error.message };
  }
}

// Get database status
export async function getDatabaseStatus(): Promise<{
  connected: boolean;
  version?: string;
  database?: string;
  tables?: number;
  error?: string;
}> {
  const config = getDBConfig();

  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 5000,
    });

    // Get version
    const [versionRows] = await connection.query('SELECT VERSION() as version');
    const version = (versionRows as any[])[0]?.version;

    // Get table count
    const [tableRows] = await connection.query('SHOW TABLES');
    const tableCount = (tableRows as any[]).length;

    await connection.end();

    return {
      connected: true,
      version,
      database: config.database,
      tables: tableCount,
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
    };
  }
}
