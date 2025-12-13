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
 */
export function startEmailSyncJob(): void {
  if (intervalId) {
    console.log('[EmailSync] Job already started');
    return;
  }

  // Run immediately on start
  runSync();

  // Schedule to run every 30 minutes (30 * 60 * 1000 = 1800000 ms)
  const SYNC_INTERVAL = 30 * 60 * 1000;

  intervalId = setInterval(runSync, SYNC_INTERVAL);

  console.log('[EmailSync] Background job started - runs every 30 minutes');
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

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  // Delay start to allow database connection
  setTimeout(() => {
    startEmailSyncJob();
  }, 5000);
}
