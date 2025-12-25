import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { requireAdminOrManager, requireAdmin } from 'src/utils/authMiddleware';
import { findById, updateUser, deleteUser, emailExists, resetPassword, updateUserStatus } from 'src/services/userService';

// ----------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await cors(req, res);

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (req.method === 'GET') {
      const currentUser = await requireAdminOrManager(req, res);
      if (!currentUser) return;
      return handleGetUser(id, res);
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const currentUser = await requireAdminOrManager(req, res);
      if (!currentUser) return;
      return handleUpdateUser(req, res, id, currentUser);
    }

    if (req.method === 'DELETE') {
      const currentUser = await requireAdmin(req, res);
      if (!currentUser) return;
      return handleDeleteUser(id, res, currentUser);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('User API error:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
}

// GET /api/users/[id] - Get a single user
async function handleGetUser(id: string, res: NextApiResponse) {
  const user = await findById(id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.status(200).json({ user });
}

// PUT/PATCH /api/users/[id] - Update a user
async function handleUpdateUser(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  currentUser: { id: string; role: string }
) {
  const targetUser = await findById(id);

  if (!targetUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  const {
    displayName,
    email,
    phoneNumber,
    country,
    address,
    state,
    city,
    zipCode,
    about,
    photoURL,
    isPublic,
    role,
    status,
    newPassword,
  } = req.body;

  // Validate email if being changed
  if (email && email !== targetUser.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Please enter a valid email address',
      });
    }

    const exists = await emailExists(email, id);
    if (exists) {
      return res.status(400).json({
        message: 'This email address is already in use',
      });
    }
  }

  // Only admin can change roles
  if (role && role !== targetUser.role && currentUser.role !== 'admin') {
    return res.status(403).json({
      message: 'Only administrators can change user roles',
    });
  }

  // Only admin can assign admin role
  if (role === 'admin' && currentUser.role !== 'admin') {
    return res.status(403).json({
      message: 'Only administrators can assign admin role',
    });
  }

  // Prevent self-demotion from admin
  if (currentUser.id === id && role && role !== 'admin' && targetUser.role === 'admin') {
    return res.status(400).json({
      message: 'You cannot demote yourself from admin role',
    });
  }

  // Reset password if provided
  if (newPassword) {
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long',
      });
    }
    await resetPassword(id, newPassword);
  }

  const updatedUser = await updateUser(id, {
    displayName,
    email,
    phoneNumber,
    country,
    address,
    state,
    city,
    zipCode,
    about,
    photoURL,
    isPublic,
    role,
    status,
  });

  return res.status(200).json({
    message: 'User updated successfully',
    user: updatedUser,
  });
}

// DELETE /api/users/[id] - Delete a user
async function handleDeleteUser(
  id: string,
  res: NextApiResponse,
  currentUser: { id: string }
) {
  // Prevent self-deletion
  if (currentUser.id === id) {
    return res.status(400).json({
      message: 'You cannot delete your own account',
    });
  }

  const targetUser = await findById(id);

  if (!targetUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  const deleted = await deleteUser(id);

  if (!deleted) {
    return res.status(500).json({ message: 'Failed to delete user' });
  }

  return res.status(200).json({
    message: 'User deleted successfully',
  });
}
