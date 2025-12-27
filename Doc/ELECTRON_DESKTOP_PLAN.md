# TMS Desktop Application Plan

## Executive Summary

This document outlines the plan to convert TMS (Tiffin Management System) into a cross-platform desktop application using **Electron** with **Option A: Embedded Servers** approach. The application will use the **existing local MySQL database** installed on each machine - no database changes required.

---

## 1. Architecture Overview

### Selected Approach: Option A - Electron Wrapper with Local MySQL

```
┌────────────────────────────────────────────────────────────────────────┐
│                         USER'S MACHINE                                  │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                    ELECTRON APPLICATION                         │    │
│  │                                                                 │    │
│  │  ┌─────────────────┐        ┌─────────────────┐                │    │
│  │  │  Main Process   │        │ Renderer Process │                │    │
│  │  │                 │        │  (BrowserWindow) │                │    │
│  │  │  - App Lifecycle│        │                  │                │    │
│  │  │  - IPC Handlers │◄──────►│  Next.js Frontend│                │    │
│  │  │  - Native APIs  │        │  (localhost:8081)│                │    │
│  │  │  - Server Mgmt  │        │                  │                │    │
│  │  └────────┬────────┘        └─────────────────┘                │    │
│  │           │                                                     │    │
│  │  ┌────────▼────────┐                                           │    │
│  │  │  Backend Server │                                           │    │
│  │  │  (localhost:3000)│                                           │    │
│  │  │  Next.js API     │                                           │    │
│  │  └────────┬────────┘                                           │    │
│  └───────────┼────────────────────────────────────────────────────┘    │
│              │                                                          │
│  ┌───────────▼───────────┐                                             │
│  │   LOCAL MySQL 8.0+    │  ◄── Pre-installed on machine               │
│  │   (localhost:3306)    │                                             │
│  │   Database: tms_db    │                                             │
│  └───────────────────────┘                                             │
└────────────────────────────────────────────────────────────────────────┘
```

### Why This Approach?

| Benefit | Description |
|---------|-------------|
| **Minimal Code Changes** | 95%+ of existing code remains unchanged |
| **No Database Migration** | Uses existing MySQL - no schema changes |
| **Single Codebase** | Same code for web and desktop |
| **Fast Development** | Can be production-ready in 4-6 weeks |
| **Proven Stack** | MySQL + Node.js is battle-tested |

---

## 2. Prerequisites for End Users

### MySQL Installation Requirements

Users must have MySQL installed locally before running the TMS Desktop app:

#### Windows
```powershell
# Option 1: MySQL Installer (Recommended)
# Download from: https://dev.mysql.com/downloads/installer/

# Option 2: Using Chocolatey
choco install mysql

# Option 3: Using WinGet
winget install Oracle.MySQL
```

#### macOS
```bash
# Option 1: Using Homebrew (Recommended)
brew install mysql
brew services start mysql

# Option 2: Download DMG from MySQL website
# https://dev.mysql.com/downloads/mysql/
```

#### Linux (Ubuntu/Debian)
```bash
# Install MySQL
sudo apt update
sudo apt install mysql-server

# Start MySQL service
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### Linux (Fedora/RHEL)
```bash
# Install MySQL
sudo dnf install mysql-server

