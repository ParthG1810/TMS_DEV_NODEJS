import { verify } from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { findById } from 'src/services/userService';
import { JWT_CONFIG } from '../../../config';

// ----------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await cors(req, res);

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    const { authorization } = req.headers;

    if (!authorization) {
      return res.status(401).json({
        message: 'Authorization token missing',
      });
    }

    const accessToken = `${authorization}`.split(' ')[1];

    if (!accessToken) {
      return res.status(401).json({
        message: 'Invalid authorization format',
      });
    }

    let data;
    try {
      data = verify(accessToken, JWT_CONFIG.secret);
    } catch (err) {
      return res.status(401).json({
        message: 'Invalid or expired token',
      });
    }

    const userId = typeof data === 'object' ? data?.userId : '';

    if (!userId) {
      return res.status(401).json({
        message: 'Invalid token payload',
      });
    }

    const user = await findById(userId);

    if (!user) {
      return res.status(401).json({
        message: 'User not found',
      });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('My account error:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
}
