/**
 * Interac Email Scanner Service
 * Parses Interac e-Transfer notification emails and stores transaction data
 */

import { gmail_v1 } from 'googleapis';
import { query } from '../config/database';
import {
  GmailOAuthSettings,
  InteracTransaction,
} from '../types';
import {
  fetchInteracEmails,
  parseEmailBody,
  getEmailContent,
  getEmailDate,
  getEmailSubject,
  updateLastSync,
  updateLastSyncTime,
  getActiveGmailSettings,
  getAllGmailSettings,
} from './gmailService';
import { autoMatchCustomer, learnCustomerAlias } from './customerMatcher';

/**
 * Interac email parsing patterns - supports multiple email formats
 */
const PATTERNS = {
  // Date patterns
  date: /Date:\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i,

  // Reference Number (if present in email)
  reference: /Reference\s*(?:Number)?:?\s*([A-Za-z0-9]+)/i,

  // Sender name patterns:
  // Pattern 1: "from NAME and it has been" (common in subject/body)
  // Pattern 2: "Sent From: NAME"
  // Pattern 3: "received $XX.XX from NAME"
  senderPatterns: [
    /from\s+([A-Z][A-Za-z\s]+?)\s+and\s+it\s+has\s+been/i,
    /Sent\s*From:\s*([^\n\r<]+)/i,
    /received\s+\$[\d,.]+\s+from\s+([A-Z][A-Za-z\s]+?)(?:\s+and|\.|$)/i,
  ],

  // Amount: Just look for $XX.XX format anywhere
  amount: /\$\s*([\d,]+\.\d{2})/,

  // Deposited confirmation keywords
  deposited: /deposited|Funds Deposited|completed|received|successfully/i,
};

/**
 * Parsed Interac email data
 */
export interface ParsedInteracEmail {
  date: Date;
  senderName: string;
  referenceNumber: string;
  amount: number;
  currency: string;
  rawBody: string;
}

/**
 * Parse an Interac e-Transfer email
 */