# Start MySQL service
sudo systemctl start mysqld
sudo systemctl enable mysqld
```

---

## 3. Project Structure

```
TMS_DEV_NODEJS/
├── Frontend/                    # Existing Next.js 13 frontend
├── Backend/                     # Existing Next.js 12 API backend
├── database/                    # Existing MySQL schemas
├── electron/                    # NEW - Electron wrapper
│   ├── src/
│   │   ├── main/
│   │   │   ├── index.ts        # Main process entry point
│   │   │   ├── preload.ts      # Preload script for IPC
│   │   │   ├── servers.ts      # Frontend/Backend server manager
│   │   │   ├── database.ts     # MySQL connection checker
│   │   │   ├── tray.ts         # System tray management
│   │   │   ├── updater.ts      # Auto-update logic
│   │   │   ├── menu.ts         # Application menu
│   │   │   └── ipc/
│   │   │       ├── dialogs.ts  # Native file dialogs
│   │   │       ├── printing.ts # Print functionality
│   │   │       └── system.ts   # System info handlers
│   │   └── splash/
│   │       └── index.html      # Splash screen
│   ├── resources/
│   │   ├── icon.ico            # Windows icon
│   │   ├── icon.icns           # macOS icon
│   │   ├── icon.png            # Linux icon (512x512)
│   │   └── icons/              # Linux icon set
│   │       ├── 16x16.png
│   │       ├── 32x32.png
│   │       ├── 64x64.png
│   │       ├── 128x128.png
│   │       ├── 256x256.png
│   │       └── 512x512.png
│   ├── package.json
│   ├── tsconfig.json
│   ├── electron-builder.yml
│   └── forge.config.ts         # Alternative: Electron Forge config
└── package.json                 # Root workspace config
```

---

## 4. Implementation Details

### 4.1 Electron Dependencies

```json
{
  "name": "tms-desktop",
  "version": "1.0.0",
  "description": "TMS - Tiffin Management System Desktop Application",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:electron\" \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:electron": "wait-on http://localhost:8081 && electron .",
    "dev:backend": "cd ../Backend && npm run dev",
    "dev:frontend": "cd ../Frontend && npm run dev",
    "build": "tsc -p tsconfig.json",
    "build:all": "npm run build:backend && npm run build:frontend && npm run build",
    "build:backend": "cd ../Backend && npm run build",
    "build:frontend": "cd ../Frontend && npm run build",
    "package": "npm run build:all && electron-builder",
    "package:win": "npm run build:all && electron-builder --win",
    "package:mac": "npm run build:all && electron-builder --mac",
    "package:linux": "npm run build:all && electron-builder --linux",
    "package:all": "npm run build:all && electron-builder --win --mac --linux"
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.1.8",
    "typescript": "^5.3.0",
    "concurrently": "^9.1.0",
    "wait-on": "^8.0.1",
    "@types/node": "^22.0.0"
  },
  "dependencies": {
    "electron-updater": "^6.3.9",
    "electron-log": "^5.2.4",
    "electron-store": "^10.0.0",
    "mysql2": "^3.11.5"
  }
}
```

### 4.2 Main Process (`electron/src/main/index.ts`)

```typescript
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

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let isQuitting = false;

const isDev = process.env.NODE_ENV === 'development';
const FRONTEND_URL = 'http://localhost:8081';

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

  splashWindow.loadFile(join(__dirname, '../splash/index.html'));
  splashWindow.center();
}

// Create main application window
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 15, y: 15 },
  });

  // Window events
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
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

  // Load the frontend
  mainWindow.loadURL(FRONTEND_URL);

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
    detail: `${error}\n\nPlease ensure:\n1. MySQL is installed and running\n2. Database 'tms_db' exists\n3. Credentials in .env are correct`,
    buttons: ['Retry', 'Open Settings', 'Quit'],
    defaultId: 0,
  });

  if (result.response === 0) {
    // Retry
    await initialize();
  } else if (result.response === 1) {
    // Open settings folder
    shell.openPath(app.getPath('userData'));
  } else {
    // Quit
    app.quit();
  }
}

// Initialize application
async function initialize(): Promise<void> {
  log.info('Starting TMS Desktop Application...');
  log.info(`App version: ${app.getVersion()}`);
  log.info(`Electron version: ${process.versions.electron}`);
  log.info(`Platform: ${process.platform}`);

  // Show splash screen
  createSplashWindow();

  try {
    // Step 1: Check MySQL connection
    log.info('Checking MySQL connection...');
    const dbResult = await checkMySQLConnection();
    if (!dbResult.success) {
      throw new Error(dbResult.error);
    }
    log.info('MySQL connection successful');

    // Step 2: Start backend and frontend servers
    log.info('Starting servers...');
    await startServers();
    log.info('Servers started successfully');

    // Step 3: Create main window
    createMainWindow();

    // Step 4: Setup system tray
    createTray(mainWindow!);

    // Step 5: Setup application menu
    createApplicationMenu();

    // Step 6: Setup IPC handlers
    setupIPC();

    // Step 7: Setup auto-updater (production only)
    if (!isDev) {
      setupAutoUpdater();
    }

    log.info('TMS Desktop Application started successfully');
  } catch (error: any) {
    log.error('Initialization error:', error);
    if (splashWindow) {
      splashWindow.destroy();
    }
    await showMySQLError(error.message);
  }
}

