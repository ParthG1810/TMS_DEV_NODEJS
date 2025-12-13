/**
 * Gmail Service
 * Handles Gmail OAuth authentication and email fetching
 */

import { google, gmail_v1 } from 'googleapis';
import { query, getConnection } from '../config/database';
import { GmailOAuthSettings } from '../types';

// Gmail API scopes (read-only)
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Interac sender email - multiple possible formats
const INTERAC_SENDERS = [
  'notify@payments.interac.ca',
  'interac@payments.interac.ca',
  'no-reply@payments.interac.ca',
];

/**
 * Create OAuth2 client with credentials from environment
 */
export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_API_URL}/api/gmail/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate OAuth2 authorization URL
 */
export function getAuthUrl(): string {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Get authenticated Gmail client
 */
export async function getGmailClient(settings: GmailOAuthSettings): Promise<gmail_v1.Gmail> {
  const oauth2Client = createOAuth2Client();

  // Check if token is expired
  if (settings.token_expires_at && new Date(settings.token_expires_at) < new Date()) {
    // Refresh the token
    if (!settings.refresh_token) {
      throw new Error('Token expired and no refresh token available');
    }

    oauth2Client.setCredentials({
      refresh_token: settings.refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update tokens in database
    await query(`
      UPDATE gmail_oauth_settings
      SET access_token = ?, token_expires_at = ?, updated_at = NOW()
      WHERE id = ?
    `, [credentials.access_token, new Date(credentials.expiry_date || Date.now() + 3600000), settings.id]);

    oauth2Client.setCredentials(credentials);
  } else {
    oauth2Client.setCredentials({
      access_token: settings.access_token,
      refresh_token: settings.refresh_token,
    });
  }

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Get user's email address from Gmail API
 */
export async function getUserEmail(accessToken: string): Promise<string> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const profile = await gmail.users.getProfile({ userId: 'me' });

  return profile.data.emailAddress || '';
}

/**
 * Save or update Gmail OAuth settings
 */
export async function saveGmailSettings(
  emailAddress: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date,
  createdBy?: number
): Promise<number> {
  // Check if settings already exist for this email
  const existing = await query<GmailOAuthSettings[]>(`
    SELECT id FROM gmail_oauth_settings WHERE email_address = ?
  `, [emailAddress]);

  if (existing.length > 0) {
    // Update existing
    await query(`
      UPDATE gmail_oauth_settings SET
        access_token = ?,
        refresh_token = ?,
        token_expires_at = ?,
        sync_enabled = 1,
        is_active = 1,
        updated_at = NOW()
      WHERE email_address = ?
    `, [accessToken, refreshToken, expiresAt, emailAddress]);

    return existing[0].id;
  } else {
    // Insert new
    const result = await query<any>(`
      INSERT INTO gmail_oauth_settings
        (account_name, email_address, access_token, refresh_token, token_expires_at, sync_enabled, is_active, created_by)
      VALUES ('primary', ?, ?, ?, ?, 1, 1, ?)
    `, [emailAddress, accessToken, refreshToken, expiresAt, createdBy || null]);

    return result.insertId;
  }
}

/**
 * Get active Gmail settings
 */
export async function getActiveGmailSettings(): Promise<GmailOAuthSettings | null> {
  const settings = await query<GmailOAuthSettings[]>(`
    SELECT * FROM gmail_oauth_settings
    WHERE is_active = 1 AND sync_enabled = 1
    LIMIT 1
  `);

  return settings.length > 0 ? settings[0] : null;
}

/**
 * Get Gmail settings by ID
 */
export async function getGmailSettingsById(id: number): Promise<GmailOAuthSettings | null> {
  const settings = await query<GmailOAuthSettings[]>(`
    SELECT * FROM gmail_oauth_settings WHERE id = ?
  `, [id]);

  return settings.length > 0 ? settings[0] : null;
}

/**
 * Get all Gmail settings
 */
export async function getAllGmailSettings(): Promise<GmailOAuthSettings[]> {
  return await query<GmailOAuthSettings[]>(`
    SELECT id, account_name, email_address, last_sync_at, sync_enabled, is_active, created_at
    FROM gmail_oauth_settings
    ORDER BY created_at DESC
  `);
}

/**
 * Disconnect Gmail (remove tokens but keep record)
 */
export async function disconnectGmail(id: number): Promise<boolean> {
  const result = await query<any>(`
    UPDATE gmail_oauth_settings SET
      access_token = NULL,
      refresh_token = NULL,
      token_expires_at = NULL,
      sync_enabled = 0,
      is_active = 0,
      updated_at = NOW()
    WHERE id = ?
  `, [id]);

  return result.affectedRows > 0;
}

/**
 * Update last sync info
 */
export async function updateLastSync(id: number, lastEmailId: string): Promise<void> {
  await query(`
    UPDATE gmail_oauth_settings SET
      last_sync_email_id = ?,
      last_sync_at = NOW(),
      updated_at = NOW()
    WHERE id = ?
  `, [lastEmailId, id]);
}

/**
 * Fetch Interac emails from Gmail
 * @param settings Gmail OAuth settings
 * @param initialSync If true, fetch last 30 days; otherwise incremental
 */
export async function fetchInteracEmails(
  settings: GmailOAuthSettings,
  initialSync: boolean = false
): Promise<gmail_v1.Schema$Message[]> {
  const gmail = await getGmailClient(settings);

  // Build search query - search for Interac e-Transfer emails
  // Use multiple search strategies to catch all Interac emails:
  // 1. from:payments.interac.ca - emails from Interac domain
  // 2. from:notify@payments.interac.ca - specific sender
  // 3. subject contains "INTERAC" - any Interac-related email
  // 4. subject contains "e-Transfer" - e-Transfer notifications
  let searchQuery = 'from:payments.interac.ca OR subject:INTERAC OR subject:e-Transfer OR subject:"e-Transfer"';

  // Add date filter for initial sync
  if (initialSync || !settings.last_sync_email_id || settings.last_sync_email_id === 'initial-sync-complete') {
    // Initial sync: last 60 days (increased from 30)
    searchQuery = `(${searchQuery}) newer_than:60d`;
  }

  // Log detailed info for debugging
  console.log(`[Gmail] Fetching emails for: ${settings.email_address}`);
  console.log(`[Gmail] Initial sync: ${initialSync}`);
  console.log(`[Gmail] Last sync ID: ${settings.last_sync_email_id || 'none'}`);
  console.log(`[Gmail] Search query: ${searchQuery}`);

  const messages: gmail_v1.Schema$Message[] = [];
  let pageToken: string | undefined;

  do {
    console.log(`[Gmail] Making API request with pageToken: ${pageToken || 'none'}`);

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: searchQuery,
      maxResults: 100,
      pageToken,
      includeSpamTrash: true, // Include spam and trash folders
    });

    console.log(`[Gmail] API Response - resultSizeEstimate: ${response.data.resultSizeEstimate}`);
    console.log(`[Gmail] Found ${response.data.messages?.length || 0} messages in this page`);
    console.log(`[Gmail] Next page token: ${response.data.nextPageToken || 'none'}`);

    if (response.data.messages) {
      // For incremental sync, stop when we reach the last synced message
      for (const msg of response.data.messages) {
        // Skip if this is the last synced message (for incremental sync)
        if (!initialSync &&
            settings.last_sync_email_id &&
            settings.last_sync_email_id !== 'initial-sync-complete' &&
            msg.id === settings.last_sync_email_id) {
          console.log(`[Gmail] Reached last synced message: ${msg.id}`);
          return messages;
        }

        // Fetch full message
        try {
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'full',
          });

          messages.push(fullMessage.data);
        } catch (err) {
          console.error(`[Gmail] Error fetching message ${msg.id}:`, err);
        }
      }
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  console.log(`[Gmail] Total messages fetched: ${messages.length}`);
  return messages;
}

/**
 * Parse email body from Gmail message
 */
export function parseEmailBody(message: gmail_v1.Schema$Message): string {
  let body = '';

  const getBody = (payload: gmail_v1.Schema$MessagePart): string => {
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          const partBody = getBody(part);
          if (partBody) return partBody;
        }
      }
    }

    return '';
  };

  if (message.payload) {
    body = getBody(message.payload);
  }

  return body;
}

/**
 * Get email date from headers
 */
export function getEmailDate(message: gmail_v1.Schema$Message): Date {
  const headers = message.payload?.headers || [];
  const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date');

  if (dateHeader?.value) {
    return new Date(dateHeader.value);
  }

  // Fallback to internal date
  return new Date(parseInt(message.internalDate || '0'));
}
