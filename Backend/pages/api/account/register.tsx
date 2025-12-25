import { sign } from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { createUser, emailExists } from 'src/services/userService';
import { JWT_CONFIG } from '../../../config';

// ----------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await cors(req, res);

    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        message: 'Email, password, first name, and last name are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Please enter a valid email address',
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check if email already exists
    const exists = await emailExists(email);
    if (exists) {
      return res.status(400).json({
        message: 'There already exists an account with the given email address.',
      });
    }

    // Create user
    const user = await createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      role: 'user', // Default role for new registrations
    });

    const accessToken = sign({ userId: user.id }, JWT_CONFIG.secret, {
      expiresIn: JWT_CONFIG.expiresIn,
    });

    return res.status(200).json({ accessToken, user });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
}
