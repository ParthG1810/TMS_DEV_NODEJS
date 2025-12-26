import { app, BrowserWindow, dialog, shell } from 'electron';
import { join } from 'path';
import log from 'electron-log';
import { startServers, stopServers } from './servers';
import { checkMySQLConnection } from './database';
import { createTray, destroyTray } from './tray';
import { setupAutoUpdater } from './updater';
import { createApplicationMenu } from './menu';
import { setupIPC } from './ipc';

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let isQuitting = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const FRONTEND_URL = 'http://localhost:8081';
const LOGIN_URL = `${FRONTEND_URL}/auth/login`;

// Create splash screen
function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const splashPath = isDev
    ? join(__dirname, '../../src/splash/index.html')
    : join(__dirname, '../../src/splash/index.html');

  splashWindow.loadFile(splashPath);
  splashWindow.center();
}

// Create main application window
function createMainWindow(): void {
  const iconPath = isDev
    ? join(__dirname, '../../resources/icon.png')
    : join(process.resourcesPath, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#ffffff',
  });

  // Window events
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
      splashWindow = null;
    }
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform === 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the login page directly
  mainWindow.loadURL(LOGIN_URL);

  // DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// Show MySQL connection error dialog
async function showMySQLError(error: string): Promise<void> {
  const result = await dialog.showMessageBox({
    type: 'error',
    title: 'Database Connection Failed',
    message: 'Unable to connect to MySQL database',
    detail: `${error}\n\nPlease ensure:\n1. MySQL is installed and running\n2. Database 'tms_db' exists\n3. Check your database credentials`,
    buttons: ['Retry', 'Configure Database', 'Quit'],
    defaultId: 0,
    cancelId: 2,
  });

  if (result.response === 0) {
    // Retry
    await initialize();
  } else if (result.response === 1) {
    // Open settings folder
    shell.openPath(app.getPath('userData'));
    await showMySQLError(error);
  } else {
    // Quit
    app.quit();
  }
}

// Show startup error
async function showStartupError(error: string): Promise<void> {
  await dialog.showMessageBox({
    type: 'error',
    title: 'Startup Error',
    message: 'Failed to start TMS Desktop',
    detail: error,
    buttons: ['Quit'],
  });
  app.quit();
}

// Initialize application
async function initialize(): Promise<void> {
  log.info('='.repeat(50));
  log.info('Starting TMS Desktop Application...');
  log.info(`App version: ${app.getVersion()}`);
  log.info(`Electron version: ${process.versions.electron}`);
  log.info(`Node version: ${process.versions.node}`);
  log.info(`Platform: ${process.platform} ${process.arch}`);
  log.info(`Dev mode: ${isDev}`);
  log.info('='.repeat(50));

  // Show splash screen
  createSplashWindow();

  try {
    // Step 1: Check MySQL connection
    log.info('Step 1: Checking MySQL connection...');
    const dbResult = await checkMySQLConnection();
    if (!dbResult.success) {
      log.error('MySQL connection failed:', dbResult.error);
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.destroy();
        splashWindow = null;
      }
      await showMySQLError(dbResult.error || 'Unknown database error');
      return;
    }
    log.info('MySQL connection successful');

    // Step 2: Start backend and frontend servers
    log.info('Step 2: Starting servers...');
    await startServers();
    log.info('Servers started successfully');

    // Step 3: Create main window
    log.info('Step 3: Creating main window...');
    createMainWindow();

    // Step 4: Setup system tray
    log.info('Step 4: Setting up system tray...');
    if (mainWindow) {
      createTray(mainWindow);
    }

    // Step 5: Setup application menu
    log.info('Step 5: Setting up application menu...');
    createApplicationMenu();

    // Step 6: Setup IPC handlers
    log.info('Step 6: Setting up IPC handlers...');
    setupIPC();

    // Step 7: Setup auto-updater (production only)
    if (!isDev) {
      log.info('Step 7: Setting up auto-updater...');
      setupAutoUpdater();
    }

    log.info('TMS Desktop Application started successfully!');
  } catch (error: any) {
    log.error('Initialization error:', error);
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
      splashWindow = null;
    }
    await showStartupError(error.message || 'Unknown error occurred');
  }
}

// App lifecycle events
app.whenReady().then(initialize);

app.on('second-instance', () => {
  log.info('Second instance detected, focusing main window');
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('before-quit', async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    log.info('Application quitting...');
    destroyTray();
    await stopServers();
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  } else {
    mainWindow.show();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
  dialog.showErrorBox('Unexpected Error', error.message);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});

// Export for use in other modules
export { mainWindow };
