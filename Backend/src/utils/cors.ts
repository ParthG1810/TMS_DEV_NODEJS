import Cors from 'cors';
import initMiddleware from './init-middleware';

// Initialize the cors middleware
const cors = initMiddleware(
  // You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
  Cors({
    // Allow requests from frontend
    origin: ['http://localhost:8081', 'http://localhost:3000', 'http://127.0.0.1:8081'],
    // Allow all necessary HTTP methods for CRUD operations
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Allow credentials
    credentials: true,
    // Allow these headers
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

export default cors;
