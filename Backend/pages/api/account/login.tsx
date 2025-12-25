import { sign } from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { validateCredentials } from 'src/services/userService';
import { JWT_CONFIG } from '../../../config';

// ----------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await cors(req, res);

    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    const user = await validateCredentials(email, password);

    if (!user) {
      return res.status(400).json({
        message: 'Invalid email or password',
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    const accessToken = sign({ userId: user.id }, JWT_CONFIG.secret, {
      expiresIn: JWT_CONFIG.expiresIn,
    });

    res.status(200).json({
      accessToken,
      user,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}
