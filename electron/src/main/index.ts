import { app, BrowserWindow, dialog, shell, globalShortcut } from 'electron';
import { join } from 'path';
import log from 'electron-log';
import { startServers, stopServers, getActivePorts } from './servers';
import { checkMySQLConnection } from './database';
import { createTray, destroyTray } from './tray';
import { setupAutoUpdater } from './updater';
import { createApplicationMenu } from './menu';
import { setupIPC } from './ipc';
import { isSetupRequired, getConfig, initializeConfig, getConfigPath } from './config';
import { showSetupWizard, registerSetupIPC, closeSetupWizard } from './setupWizard';

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

// Get frontend URL from active port (fallback to config if not started yet)
function getFrontendUrl(): string {
  const ports = getActivePorts();
  const port = ports.frontendPort || getConfig().server.frontendPort;
  return `http://localhost:${port}`;
}

// Check for command line flags
function hasSetupFlag(): boolean {
  return process.argv.includes('--setup') || process.argv.includes('--reset-config');
}

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

  const config = getConfig();

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
    const cfg = getConfig();
    if (!isQuitting && cfg.app.minimizeToTray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links and print windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow about:blank for print windows
    if (url === 'about:blank' || url === '') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        },
      };
    }

    // Open external URLs in default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Load the login page
  const loginUrl = `${getFrontendUrl()}/auth/login`;
  mainWindow.loadURL(loginUrl);

  // DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// Show MySQL connection error dialog with reconfigure option
async function showMySQLError(error: string): Promise<void> {
  const config = getConfig();
  const dbInfo = `${config.database.user}@${config.database.host}:${config.database.port}/${config.database.name}`;

  const result = await dialog.showMessageBox({
    type: 'error',
    title: 'Database Connection Failed',
    message: 'Unable to connect to MySQL database',
    detail: `${error}\n\nCurrent config: ${dbInfo}\n\nConfig file: ${getConfigPath()}`,
    buttons: ['Retry', 'Reconfigure', 'Open Config Folder', 'Quit'],
    defaultId: 0,
    cancelId: 3,
  });

  if (result.response === 0) {
    // Retry
    await startApp();
  } else if (result.response === 1) {
    // Reconfigure - show setup wizard
    await showSetupWizard(async () => {
      await startApp();
    });
  } else if (result.response === 2) {
    // Open config folder
    shell.openPath(app.getPath('userData'));
    await showMySQLError(error);
  } else {
    // Quit
    app.quit();
  }
}

// Show startup error
async function showStartupError(error: string): Promise<void> {
  const result = await dialog.showMessageBox({
    type: 'error',
    title: 'Startup Error',
    message: 'Failed to start TMS Desktop',
    detail: `${error}\n\nWould you like to reconfigure the application?`,
    buttons: ['Reconfigure', 'Quit'],
    defaultId: 0,
  });

  if (result.response === 0) {
    await showSetupWizard(async () => {
      await startApp();
    });
  } else {
    app.quit();
  }
}

// Start the main application (after setup is complete)
async function startApp(): Promise<void> {
  log.info('Starting main application...');

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
    const { backendPort, frontendPort } = await startServers();
    log.info(`Servers started successfully (Backend: ${backendPort}, Frontend: ${frontendPort})`);

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
    log.error('Startup error:', error);
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
      splashWindow = null;
    }
    await showStartupError(error.message || 'Unknown error occurred');
  }
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
  log.info(`Config path: ${getConfigPath()}`);
  log.info('='.repeat(50));

  // Register setup wizard IPC handlers
  registerSetupIPC();

  // Initialize config (loads defaults from .env if first run)
  initializeConfig();

  // Check if setup is required
  const setupRequired = isSetupRequired();
  const forceSetup = hasSetupFlag();

  log.info(`Setup required: ${setupRequired}, Force setup: ${forceSetup}`);

  if (setupRequired || forceSetup) {
    // Show setup wizard
    log.info('Showing setup wizard...');
    await showSetupWizard(async () => {
      log.info('Setup complete, starting app...');
      await startApp();
    });
  } else {
    // Start app directly
    await startApp();
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
    closeSetupWizard();
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
export { mainWindow, showSetupWizard };