export function parseInteracEmail(emailBody: string, emailDate: Date): ParsedInteracEmail | null {
  // Check if this looks like an Interac email
  const hasInteracKeyword = /interac|e-?transfer/i.test(emailBody);

  if (!hasInteracKeyword) {
    return null;
  }

  // Skip OUTGOING transfers (emails that say "Your transfer to X" or "you sent")
  // We only want INCOMING money (emails that say "received from X")
  if (/Your\s+transfer\s+to|you\s+sent\s+to/i.test(emailBody)) {
    return null; // This is money sent OUT, not received
  }

  // Check if this is a deposit notification (money received)
  if (!PATTERNS.deposited.test(emailBody)) {
    return null;
  }

  // Try to find amount
  const amountMatch = emailBody.match(PATTERNS.amount);
  if (!amountMatch) {
    return null;
  }

  // Try multiple sender patterns - order matters!
  let senderName: string | null = null;

  // Pattern 1: "from NAME and it has been" (most reliable)
  const fromAndPattern = /from\s+([A-Z][A-Za-z\s]+?)\s+and\s+it\s+has\s+been/i;
  let match = emailBody.match(fromAndPattern);
  if (match) {
    senderName = match[1].trim();
  }

  // Pattern 2: "received $XX.XX from NAME"
  if (!senderName) {
    const receivedFromPattern = /received\s+\$[\d,.]+\s+from\s+([A-Z][A-Za-z\s]+?)(?:\s+and|\s+at|\.|$)/i;
    match = emailBody.match(receivedFromPattern);
    if (match) {
      senderName = match[1].trim();
    }
  }

  // Pattern 3: "Sent From: NAME" (but limit to first line)
  if (!senderName) {
    const sentFromPattern = /Sent\s+From:\s*([A-Za-z0-9][A-Za-z0-9\s]{1,50}?)(?:\s+Amount|\s*$)/i;
    match = emailBody.match(sentFromPattern);
    if (match) {
      senderName = match[1].trim();
    }
  }

  // Pattern 4: "sent from NAME have been"
  if (!senderName) {
    const sentFromAltPattern = /sent\s+from\s+([A-Za-z0-9][A-Za-z0-9\s]{1,50}?)\s+have\s+been/i;
    match = emailBody.match(sentFromAltPattern);
    if (match) {
      senderName = match[1].trim();
    }
  }

  if (!senderName) {
    console.warn('[InteracParser] Could not find sender name');
    console.warn('[InteracParser] Email preview:', emailBody.substring(0, 300));
    return null;
  }

  // Truncate sender name to max 100 chars for safety
  if (senderName.length > 100) {
    senderName = senderName.substring(0, 100);
  }

  // Try to find reference number (optional - generate one if not found)
  const referenceMatch = emailBody.match(PATTERNS.reference);
  const referenceNumber = referenceMatch
    ? referenceMatch[1].trim()
    : `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const dateMatch = emailBody.match(PATTERNS.date);

  console.log('[InteracParser] Parsed fields:', {
    sender: senderName,
    amount: amountMatch[1],
    reference: referenceNumber,
    hasDate: !!dateMatch,
  });

  // Parse date (use email date as fallback)
  let transactionDate = emailDate;
  if (dateMatch) {
    const parsedDate = new Date(dateMatch[1]);
    if (!isNaN(parsedDate.getTime())) {
      transactionDate = parsedDate;
    }
  }

  // Parse amount (remove commas and convert to number)
  const amountStr = amountMatch[1].replace(/,/g, '');
  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount <= 0) {
    console.warn('Invalid amount in Interac email:', amountMatch[1]);
    return null;
  }

  console.log('[InteracParser] Successfully parsed:', { sender: senderName, amount, reference: referenceNumber });

  return {
    date: transactionDate,
    senderName: senderName,
    referenceNumber: referenceNumber,
    amount,
    currency: 'CAD',
    rawBody: emailBody,
  };
}

/**
 * Check if transaction already exists
 */
async function transactionExists(gmailMessageId: string): Promise<boolean> {
  const result = await query<any[]>(`
    SELECT id FROM interac_transactions WHERE gmail_message_id = ?
  `, [gmailMessageId]);

  return result.length > 0;
}

/**
 * Save parsed Interac transaction to database
 */
async function saveInteracTransaction(
  gmailSettingsId: number,
  gmailMessageId: string,
  parsed: ParsedInteracEmail,
  matchedCustomerId: number | null,
  matchConfidence: number
): Promise<number> {
  const result = await query<any>(`
    INSERT INTO interac_transactions (
      gmail_settings_id, gmail_message_id, email_date,
      sender_name, reference_number, amount, currency,
      raw_email_body, auto_matched_customer_id, match_confidence, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `, [
    gmailSettingsId,
    gmailMessageId,
    parsed.date,
    parsed.senderName,
    parsed.referenceNumber,
    parsed.amount,
    parsed.currency,
    parsed.rawBody,
    matchedCustomerId,
    matchConfidence,
  ]);

  return result.insertId;
}

/**
 * Create notification for new Interac transaction
 */
async function createInteracNotification(
  transactionId: number,
  parsed: ParsedInteracEmail,
  customerId: number | null
): Promise<void> {
  try {
    await query(`
      INSERT INTO payment_notifications (
        customer_id, notification_type, title, message,
        priority, action_url
      ) VALUES (?, 'interac_received', ?, ?, 'medium', ?)
    `, [
      customerId,
      `New Interac Payment: $${parsed.amount.toFixed(2)}`,
      `Payment received from ${parsed.senderName}. Reference: ${parsed.referenceNumber}`,
      `/dashboard/payments/allocate?id=${transactionId}`,
    ]);
  } catch (error) {
    // Notification creation is optional - don't fail the transaction
    console.warn(`[InteracScanner] Could not create notification: ${error}`);
  }
}

/**
 * Process a single Gmail message
 */
async function processGmailMessage(
  settings: GmailOAuthSettings,
  message: gmail_v1.Schema$Message
): Promise<{ success: boolean; transactionId?: number }> {
  const gmailMessageId = message.id!;

  // Skip if already processed
  if (await transactionExists(gmailMessageId)) {
    return { success: true };
  }

  // Get full email content (subject + body) for parsing
  const emailContent = getEmailContent(message);
  const emailDate = getEmailDate(message);

  // Parse Interac transaction data
  const parsed = parseInteracEmail(emailContent, emailDate);

  if (!parsed) {
    // Not a valid Interac deposit email, skip silently
    return { success: true };
  }

  // Try to auto-match customer
  const match = await autoMatchCustomer(parsed.senderName);

  // Save transaction
  const transactionId = await saveInteracTransaction(
    settings.id,
    gmailMessageId,
    parsed,
    match?.customerId || null,
    match?.confidence || 0
  );

  // Create notification
  await createInteracNotification(transactionId, parsed, match?.customerId || null);

  return { success: true, transactionId };
}

/**
 * Scan emails for a single Gmail account
 */
export async function scanGmailAccount(settings: GmailOAuthSettings): Promise<{
  processed: number;
  newTransactions: number;
  errors: number;
}> {
  const results = {
    processed: 0,
    newTransactions: 0,
    errors: 0,
  };

  try {
    // Treat as initial sync if no last_sync_email_date
    const isInitialSync = !settings.last_sync_email_date;
    console.log(`[InteracScanner] Starting scan for ${settings.email_address}`);
    console.log(`[InteracScanner] Initial sync: ${isInitialSync}`);
    if (settings.last_sync_email_date) {
      console.log(`[InteracScanner] Last sync: ${new Date(settings.last_sync_email_date).toISOString()}`);
      console.log(`[InteracScanner] Last email: "${settings.last_sync_email_subject?.substring(0, 50)}..."`);
    }

    const messages = await fetchInteracEmails(settings, isInitialSync);

    console.log(`[InteracScanner] Found ${messages.length} messages to process`);

    // Track the newest message info for sync marker
    let newestMessage: {
      id: string;
      date: Date;
      subject: string;
    } | null = null;

    // Process messages (they come in reverse chronological order from Gmail)
    let debugLoggedFirst = false;
    for (const message of messages) {
      try {
        results.processed++;

        const messageDate = getEmailDate(message);
        const messageSubject = getEmailSubject(message);
        const emailContent = getEmailContent(message);

        // Log first email content for debugging
        if (!debugLoggedFirst) {
          console.log(`[InteracScanner] First email content sample (first 300 chars):`);
          console.log(emailContent.substring(0, 300));
          debugLoggedFirst = true;
        }

        // Track the newest message (first one we see, since Gmail returns newest first)
        if (!newestMessage && message.id) {
          newestMessage = {
            id: message.id,
            date: messageDate,
            subject: messageSubject,
          };
          console.log(`[InteracScanner] Newest message: "${messageSubject.substring(0, 50)}..." from ${messageDate.toISOString()}`);
        }

        const result = await processGmailMessage(settings, message);

        if (result.transactionId) {
          results.newTransactions++;
          console.log(`[InteracScanner] Created transaction #${result.transactionId} from email: "${messageSubject.substring(0, 50)}..."`);
        }
      } catch (error) {
        console.error(`[InteracScanner] Error processing message ${message.id}:`, error);
        results.errors++;
      }
    }

    // Update last sync info with the newest message's details
    if (newestMessage) {
      await updateLastSync(
        settings.id,
        newestMessage.id,
        newestMessage.date,
        newestMessage.subject
      );
      console.log(`[InteracScanner] Sync complete. Marker set to: ${newestMessage.date.toISOString()}`);
    } else {
      // No messages found - still update last_sync_at to show we tried
      await updateLastSyncTime(settings.id);
      console.log(`[InteracScanner] No new messages found, updated sync timestamp`);
    }
  } catch (error) {
    console.error('[InteracScanner] Error scanning Gmail account:', error);
    results.errors++;
  }

  return results;
}

