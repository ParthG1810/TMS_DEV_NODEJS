import { autoUpdater, UpdateInfo } from 'electron-updater';
import { BrowserWindow, dialog, app } from 'electron';
import log from 'electron-log';

// Configure auto-updater logging
autoUpdater.logger = log;

// Update status tracking
type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';

let updateStatus: UpdateStatus = 'idle';
let availableVersion: string | undefined;
let downloadProgress: number = 0;
let lastError: string | undefined;

// Setup auto-updater
export function setupAutoUpdater(): void {
  // Configuration
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    updateStatus = 'checking';
    broadcastUpdateStatus();
  });

  autoUpdater.on('update-available', async (info: UpdateInfo) => {
    log.info('Update available:', info.version);
    updateStatus = 'available';
    availableVersion = info.version;
    broadcastUpdateStatus();

    // Notify renderer
    notifyRenderer('updater:available', { version: info.version });

    // Show dialog to user
    const window = BrowserWindow.getFocusedWindow();
    const result = await dialog.showMessageBox(window || undefined as any, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available!`,
      detail: 'Would you like to download it now?',
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    log.info('No updates available. Current version is up to date.');
    updateStatus = 'idle';
    broadcastUpdateStatus();
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${progress.percent.toFixed(2)}%`);
    updateStatus = 'downloading';
    downloadProgress = progress.percent;
    broadcastUpdateStatus();

    // Notify renderer
    notifyRenderer('updater:progress', { percent: progress.percent });

    // Update window progress bar
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.setProgressBar(progress.percent / 100);
    }
  });

  autoUpdater.on('update-downloaded', async (info: UpdateInfo) => {
    log.info('Update downloaded:', info.version);
    updateStatus = 'ready';
    broadcastUpdateStatus();

    // Clear progress bar
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.setProgressBar(-1);
    }

    // Notify renderer
    notifyRenderer('updater:ready', { version: info.version });

    // Show dialog to user
    const result = await dialog.showMessageBox(window || undefined as any, {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded`,
      detail: 'The update will be installed when you restart the application. Restart now?',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  autoUpdater.on('error', (error: Error) => {
    log.error('Auto-updater error:', error);
    updateStatus = 'error';
    lastError = error.message;
    broadcastUpdateStatus();

    // Clear progress bar
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.setProgressBar(-1);
    }

    // Notify renderer
    notifyRenderer('updater:error', error.message);
  });

  // Check for updates on startup (with delay)
  setTimeout(() => {
    checkForUpdates();
  }, 10000); // 10 second delay

  // Check for updates periodically (every 4 hours)
  setInterval(() => {
    checkForUpdates();
  }, 4 * 60 * 60 * 1000);

  log.info('Auto-updater setup complete');
}

// Check for updates manually
export async function checkForUpdates(): Promise<void> {
  log.info('Manually checking for updates...');
  try {
    await autoUpdater.checkForUpdates();
  } catch (error: any) {
    log.error('Failed to check for updates:', error.message);
    updateStatus = 'error';
    lastError = error.message;
    broadcastUpdateStatus();
  }
}

// Download update
export async function downloadUpdate(): Promise<void> {
  log.info('Starting update download...');
  try {
    await autoUpdater.downloadUpdate();
  } catch (error: any) {
    log.error('Failed to download update:', error.message);
    updateStatus = 'error';
    lastError = error.message;
    broadcastUpdateStatus();
  }
}

// Install update (quit and install)
export function installUpdate(): void {
  log.info('Installing update...');
  autoUpdater.quitAndInstall(false, true);
}

// Get current update status
export function getUpdateStatus(): {
  status: UpdateStatus;
  version?: string;
  progress?: number;
  error?: string;
} {
  return {
    status: updateStatus,
    version: availableVersion,
    progress: downloadProgress,
    error: lastError,
  };
}

// Broadcast update status to all renderer processes
function broadcastUpdateStatus(): void {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send('updater:status', getUpdateStatus());
    }
  });
}

// Notify specific event to renderer
function notifyRenderer(channel: string, data: any): void {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, data);
    }
  });
}
