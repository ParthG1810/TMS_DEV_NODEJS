import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: number;
  uptime: number;
  database: {
    connected: boolean;
    version?: string;
    error?: string;
  };
  server: {
    nodeVersion: string;
    platform: string;
    memory: {
      used: number;
      total: number;
    };
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  const startTime = Date.now();

  // Database check
  let dbStatus: HealthResponse['database'] = {
    connected: false,
  };

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tms_database',
      connectTimeout: 5000,
    });

    // Get MySQL version
    const [rows] = await connection.query('SELECT VERSION() as version');
    const version = (rows as any[])[0]?.version;

    await connection.end();

    dbStatus = {
      connected: true,
      version,
    };
  } catch (error: any) {
    dbStatus = {
      connected: false,
      error: error.message,
    };
  }

  // Server info
  const memUsage = process.memoryUsage();

  const response: HealthResponse = {
    status: dbStatus.connected ? 'ok' : 'error',
    timestamp: startTime,
    uptime: process.uptime(),
    database: dbStatus,
    server: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
    },
  };

  // Set appropriate status code
  const statusCode = dbStatus.connected ? 200 : 503;

  // Add CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  res.status(statusCode).json(response);
}
