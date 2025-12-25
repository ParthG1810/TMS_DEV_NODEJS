import { verify } from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';
import { findById, User } from '../services/userService';
import { JWT_CONFIG } from '../../config';

// ----------------------------------------------------------------------

export interface AuthenticatedRequest extends NextApiRequest {
  user?: User;
}

/**
 * Verify JWT token and get user from request
 * @returns User object or null if not authenticated
 */
export const getAuthUser = async (req: NextApiRequest): Promise<User | null> => {
  try {
    const { authorization } = req.headers;

    if (!authorization) {
      return null;
    }

    const accessToken = `${authorization}`.split(' ')[1];

    if (!accessToken) {
      return null;
    }

    const data = verify(accessToken, JWT_CONFIG.secret);
    const userId = typeof data === 'object' ? data?.userId : '';

    if (!userId) {
      return null;
    }

    const user = await findById(userId);
    return user;
  } catch (error) {
    return null;
  }
};

/**
 * Middleware to require authentication
 */
export const requireAuth = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<User | null> => {
  const user = await getAuthUser(req);

  if (!user) {
    res.status(401).json({ message: 'Authentication required' });
    return null;
  }

  if (user.status !== 'active') {
    res.status(403).json({ message: 'Your account has been deactivated' });
    return null;
  }

  return user;
};

/**
 * Middleware to require specific roles
 */
export const requireRoles = async (
  req: NextApiRequest,
  res: NextApiResponse,
  allowedRoles: string[]
): Promise<User | null> => {
  const user = await requireAuth(req, res);

  if (!user) {
    return null; // Response already sent by requireAuth
  }

  if (!allowedRoles.includes(user.role)) {
    res.status(403).json({ message: 'You do not have permission to perform this action' });
    return null;
  }

  return user;
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<User | null> => {
  return requireRoles(req, res, ['admin']);
};

/**
 * Middleware to require admin or manager role
 */
export const requireAdminOrManager = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<User | null> => {
  return requireRoles(req, res, ['admin', 'manager']);
};
