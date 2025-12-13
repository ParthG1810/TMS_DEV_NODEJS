import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from '../../../src/types';
import cors from '../../../src/utils/cors';
import { query } from '../../../src/config/database';
import { GmailOAuthSettings } from '../../../src/types';
import { getGmailClient, parseEmailBody } from '../../../src/services/gmailService';

/**
 * @api {get} /api/gmail/debug Debug Gmail connection and search
 * @apiDescription Returns detailed debug info about Gmail API connection
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  await cors(req, res);

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      steps: [],
    };

    // Step 1: Check if we have Gmail settings
    debugInfo.steps.push({ step: 1, action: 'Fetching Gmail settings from database' });

    const settings = await query<GmailOAuthSettings[]>(`
      SELECT * FROM gmail_oauth_settings WHERE is_active = 1
    `);

    debugInfo.settingsCount = settings.length;

    if (settings.length === 0) {
      debugInfo.error = 'No active Gmail settings found in database';
      return res.status(200).json({ success: true, data: debugInfo });
    }

    const setting = settings[0];
    debugInfo.account = {
      id: setting.id,
      email: setting.email_address,
      hasAccessToken: !!setting.access_token,
      hasRefreshToken: !!setting.refresh_token,
      tokenExpiresAt: setting.token_expires_at,
      syncEnabled: setting.sync_enabled,
      isActive: setting.is_active,
      lastSyncAt: setting.last_sync_at,
      lastSyncEmailId: setting.last_sync_email_id,
    };

    if (!setting.access_token) {
      debugInfo.error = 'No access token found - Gmail not properly connected';
      return res.status(200).json({ success: true, data: debugInfo });
    }

    // Step 2: Try to connect to Gmail API
    debugInfo.steps.push({ step: 2, action: 'Connecting to Gmail API' });

    let gmail;
    try {
      gmail = await getGmailClient(setting);
      debugInfo.steps.push({ step: 2, result: 'Gmail client created successfully' });
    } catch (error: any) {
      debugInfo.error = `Failed to create Gmail client: ${error.message}`;
      return res.status(200).json({ success: true, data: debugInfo });
    }

    // Step 3: Get user profile to verify connection
    debugInfo.steps.push({ step: 3, action: 'Getting user profile' });

    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      debugInfo.profile = {
        emailAddress: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal,
        threadsTotal: profile.data.threadsTotal,
      };
      debugInfo.steps.push({ step: 3, result: 'Profile fetched successfully' });
    } catch (error: any) {
      debugInfo.error = `Failed to get profile: ${error.message}`;
      return res.status(200).json({ success: true, data: debugInfo });
    }

    // Step 4: Try different search queries
    debugInfo.steps.push({ step: 4, action: 'Testing search queries' });
    debugInfo.searchTests = [];

    const searchQueries = [
      { name: 'All emails (last 7 days)', query: 'newer_than:7d' },
      { name: 'From Interac domain', query: 'from:payments.interac.ca newer_than:60d' },
      { name: 'From specific sender', query: 'from:notify@payments.interac.ca newer_than:60d' },
      { name: 'Subject contains INTERAC', query: 'subject:INTERAC newer_than:60d' },
      { name: 'Subject contains e-Transfer', query: 'subject:e-Transfer newer_than:60d' },
      { name: 'Combined OR query', query: '(from:payments.interac.ca OR subject:INTERAC OR subject:e-Transfer) newer_than:60d' },
    ];

    for (const sq of searchQueries) {
      try {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: sq.query,
          maxResults: 10,
          includeSpamTrash: true,
        });

        const testResult: any = {
          name: sq.name,
          query: sq.query,
          resultSizeEstimate: response.data.resultSizeEstimate,
          messagesFound: response.data.messages?.length || 0,
        };

        // If we found messages, get details of the first one
        if (response.data.messages && response.data.messages.length > 0) {
          const firstMsg = await gmail.users.messages.get({
            userId: 'me',
            id: response.data.messages[0].id!,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date'],
          });

          const headers = firstMsg.data.payload?.headers || [];
          testResult.firstMessage = {
            id: firstMsg.data.id,
            from: headers.find(h => h.name === 'From')?.value,
            subject: headers.find(h => h.name === 'Subject')?.value,
            date: headers.find(h => h.name === 'Date')?.value,
          };
        }

        debugInfo.searchTests.push(testResult);
      } catch (error: any) {
        debugInfo.searchTests.push({
          name: sq.name,
          query: sq.query,
          error: error.message,
        });
      }
    }

    // Step 5: If we found Interac emails, show a sample of email body
    debugInfo.steps.push({ step: 5, action: 'Getting sample email body if available' });

    const interacQuery = 'from:payments.interac.ca newer_than:60d';
    try {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: interacQuery,
        maxResults: 1,
        includeSpamTrash: true,
      });

      if (response.data.messages && response.data.messages.length > 0) {
        const fullMsg = await gmail.users.messages.get({
          userId: 'me',
          id: response.data.messages[0].id!,
          format: 'full',
        });

        const body = parseEmailBody(fullMsg.data);
        debugInfo.sampleEmail = {
          id: fullMsg.data.id,
          bodyPreview: body.substring(0, 1000),
          bodyLength: body.length,
        };
      } else {
        debugInfo.sampleEmail = 'No Interac emails found';
      }
    } catch (error: any) {
      debugInfo.sampleEmail = `Error: ${error.message}`;
    }

    return res.status(200).json({
      success: true,
      data: debugInfo,
    });
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Debug failed',
    });
  }
}
