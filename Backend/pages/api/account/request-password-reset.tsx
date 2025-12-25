import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query } from 'src/lib/db';
import { RowDataPacket } from 'mysql2';

// ----------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await cors(req, res);

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
      });
    }

    // Check if user exists
    const users = (await query(
      'SELECT id, display_name, email FROM users WHERE email = ?',
      [email]
    )) as RowDataPacket[];

    // Always return success to avoid email enumeration
    // but only create request if user exists
    if (users.length > 0) {
      const user = users[0];

      // Create password reset request for admin
      await query(
        `INSERT INTO password_reset_requests (user_email, user_name, status) VALUES (?, ?, 'pending')`,
        [user.email, user.display_name]
      );
    }

    // Return success message regardless of whether user exists (security best practice)
    res.status(200).json({
      message: 'Password reset request submitted. An administrator will contact you shortly.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}
