import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { requireAuth } from 'src/utils/authMiddleware';
import { updateUser, emailExists } from 'src/services/userService';

// ----------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await cors(req, res);

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'PUT' && req.method !== 'PATCH') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    const user = await requireAuth(req, res);
    if (!user) return; // Response already sent

    const {
      displayName,
      email,
      photoURL,
      role,
    } = req.body;

    // Validate email if being changed
    if (email && email !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          message: 'Please enter a valid email address',
        });
      }

      const exists = await emailExists(email, user.id);
      if (exists) {
        return res.status(400).json({
          message: 'This email address is already in use',
        });
      }
    }

    // Only allow admins to change roles
    const updateData: any = {
      displayName,
      email,
      photoURL,
    };

    if (role && user.role === 'admin') {
      updateData.role = role;
    }

    const updatedUser = await updateUser(user.id, updateData);

    if (!updatedUser) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
}