// App lifecycle events
app.whenReady().then(initialize);

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('before-quit', async () => {
  isQuitting = true;
  log.info('Application quitting...');
  destroyTray();
  await stopServers();
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
  dialog.showErrorBox('Error', error.message);
});
```

### 4.3 MySQL Connection Checker (`electron/src/main/database.ts`)

```typescript
import mysql from 'mysql2/promise';
import log from 'electron-log';
import Store from 'electron-store';

const store = new Store();

interface DBConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface ConnectionResult {
  success: boolean;
  error?: string;
}

// Get database configuration
export function getDBConfig(): DBConfig {
  return {
    host: store.get('db.host', 'localhost') as string,
    port: store.get('db.port', 3306) as number,
    user: store.get('db.user', 'root') as string,
    password: store.get('db.password', '') as string,
    database: store.get('db.database', 'tms_db') as string,
  };
}

// Save database configuration
export function saveDBConfig(config: Partial<DBConfig>): void {
  if (config.host) store.set('db.host', config.host);
  if (config.port) store.set('db.port', config.port);
  if (config.user) store.set('db.user', config.user);
  if (config.password !== undefined) store.set('db.password', config.password);
  if (config.database) store.set('db.database', config.database);
}

// Check MySQL connection
export async function checkMySQLConnection(): Promise<ConnectionResult> {
  const config = getDBConfig();

  log.info(`Checking MySQL connection to ${config.host}:${config.port}/${config.database}`);

  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 10000,
    });

    // Test query
    await connection.query('SELECT 1');
    await connection.end();

    log.info('MySQL connection test successful');
    return { success: true };
  } catch (error: any) {
    log.error('MySQL connection failed:', error.message);

    let errorMessage = 'Unknown database error';

    if (error.code === 'ECONNREFUSED') {
      errorMessage = `Cannot connect to MySQL at ${config.host}:${config.port}. Is MySQL running?`;
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      errorMessage = 'Access denied. Check your username and password.';
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      errorMessage = `Database '${config.database}' does not exist. Please create it first.`;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timed out. Check if MySQL is accessible.';
    } else {
      errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
}

// Create database if not exists (optional helper)
export async function ensureDatabaseExists(): Promise<ConnectionResult> {
  const config = getDBConfig();

  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
    await connection.end();

    log.info(`Database '${config.database}' ensured`);
    return { success: true };
  } catch (error: any) {
    log.error('Failed to create database:', error.message);
    return { success: false, error: error.message };
  }
}
```

### 4.4 Server Manager (`electron/src/main/servers.ts`)

```typescript
import { fork, ChildProcess } from 'child_process';
import { join } from 'path';
import { app } from 'electron';
import log from 'electron-log';
import waitOn from 'wait-on';

let backendProcess: ChildProcess | null = null;
let frontendProcess: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === 'development';

// Get paths based on environment
function getPaths() {
  if (isDev) {
    return {
      backend: join(__dirname, '../../../Backend'),
      frontend: join(__dirname, '../../../Frontend'),
    };
  } else {
    // Production: resources are in app.asar.unpacked
    const resourcesPath = join(app.getAppPath(), '..');
    return {
      backend: join(resourcesPath, 'backend'),
      frontend: join(resourcesPath, 'frontend'),
    };
  }
}

