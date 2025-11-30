import Cors from 'cors';
import initMiddleware from './init-middleware';

// Initialize the cors middleware
const cors = initMiddleware(
  // You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
  Cors({
    // Allow all necessary HTTP methods for CRUD operations
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

export default cors;