/**
 * Scan all active Gmail accounts
 */
export async function scanAllGmailAccounts(): Promise<{
  totalProcessed: number;
  totalNewTransactions: number;
  totalErrors: number;
  accountResults: { email: string; results: ReturnType<typeof scanGmailAccount> extends Promise<infer T> ? T : never }[];
}> {
  const allSettings = await getAllGmailSettings();
  const activeSettings = allSettings.filter(s => s.sync_enabled && s.is_active);

  const aggregatedResults = {
    totalProcessed: 0,
    totalNewTransactions: 0,
    totalErrors: 0,
    accountResults: [] as any[],
  };

  for (const settings of activeSettings) {
    console.log(`[InteracScanner] Scanning account: ${settings.email_address}`);

    // Need to fetch full settings with tokens
    const fullSettings = await query<GmailOAuthSettings[]>(`
      SELECT * FROM gmail_oauth_settings WHERE id = ?
    `, [settings.id]);

    if (fullSettings.length === 0 || !fullSettings[0].access_token) {
      console.warn(`[InteracScanner] Skipping ${settings.email_address} - no valid tokens`);
      continue;
    }

    const results = await scanGmailAccount(fullSettings[0]);

    aggregatedResults.totalProcessed += results.processed;
    aggregatedResults.totalNewTransactions += results.newTransactions;
    aggregatedResults.totalErrors += results.errors;
    aggregatedResults.accountResults.push({
      email: settings.email_address,
      results,
    });
  }

  return aggregatedResults;
}