// Start backend server
async function startBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const { backend } = getPaths();
    log.info(`Starting backend from: ${backend}`);

    const args = isDev ? ['dev'] : ['start', '-p', '3000'];
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

    backendProcess = fork(
      require.resolve('next/dist/bin/next'),
      args,
      {
        cwd: backend,
        env: {
          ...process.env,
          NODE_ENV: isDev ? 'development' : 'production',
          PORT: '3000',
        },
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        silent: true,
      }
    );

    backendProcess.stdout?.on('data', (data) => {
      log.info(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr?.on('data', (data) => {
      log.warn(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.on('error', (err) => {
      log.error('Backend process error:', err);
      reject(err);
    });

    backendProcess.on('exit', (code) => {
      log.info(`Backend process exited with code ${code}`);
      backendProcess = null;
    });

    // Wait for backend to be ready
    waitOn({
      resources: ['http://localhost:3000/api/health'],
      timeout: 60000,
      interval: 500,
    })
      .then(() => {
        log.info('Backend server is ready on port 3000');
        resolve();
      })
      .catch((err) => {
        log.error('Backend failed to start:', err);
        reject(new Error('Backend server failed to start within timeout'));
      });
  });
}

// Start frontend server
async function startFrontend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const { frontend } = getPaths();
    log.info(`Starting frontend from: ${frontend}`);

    const args = isDev ? ['dev', '-p', '8081'] : ['start', '-p', '8081'];

    frontendProcess = fork(
      require.resolve('next/dist/bin/next'),
      args,
      {
        cwd: frontend,
        env: {
          ...process.env,
          NODE_ENV: isDev ? 'development' : 'production',
          PORT: '8081',
        },
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        silent: true,
      }
    );

    frontendProcess.stdout?.on('data', (data) => {
      log.info(`[Frontend] ${data.toString().trim()}`);
    });

    frontendProcess.stderr?.on('data', (data) => {
      log.warn(`[Frontend] ${data.toString().trim()}`);
    });

    frontendProcess.on('error', (err) => {
      log.error('Frontend process error:', err);
      reject(err);
    });

    frontendProcess.on('exit', (code) => {
      log.info(`Frontend process exited with code ${code}`);
      frontendProcess = null;
    });

    // Wait for frontend to be ready
    waitOn({
      resources: ['http://localhost:8081'],
      timeout: 60000,
      interval: 500,
    })
      .then(() => {
        log.info('Frontend server is ready on port 8081');
        resolve();
      })
      .catch((err) => {
        log.error('Frontend failed to start:', err);
        reject(new Error('Frontend server failed to start within timeout'));
      });
  });
}

// Start all servers
export async function startServers(): Promise<void> {
  log.info('Starting all servers...');

  // Start backend first, then frontend
  await startBackend();
  await startFrontend();

  log.info('All servers started successfully');
}

// Stop all servers
export async function stopServers(): Promise<void> {
  log.info('Stopping all servers...');

  const killProcess = (proc: ChildProcess | null, name: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!proc) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        log.warn(`Force killing ${name} process`);
        proc.kill('SIGKILL');
        resolve();
      }, 5000);

      proc.once('exit', () => {
        clearTimeout(timeout);
        log.info(`${name} process stopped`);
        resolve();
      });

      proc.kill('SIGTERM');
    });
  };

  await Promise.all([
    killProcess(frontendProcess, 'Frontend'),
    killProcess(backendProcess, 'Backend'),
  ]);

  frontendProcess = null;
  backendProcess = null;

  log.info('All servers stopped');
}

// Check if servers are running
export function areServersRunning(): boolean {
  return backendProcess !== null && frontendProcess !== null;
}
```

### 4.5 Preload Script (`electron/src/main/preload.ts`)

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // App Information
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => process.platform,
  isElectron: true,

  // Window Controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // File Dialogs
  showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:save', options),
  showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:open', options),

  // File Operations
  saveFile: (filePath: string, data: Buffer) =>
    ipcRenderer.invoke('file:save', filePath, data),
  readFile: (filePath: string) =>
    ipcRenderer.invoke('file:read', filePath),
  getDownloadsPath: () => ipcRenderer.invoke('file:get-downloads-path'),

  // Printing
  print: (options?: any) => ipcRenderer.invoke('print:content', options),
  printToPDF: (options?: any) => ipcRenderer.invoke('print:to-pdf', options),

  // Notifications
  showNotification: (title: string, body: string, options?: any) =>
    ipcRenderer.invoke('notification:show', { title, body, ...options }),

  // Database Settings
  getDBConfig: () => ipcRenderer.invoke('db:get-config'),
  saveDBConfig: (config: any) => ipcRenderer.invoke('db:save-config', config),
  testDBConnection: () => ipcRenderer.invoke('db:test-connection'),

  // Auto Updates
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('updater:available', (_, info) => callback(info));
  },
  onUpdateProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('updater:progress', (_, progress) => callback(progress));
  },

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
  openPath: (path: string) => ipcRenderer.invoke('shell:open-path', path),
  showItemInFolder: (path: string) => ipcRenderer.invoke('shell:show-in-folder', path),

  // System
  getSystemInfo: () => ipcRenderer.invoke('system:get-info'),
});

// TypeScript declaration for window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>;
      getPlatform: () => string;
      isElectron: boolean;
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      showSaveDialog: (options: any) => Promise<any>;
      showOpenDialog: (options: any) => Promise<any>;
      saveFile: (filePath: string, data: Buffer) => Promise<void>;
      readFile: (filePath: string) => Promise<Buffer>;
      getDownloadsPath: () => Promise<string>;
      print: (options?: any) => Promise<void>;
      printToPDF: (options?: any) => Promise<Buffer>;
      showNotification: (title: string, body: string, options?: any) => Promise<void>;
      getDBConfig: () => Promise<any>;
      saveDBConfig: (config: any) => Promise<void>;
      testDBConnection: () => Promise<{ success: boolean; error?: string }>;
      checkForUpdates: () => Promise<void>;
      downloadUpdate: () => Promise<void>;
      installUpdate: () => Promise<void>;
      onUpdateAvailable: (callback: (info: any) => void) => void;
      onUpdateProgress: (callback: (progress: any) => void) => void;
      openExternal: (url: string) => Promise<void>;
      openPath: (path: string) => Promise<void>;
      showItemInFolder: (path: string) => Promise<void>;
      getSystemInfo: () => Promise<any>;
    };
  }
}
```

