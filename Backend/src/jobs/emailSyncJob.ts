/**
 * Email Sync Background Job
 * Runs every 30 minutes to scan Gmail for new Interac e-Transfer emails
 */

import { scanAllGmailAccounts } from '../services/interacScanner';

// Job state
let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;
let lastRunAt: Date | null = null;
let lastRunResults: any = null;
let autoStartAttempted = false;

/**
 * Run the email sync job
 */
async function runSync(): Promise<void> {
  if (isRunning) {
    console.log('[EmailSync] Sync already in progress, skipping...');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  console.log('[EmailSync] Starting scheduled sync...');

  try {
    const results = await scanAllGmailAccounts();

    lastRunAt = new Date();
    lastRunResults = {
      ...results,
      duration: Date.now() - startTime,
    };

    console.log(`[EmailSync] Sync completed in ${lastRunResults.duration}ms`);
    console.log(`[EmailSync] Processed: ${results.totalProcessed}, New: ${results.totalNewTransactions}, Errors: ${results.totalErrors}`);
  } catch (error) {
    console.error('[EmailSync] Error during sync:', error);
    lastRunResults = {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  } finally {
    isRunning = false;
  }
}

/**
 * Start the email sync job (runs every 30 minutes)
 * Note: Does NOT run immediately on start - users should trigger first sync manually
 * @param silent - If true, suppress "already started" log messages (for repeated calls from status API)
 */
export function startEmailSyncJob(silent: boolean = false): void {
  if (intervalId) {
    // Only log if not silent - avoids spam from repeated status API calls
    if (!silent) {
      console.log('[EmailSync] Job already started');
    }
    return;
  }

  console.log('[EmailSync] Starting background job...');

  // DON'T run immediately - let users manually trigger first sync
  // This ensures the "Sync Now" button shows the actual results
  // runSync(); // Removed - was causing confusing "0 emails" on first manual sync

  // Schedule to run every 30 minutes (30 * 60 * 1000 = 1800000 ms)
  const SYNC_INTERVAL = 30 * 60 * 1000;

  intervalId = setInterval(runSync, SYNC_INTERVAL);

  console.log('[EmailSync] Background job started - first auto-sync in 30 minutes');
}

/**
 * Stop the email sync job
 */
export function stopEmailSyncJob(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[EmailSync] Background job stopped');
  }
}

/**
 * Get job status
 */
export function getJobStatus(): {
  running: boolean;
  lastRunAt: Date | null;
  lastRunResults: any;
  nextRunIn: number | null;
} {
  let nextRunIn: number | null = null;

  if (intervalId && lastRunAt) {
    const SYNC_INTERVAL = 30 * 60 * 1000;
    const elapsed = Date.now() - lastRunAt.getTime();
    nextRunIn = Math.max(0, SYNC_INTERVAL - elapsed);
  }

  return {
    running: isRunning,
    lastRunAt,
    lastRunResults,
    nextRunIn,
  };
}

/**
 * Manually trigger a sync (bypasses interval)
 */
export async function triggerManualSync(): Promise<void> {
  await runSync();
}

// Auto-start in both development and production
// Delay start to allow database connection to establish
// Only start if we're in a server environment (not during build)
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
  // Prevent duplicate auto-start attempts (module may be re-imported in Next.js dev mode)
  if (!autoStartAttempted) {
    autoStartAttempted = true;
    setTimeout(() => {
      startEmailSyncJob();
    }, 10000); // 10 second delay to ensure DB is ready
  }
}
