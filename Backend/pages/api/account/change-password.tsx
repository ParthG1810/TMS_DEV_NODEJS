import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { requireAuth } from 'src/utils/authMiddleware';
import { changePassword } from 'src/services/userService';

// ----------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await cors(req, res);

    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    const user = await requireAuth(req, res);
    if (!user) return; // Response already sent

    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        message: 'Old password, new password, and confirmation are required',
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        message: 'New password and confirmation do not match',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long',
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        message: 'New password must be different from old password',
      });
    }

    const success = await changePassword(user.id, oldPassword, newPassword);

    if (!success) {
      return res.status(400).json({
        message: 'Old password is incorrect',
      });
    }

    return res.status(200).json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
}