### 4.6 System Tray (`electron/src/main/tray.ts`)

```typescript
import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import { join } from 'path';

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow): void {
  const iconPath = join(__dirname, '../../resources/icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show TMS',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Dashboard',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('navigate', '/dashboard');
      },
    },
    {
      label: 'Orders',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('navigate', '/orders');
      },
    },
    {
      label: 'Customers',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('navigate', '/customers');
      },
    },
    { type: 'separator' },
    {
      label: 'Check for Updates',
      click: () => {
        mainWindow.webContents.send('check-updates');
      },
    },
    { type: 'separator' },
    {
      label: `Version ${app.getVersion()}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Quit TMS',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('TMS - Tiffin Management System');
  tray.setContextMenu(contextMenu);

  // Show window on tray click
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
    }
  });

  // Double-click to show
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

export function updateTrayTooltip(message: string): void {
  if (tray) {
    tray.setToolTip(`TMS - ${message}`);
  }
}
```

### 4.7 IPC Handlers (`electron/src/main/ipc/index.ts`)

```typescript
import { ipcMain, dialog, shell, app, BrowserWindow, Notification } from 'electron';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import log from 'electron-log';
import { getDBConfig, saveDBConfig, checkMySQLConnection } from '../database';

export function setupIPC(): void {
  // App info
  ipcMain.handle('app:get-version', () => app.getVersion());

  // Window controls
  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle('window:maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window?.isMaximized()) {
      window.unmaximize();
    } else {
      window?.maximize();
    }
  });

  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle('window:is-maximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });

  // File dialogs
  ipcMain.handle('dialog:save', async (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return dialog.showSaveDialog(window!, {
      title: options.title || 'Save File',
      defaultPath: options.defaultPath || join(app.getPath('downloads'), options.fileName || 'file'),
      filters: options.filters || [
        { name: 'All Files', extensions: ['*'] },
      ],
    });
  });

  ipcMain.handle('dialog:open', async (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return dialog.showOpenDialog(window!, {
      title: options.title || 'Open File',
      defaultPath: options.defaultPath,
      filters: options.filters,
      properties: options.properties || ['openFile'],
    });
  });

  // File operations
  ipcMain.handle('file:save', async (_, filePath, data) => {
    try {
      await writeFile(filePath, data);
      log.info(`File saved: ${filePath}`);
    } catch (error: any) {
      log.error(`Failed to save file: ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('file:read', async (_, filePath) => {
    try {
      return await readFile(filePath);
    } catch (error: any) {
      log.error(`Failed to read file: ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('file:get-downloads-path', () => app.getPath('downloads'));

  // Printing
  ipcMain.handle('print:content', async (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return new Promise((resolve, reject) => {
      window?.webContents.print(
        {
          silent: options?.silent || false,
          printBackground: true,
          ...options,
        },
        (success, errorType) => {
          if (success) {
            resolve(true);
          } else {
            reject(new Error(errorType));
          }
        }
      );
    });
  });

  ipcMain.handle('print:to-pdf', async (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window?.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      ...options,
    });
  });

  // Notifications
  ipcMain.handle('notification:show', (_, { title, body, ...options }) => {
    new Notification({
      title,
      body,
      icon: join(__dirname, '../../../resources/icon.png'),
      ...options,
    }).show();
  });

  // Database config
  ipcMain.handle('db:get-config', () => getDBConfig());
  ipcMain.handle('db:save-config', (_, config) => saveDBConfig(config));
  ipcMain.handle('db:test-connection', () => checkMySQLConnection());

  // Shell operations
  ipcMain.handle('shell:open-external', (_, url) => shell.openExternal(url));
  ipcMain.handle('shell:open-path', (_, path) => shell.openPath(path));
  ipcMain.handle('shell:show-in-folder', (_, path) => shell.showItemInFolder(path));

  // System info
  ipcMain.handle('system:get-info', () => ({
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
  }));

  log.info('IPC handlers registered');
}
```

### 4.8 Electron Builder Configuration (`electron/electron-builder.yml`)

```yaml
appId: com.tms.desktop
productName: TMS Desktop
copyright: Copyright © 2024 TMS

# Output directory
directories:
  output: dist
  buildResources: resources

# Files to include
files:
  - dist/**/*
  - package.json

# Bundle backend and frontend as extra resources (unpacked for server access)
extraResources:
  - from: ../Backend/.next
    to: backend/.next
    filter:
      - "**/*"
  - from: ../Backend/node_modules
    to: backend/node_modules
    filter:
      - "**/*"
  - from: ../Backend/package.json
    to: backend/package.json
  - from: ../Backend/public
    to: backend/public
    filter:
      - "**/*"
  - from: ../Frontend/.next
    to: frontend/.next
    filter:
      - "**/*"
  - from: ../Frontend/node_modules
    to: frontend/node_modules
    filter:
      - "**/*"
  - from: ../Frontend/package.json
    to: frontend/package.json
  - from: ../Frontend/public
    to: frontend/public
    filter:
      - "**/*"

# ASAR archive settings
asar: true
asarUnpack:
  - "**/*.node"
  - "**/node_modules/**"

# Windows Configuration
win:
  target:
    - target: nsis
      arch: [x64]
  icon: resources/icon.ico
  publisherName: TMS
  artifactName: TMS-Desktop-${version}-Windows-Setup.${ext}

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: resources/icon.ico
  uninstallerIcon: resources/icon.ico
  installerHeaderIcon: resources/icon.ico
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: TMS Desktop
  menuCategory: TMS
  license: LICENSE.txt

# macOS Configuration
mac:
  target:
    - target: dmg
      arch: [x64, arm64]
  icon: resources/icon.icns
  category: public.app-category.business
  hardenedRuntime: true
  gatekeeperAssess: false
  artifactName: TMS-Desktop-${version}-macOS-${arch}.${ext}

dmg:
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications
  window:
    width: 540
    height: 400

# Linux Configuration
linux:
  target:
    - target: AppImage
      arch: [x64]
    - target: deb
      arch: [x64]
    - target: rpm
      arch: [x64]
  icon: resources/icons
  category: Office
  maintainer: your-email@example.com
  vendor: TMS
  artifactName: TMS-Desktop-${version}-Linux-${arch}.${ext}
  desktop:
    Name: TMS Desktop
    Comment: Tiffin Management System
    Categories: Office;Business;

appImage:
  license: LICENSE.txt

deb:
  depends:
    - libmysqlclient21
  afterInstall: scripts/after-install.sh

rpm:
  depends:
    - mysql-community-libs

# Auto-update configuration
publish:
  provider: github
  owner: ParthG1810
  repo: TMS_DEV_NODEJS
  releaseType: release
```

---

## 5. Required Backend Changes

### 5.1 Add Health Check Endpoint

Create file: `Backend/pages/api/health.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: number;
  database: 'connected' | 'disconnected';
  version: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tms_db',
    });

    await connection.query('SELECT 1');
    await connection.end();
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
  }

  res.status(dbStatus === 'connected' ? 200 : 503).json({
    status: dbStatus === 'connected' ? 'ok' : 'error',
    timestamp: Date.now(),
    database: dbStatus,
    version: process.env.npm_package_version || '1.0.0',
  });
}
```

### 5.2 Update Environment Variables

Update `Backend/.env`:

```env
# Add these for desktop app compatibility
NODE_ENV=production
PORT=3000

