import type { NextApiRequest, NextApiResponse } from 'next';
import {
  exchangeCodeForTokens,
  getUserEmail,
  saveGmailSettings,
} from '../../../src/services/gmailService';
import { scanGmailAccount } from '../../../src/services/interacScanner';
import { query } from '../../../src/config/database';
import { GmailOAuthSettings } from '../../../src/types';

/**
 * @api {get} /api/gmail/callback Gmail OAuth callback handler
 * @apiDescription Handles the OAuth callback from Google, saves tokens, and triggers initial sync
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  const { code, error } = req.query;

  // Handle OAuth errors
  if (error) {
    console.error('Gmail OAuth error:', error);
    // Redirect to frontend with error
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3034';
    return res.redirect(`${frontendUrl}/dashboard/payments/settings/gmail?error=${encodeURIComponent(error as string)}`);
  }

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'Authorization code is required',
    });
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code as string);

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Get user email
    const emailAddress = await getUserEmail(tokens.access_token);

    if (!emailAddress) {
      throw new Error('Could not retrieve email address');
    }

    // Calculate token expiry
    const expiresAt = new Date(tokens.expiry_date || Date.now() + 3600000);

    // Save settings to database
    const settingsId = await saveGmailSettings(
      emailAddress,
      tokens.access_token,
      tokens.refresh_token || '',
      expiresAt
    );

    // Trigger initial sync (30 days of emails)
    const settings = await query<GmailOAuthSettings[]>(`
      SELECT * FROM gmail_oauth_settings WHERE id = ?
    `, [settingsId]);

    if (settings.length > 0) {
      // Run initial sync in background (don't await)
      scanGmailAccount(settings[0]).then(results => {
        console.log(`[Gmail Callback] Initial sync completed: ${results.newTransactions} new transactions`);
      }).catch(err => {
        console.error('[Gmail Callback] Initial sync error:', err);
      });
    }

    // Redirect to frontend with success
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3034';
    return res.redirect(`${frontendUrl}/dashboard/payments/settings/gmail?success=true&email=${encodeURIComponent(emailAddress)}`);
  } catch (error: any) {
    console.error('Gmail OAuth callback error:', error);
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3034';
    return res.redirect(`${frontendUrl}/dashboard/payments/settings/gmail?error=${encodeURIComponent(error.message)}`);
  }
}
