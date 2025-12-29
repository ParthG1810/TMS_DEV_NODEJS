import Cors from 'cors';
import initMiddleware from './init-middleware';

// Initialize the cors middleware
// Port options for fallback: Frontend (47848, 47850, 47852), Backend (47847, 47849, 47851)
const cors = initMiddleware(
  // You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
  Cors({
    // Allow requests from frontend (all fallback port options)
    origin: [
      'http://localhost:47848',
      'http://localhost:47850',
      'http://localhost:47852',
      'http://localhost:47847',
      'http://localhost:47849',
      'http://localhost:47851',
      'http://127.0.0.1:47848',
      'http://127.0.0.1:47850',
      'http://127.0.0.1:47852',
    ],
    // Allow all necessary HTTP methods for CRUD operations
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Allow credentials
    credentials: true,
    // Allow these headers
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

export default cors;
