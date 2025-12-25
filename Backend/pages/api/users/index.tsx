import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { requireAdminOrManager } from 'src/utils/authMiddleware';
import { getAllUsers, createUser, emailExists } from 'src/services/userService';

// ----------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await cors(req, res);

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const user = await requireAdminOrManager(req, res);
    if (!user) return; // Response already sent

    if (req.method === 'GET') {
      return handleGetUsers(req, res);
    }

    if (req.method === 'POST') {
      return handleCreateUser(req, res, user);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
}

// GET /api/users - List all users with pagination and filters
async function handleGetUsers(req: NextApiRequest, res: NextApiResponse) {
  const { page, limit, role, search } = req.query;

  const result = await getAllUsers({
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 10,
    role: role as string,
    search: search as string,
  });

  return res.status(200).json(result);
}

// POST /api/users - Create a new user (admin only)
async function handleCreateUser(
  req: NextApiRequest,
  res: NextApiResponse,
  currentUser: { role: string }
) {
  const { email, password, displayName, role, photoURL } = req.body;

  if (!email || !password || !displayName) {
    return res.status(400).json({
      message: 'Email, password, and display name are required',
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      message: 'Please enter a valid email address',
    });
  }

  // Validate password
  if (password.length < 6) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters long',
    });
  }

  // Check if email exists
  const exists = await emailExists(email);
  if (exists) {
    return res.status(400).json({
      message: 'This email address is already in use',
    });
  }

  // Only admin can assign admin role
  let assignedRole = role || 'user';
  if (assignedRole === 'admin' && currentUser.role !== 'admin') {
    return res.status(403).json({
      message: 'Only administrators can create admin users',
    });
  }

  const newUser = await createUser({
    email,
    password,
    displayName,
    role: assignedRole,
    photoURL,
  });

  return res.status(201).json({
    message: 'User created successfully',
    user: newUser,
  });
}
