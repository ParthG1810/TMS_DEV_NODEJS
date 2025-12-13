/**
 * Gmail Service
 * Handles Gmail OAuth authentication and email fetching
 */

import { google, gmail_v1 } from 'googleapis';
import { query, getConnection } from '../config/database';
import { GmailOAuthSettings } from '../types';

// Gmail API scopes (read-only)
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Interac sender email
const INTERAC_SENDER = 'notify@payments.interac.ca';

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
 * Update last sync info with detailed tracking
 */
export async function updateLastSync(
  id: number,
  lastEmailId: string,
  lastEmailDate: Date,
  lastEmailSubject: string
): Promise<void> {
  await query(`
    UPDATE gmail_oauth_settings SET
      last_sync_email_id = ?,
      last_sync_email_date = ?,
      last_sync_email_subject = ?,
      last_sync_at = NOW(),
      updated_at = NOW()
    WHERE id = ?
  `, [lastEmailId, lastEmailDate, lastEmailSubject.substring(0, 500), id]);

  console.log(`[Gmail] Updated sync marker: ID=${lastEmailId}, Date=${lastEmailDate.toISOString()}, Subject="${lastEmailSubject.substring(0, 50)}..."`);
}

/**
 * Get email subject from headers
 */
export function getEmailSubject(message: gmail_v1.Schema$Message): string {
  const headers = message.payload?.headers || [];
  const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject');
  return subjectHeader?.value || '(No Subject)';
}

/**
 * Fetch Interac emails from Gmail
 * Uses date-based filtering for robust incremental sync
 * @param settings Gmail OAuth settings
 * @param initialSync If true, fetch last 60 days; otherwise use last sync date
 */
export async function fetchInteracEmails(
  settings: GmailOAuthSettings,
  initialSync: boolean = false
): Promise<gmail_v1.Schema$Message[]> {
  const gmail = await getGmailClient(settings);

  // Base search query - search for Interac e-Transfer emails
  const baseQuery = 'from:payments.interac.ca';

  let searchQuery: string;

  if (initialSync || !settings.last_sync_email_date) {
    // Initial sync: last 60 days
    searchQuery = `${baseQuery} newer_than:60d`;
    console.log(`[Gmail] Performing INITIAL sync (last 60 days)`);
  } else {
    // Incremental sync: use the last sync date
    // Format date as YYYY/MM/DD for Gmail search
    const lastDate = new Date(settings.last_sync_email_date);
    const dateStr = `${lastDate.getFullYear()}/${String(lastDate.getMonth() + 1).padStart(2, '0')}/${String(lastDate.getDate()).padStart(2, '0')}`;
    searchQuery = `${baseQuery} after:${dateStr}`;
    console.log(`[Gmail] Performing INCREMENTAL sync (after ${dateStr})`);
    console.log(`[Gmail] Last synced email: "${settings.last_sync_email_subject?.substring(0, 50)}..." at ${lastDate.toISOString()}`);
  }

  console.log(`[Gmail] Search query: ${searchQuery}`);
  console.log(`[Gmail] Account: ${settings.email_address}`);

  const messages: gmail_v1.Schema$Message[] = [];
  let pageToken: string | undefined;
  const processedIds = new Set<string>();

  // Also track last_sync_email_id to skip already processed emails
  const lastSyncId = settings.last_sync_email_id;

  do {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: searchQuery,
      maxResults: 100,
      pageToken,
      includeSpamTrash: true,
    });

    console.log(`[Gmail] API returned ${response.data.messages?.length || 0} messages, estimate: ${response.data.resultSizeEstimate}`);

    if (response.data.messages) {
      for (const msg of response.data.messages) {
        // Skip if we've already processed this message ID (from previous sync)
        if (lastSyncId && msg.id === lastSyncId) {
          console.log(`[Gmail] Reached last synced message ID: ${msg.id}, stopping`);
          // Still return what we have collected so far (newer messages)
          break;
        }

        // Skip duplicates within this batch
        if (processedIds.has(msg.id!)) {
          continue;
        }
        processedIds.add(msg.id!);

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
 * Handles multipart emails and extracts text content
 */
export function parseEmailBody(message: gmail_v1.Schema$Message): string {
  const bodies: string[] = [];

  const extractBodies = (payload: gmail_v1.Schema$MessagePart | undefined): void => {
    if (!payload) return;

    // If this part has data, decode it
    if (payload.body?.data) {
      const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      bodies.push(decoded);
    }

    // Recursively check all parts (multipart emails)
    if (payload.parts) {
      for (const part of payload.parts) {
        extractBodies(part);
      }
    }
  };

  extractBodies(message.payload);

  // Combine all bodies
  let combinedBody = bodies.join('\n');

  // Strip HTML tags to get plain text
  combinedBody = combinedBody
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  return combinedBody;
}

/**
 * Get full email content including subject for parsing
 */
export function getEmailContent(message: gmail_v1.Schema$Message): string {
  const subject = getEmailSubject(message);
  const body = parseEmailBody(message);

  // Combine subject and body for parsing - this ensures we catch keywords in subject
  return `Subject: ${subject}\n\n${body}`;
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