/**
 * Get pending Interac transactions
 */
export async function getPendingInteracTransactions(): Promise<InteracTransaction[]> {
  return await query<InteracTransaction[]>(`
    SELECT it.*,
           c1.name as auto_matched_customer_name,
           c2.name as confirmed_customer_name
    FROM interac_transactions it
    LEFT JOIN customers c1 ON it.auto_matched_customer_id = c1.id
    LEFT JOIN customers c2 ON it.confirmed_customer_id = c2.id
    WHERE it.status = 'pending' AND it.deleted_flag = 0
    ORDER BY it.email_date DESC
  `);
}

/**
 * Get Interac transaction by ID
 */
export async function getInteracTransactionById(id: number): Promise<InteracTransaction | null> {
  const results = await query<InteracTransaction[]>(`
    SELECT it.*,
           c1.name as auto_matched_customer_name,
           c2.name as confirmed_customer_name
    FROM interac_transactions it
    LEFT JOIN customers c1 ON it.auto_matched_customer_id = c1.id
    LEFT JOIN customers c2 ON it.confirmed_customer_id = c2.id
    WHERE it.id = ? AND it.deleted_flag = 0
  `, [id]);

  return results.length > 0 ? results[0] : null;
}

/**
 * Confirm customer match for a transaction
 */
export async function confirmCustomerMatch(
  transactionId: number,
  customerId: number
): Promise<boolean> {
  // Get the transaction to learn the alias
  const transaction = await getInteracTransactionById(transactionId);

  if (!transaction) {
    return false;
  }

  // Update the transaction with confirmed customer
  await query(`
    UPDATE interac_transactions SET
      confirmed_customer_id = ?,
      updated_at = NOW()
    WHERE id = ?
  `, [customerId, transactionId]);

  // Learn this alias for future matching
  await learnCustomerAlias(customerId, transaction.sender_name);

  return true;
}

/**
 * Ignore/delete an Interac transaction
 */
export async function ignoreInteracTransaction(
  transactionId: number,
  deletedBy: number
): Promise<boolean> {
  const result = await query<any>(`
    UPDATE interac_transactions SET
      status = 'ignored',
      deleted_flag = 1,
      deleted_at = NOW(),
      deleted_by = ?,
      updated_at = NOW()
    WHERE id = ?
  `, [deletedBy, transactionId]);

  return result.affectedRows > 0;
}

/**
 * Mark transaction as allocated
 */
export async function markTransactionAllocated(transactionId: number): Promise<boolean> {
  const result = await query<any>(`
    UPDATE interac_transactions SET
      status = 'allocated',
      updated_at = NOW()
    WHERE id = ?
  `, [transactionId]);

  return result.affectedRows > 0;
}