# Database - Local MySQL (same for all platforms)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tms_db

# API URLs for desktop
DEV_API=http://localhost:3000
PRODUCTION_API=http://localhost:3000
```

---

## 6. Frontend Integration

### 6.1 Electron Detection Utility

Create file: `Frontend/src/utils/electron.ts`

```typescript
// Check if running in Electron
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' &&
         window.electronAPI !== undefined &&
         window.electronAPI.isElectron === true;
};

// Get Electron API with type safety
export const getElectronAPI = () => {
  if (!isElectron()) {
    return null;
  }
  return window.electronAPI;
};

// Save file with native dialog (falls back to browser download)
export const saveFileWithDialog = async (
  content: Blob | Buffer,
  fileName: string,
  filters?: { name: string; extensions: string[] }[]
): Promise<boolean> => {
  const api = getElectronAPI();

  if (api) {
    try {
      const result = await api.showSaveDialog({
        fileName,
        filters: filters || [{ name: 'All Files', extensions: ['*'] }],
      });

      if (!result.canceled && result.filePath) {
        const buffer = content instanceof Blob
          ? Buffer.from(await content.arrayBuffer())
          : content;
        await api.saveFile(result.filePath, buffer);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save file:', error);
      return false;
    }
  } else {
    // Browser fallback
    const blob = content instanceof Blob ? content : new Blob([content]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }
};

// Print with native dialog
export const printContent = async (options?: any): Promise<void> => {
  const api = getElectronAPI();

  if (api) {
    await api.print(options);
  } else {
    window.print();
  }
};

// Export to PDF
export const exportToPDF = async (fileName: string): Promise<boolean> => {
  const api = getElectronAPI();

  if (api) {
    try {
      const pdfData = await api.printToPDF();
      return saveFileWithDialog(pdfData, fileName, [
        { name: 'PDF Documents', extensions: ['pdf'] },
      ]);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      return false;
    }
  }
  return false;
};

// Show native notification
export const showNotification = (title: string, body: string): void => {
  const api = getElectronAPI();

  if (api) {
    api.showNotification(title, body);
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
};
```

### 6.2 Desktop-Aware Components Example

```typescript
// Frontend/src/components/ExportButton.tsx
import { useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import { Download } from '@mui/icons-material';
import { isElectron, saveFileWithDialog, exportToPDF } from '@/utils/electron';

interface ExportButtonProps {
  data: any;
  fileName: string;
}

export function ExportButton({ data, fileName }: ExportButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleExportJSON = async () => {
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    await saveFileWithDialog(blob, `${fileName}.json`, [
      { name: 'JSON Files', extensions: ['json'] },
    ]);
    setAnchorEl(null);
  };

  const handleExportPDF = async () => {
    if (isElectron()) {
      await exportToPDF(`${fileName}.pdf`);
    } else {
      window.print();
    }
    setAnchorEl(null);
  };

  return (
    <>
      <Button
        startIcon={<Download />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        Export
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={handleExportJSON}>Export as JSON</MenuItem>
        <MenuItem onClick={handleExportPDF}>Export as PDF</MenuItem>
      </Menu>
    </>
  );
}
```

---

## 7. Build & Distribution

### 7.1 Build Commands

```bash
# Development
cd electron
npm run dev

# Build for current platform
npm run package

# Build for specific platform
npm run package:win      # Windows
npm run package:mac      # macOS
npm run package:linux    # Linux

# Build for all platforms
npm run package:all
```

### 7.2 Output Files

| Platform | Format | File Name |
|----------|--------|-----------|
| Windows | NSIS Installer | `TMS-Desktop-1.0.0-Windows-Setup.exe` |
| macOS Intel | DMG | `TMS-Desktop-1.0.0-macOS-x64.dmg` |
| macOS ARM | DMG | `TMS-Desktop-1.0.0-macOS-arm64.dmg` |
| Linux | AppImage | `TMS-Desktop-1.0.0-Linux-x64.AppImage` |
| Linux | DEB | `TMS-Desktop-1.0.0-Linux-x64.deb` |
| Linux | RPM | `TMS-Desktop-1.0.0-Linux-x64.rpm` |

---

## 8. Installation Guide for End Users

### 8.1 Step 1: Install MySQL

**Windows:**
1. Download MySQL Installer from https://dev.mysql.com/downloads/installer/
2. Run installer and select "MySQL Server"
3. Complete installation with default settings
4. Remember your root password

**macOS:**
```bash
brew install mysql
brew services start mysql
mysql_secure_installation
```

**Linux (Ubuntu):**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo mysql_secure_installation
```

### 8.2 Step 2: Create Database

```sql
-- Connect to MySQL
mysql -u root -p

-- Create database
CREATE DATABASE tms_db;

-- Import schema
USE tms_db;
SOURCE /path/to/TMS_DEV_NODEJS/database/complete_schema.sql;
```

### 8.3 Step 3: Install TMS Desktop

1. Download the installer for your platform
2. Run the installer
3. On first launch, configure database connection:
   - Host: localhost
   - Port: 3306
   - User: root
   - Password: (your MySQL password)
   - Database: tms_db

---

## 9. Recommendations

### 9.1 High Priority

| # | Recommendation | Rationale |
|---|----------------|-----------|
| 1 | **Add MySQL installation check** | Show friendly error if MySQL not found |
| 2 | **Implement database setup wizard** | First-run wizard to create database |
| 3 | **Add connection settings UI** | Allow users to configure DB connection |
| 4 | **Implement auto-backup** | Backup database to user's documents |
| 5 | **Code sign the app** | Required for Windows/macOS distribution |

### 9.2 Performance

| # | Recommendation | Impact |
|---|----------------|--------|
| 1 | **Add splash screen** | Better perceived startup time |
| 2 | **Lazy load frontend routes** | Faster initial render |
| 3 | **Cache static assets** | Reduce server load |
| 4 | **Use production builds** | Significant performance gain |

### 9.3 Security

| # | Recommendation | Implementation |
|---|----------------|----------------|
| 1 | **Store DB password securely** | Use electron-store with encryption |
| 2 | **Enable context isolation** | Already implemented in preload |
| 3 | **Validate all IPC inputs** | Prevent injection attacks |
| 4 | **Use HTTPS for external APIs** | Encrypt network traffic |

---

## 10. Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1** | Week 1 | Project setup, Electron structure, basic window |
| **Phase 2** | Week 2 | Server management, MySQL connection check |
| **Phase 3** | Week 3 | IPC handlers, preload script, native dialogs |
| **Phase 4** | Week 4 | System tray, notifications, auto-updater |
| **Phase 5** | Week 5 | Build configuration, packaging for all platforms |
| **Phase 6** | Week 6 | Testing, bug fixes, documentation |

**Total: 6 weeks**

---

## 11. Framework Comparison (Reference)

| Feature | Electron | Tauri | NW.js | Flutter Desktop |
|---------|----------|-------|-------|-----------------|
| **Bundle Size** | ~150-400MB | ~3-10MB | ~100-300MB | ~20-50MB |
| **Memory Usage** | ~200-300MB | ~30-40MB | ~150-250MB | ~50-100MB |
| **Startup Time** | 1-2s | <0.5s | 1-2s | <1s |
| **Code Reuse** | 95%+ | 70-80% | 95%+ | 0% (rewrite) |
| **Learning Curve** | Low | Medium | Low | High |
| **Node.js Support** | Full | Limited | Full | None |
| **Best For** | Web apps | Lightweight apps | Web apps | New apps |

**Verdict:** For TMS, **Electron is the best choice** because:
- Maximum code reuse (95%+)
- Full Node.js support for backend
- No learning curve for the team
- Works with existing Next.js architecture
- MySQL support via node mysql2 package

---

## 12. Files to Create

| File | Purpose |
|------|---------|
| `electron/package.json` | Electron dependencies and scripts |
| `electron/tsconfig.json` | TypeScript configuration |
| `electron/electron-builder.yml` | Build configuration |
| `electron/src/main/index.ts` | Main process entry |
| `electron/src/main/preload.ts` | Preload script |
| `electron/src/main/servers.ts` | Server manager |
| `electron/src/main/database.ts` | MySQL connection |
| `electron/src/main/tray.ts` | System tray |
| `electron/src/main/menu.ts` | Application menu |
| `electron/src/main/updater.ts` | Auto-updater |
| `electron/src/main/ipc/index.ts` | IPC handlers |
| `electron/src/splash/index.html` | Splash screen |
| `electron/resources/icon.*` | App icons |
| `Backend/pages/api/health.ts` | Health check API |
| `Frontend/src/utils/electron.ts` | Electron utilities |

---

## 13. Conclusion

This plan enables converting TMS to a desktop application with:

- **No database changes** - Uses existing local MySQL
- **Minimal code changes** - 95%+ code reuse
- **Cross-platform support** - Windows, macOS, Linux
- **Native features** - System tray, notifications, file dialogs, printing
- **Auto-updates** - Seamless update distribution
- **6-week timeline** - Fast time to market

The Electron approach is optimal for TMS because it preserves the existing architecture while adding desktop capabilities.
