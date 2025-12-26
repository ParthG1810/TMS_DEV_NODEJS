# Electron Desktop Application Plan for TMS

## Executive Summary

This document outlines a comprehensive plan to convert the TMS (Tiffin Management System) web application into a cross-platform desktop application using Electron. The plan covers architecture decisions, implementation approaches, and recommendations.

---

## 1. Current Application Architecture

### Overview
| Component | Technology | Port |
|-----------|------------|------|
| Frontend | Next.js 13 + React 18 + TypeScript | 8081 |
| Backend | Next.js 12 API Server | 3000 |
| Database | MySQL 8.0+ | 3306 |
| UI Library | Material-UI v5 | - |
| State Management | Redux Toolkit | - |

### Key Characteristics
- Decoupled frontend/backend architecture
- REST API communication via Axios
- JWT-based authentication
- 91 API endpoints
- File uploads and storage
- Gmail OAuth integration
- Multi-language support (i18n)

---

## 2. Proposed Architecture Options

### Option A: Electron Wrapper with Embedded Servers (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Backend Server │  │ Frontend Server │  │   MySQL     │ │
│  │   (Port 3000)   │  │   (Port 8081)   │  │ (Embedded)  │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                    │                   │        │
│  ┌────────┴────────────────────┴───────────────────┴──────┐ │
│  │              BrowserWindow (Renderer Process)          │ │
│  │                    Next.js Frontend                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Pros:**
- ✅ Minimal code changes required
- ✅ Preserves existing architecture
- ✅ Easy to maintain parity with web version
- ✅ Faster time to market
- ✅ Can still connect to remote servers if needed

**Cons:**
- ❌ Larger application bundle size (~200-400MB)
- ❌ Higher memory usage
- ❌ Requires bundling Node.js runtime

---

### Option B: Electron with Direct Database Access

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │           IPC Handlers (Database Operations)            ││
│  │    ┌──────────────┐    ┌────────────────────────┐      ││
│  │    │   SQLite/    │    │   Business Logic       │      ││
│  │    │  Better-SQL  │    │   (Migrated Services)  │      ││
│  │    └──────────────┘    └────────────────────────┘      ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │              BrowserWindow (Renderer Process)           ││
│  │              React Frontend (Without Next.js)           ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Pros:**
- ✅ Smaller application size (~100-150MB)
- ✅ Better performance (no network overhead)
- ✅ True offline-first capability
- ✅ More "native" desktop feel

**Cons:**
- ❌ Significant code rewrite required
- ❌ Need to migrate from MySQL to SQLite
- ❌ Separate codebases to maintain
- ❌ Loss of remote server connectivity

---

### Option C: Hybrid Approach (Best of Both Worlds)

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  IPC Bridge Layer                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │  │
│  │  │Local SQLite │  │Remote MySQL │  │  Sync Engine  │  │  │
│  │  │  (Offline)  │◄─┤  (Online)   │◄─┤ (Background)  │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              BrowserWindow (Renderer Process)          │  │
│  │                  React Frontend (Vite)                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Pros:**
- ✅ Works offline and online
- ✅ Data synchronization capability
- ✅ Modern frontend build (Vite is faster than Webpack)
- ✅ Moderate bundle size (~150-200MB)

**Cons:**
- ❌ Complex sync logic
- ❌ Conflict resolution challenges
- ❌ More development time

---

## 3. Recommended Approach: Option A (Phased Implementation)

Given the existing mature codebase with 91 API endpoints, I recommend **Option A** as the initial implementation, with the possibility to evolve toward Option C in the future.

### Rationale
1. **Time to Market**: Minimal code changes mean faster deployment
2. **Code Reuse**: 90%+ of existing code can be reused
3. **Maintainability**: Single codebase for web and desktop
4. **Risk Mitigation**: Proven architecture, lower chance of bugs

---

## 4. Implementation Plan

### Phase 1: Project Setup (Week 1-2)

#### 4.1 Create Electron Directory Structure

```
TMS_DEV_NODEJS/
├── Frontend/                 # Existing
├── Backend/                  # Existing
├── database/                 # Existing
├── electron/                 # NEW - Electron wrapper
│   ├── main/
│   │   ├── index.ts         # Main process entry
│   │   ├── preload.ts       # Preload script
│   │   ├── server.ts        # Backend server manager
│   │   └── utils/
│   │       ├── paths.ts     # Path utilities
│   │       ├── database.ts  # Database manager
│   │       └── updater.ts   # Auto-update logic
│   ├── renderer/            # Frontend assets
│   ├── resources/           # Icons, assets
│   │   ├── icon.ico         # Windows icon
│   │   ├── icon.icns        # macOS icon
│   │   └── icon.png         # Linux icon
│   ├── package.json
│   ├── electron-builder.yml # Build configuration
│   └── tsconfig.json
└── package.json             # Root workspace config
```

#### 4.2 Core Dependencies

```json
{
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1",
    "electron-devtools-installer": "^3.2.0",
    "concurrently": "^8.2.2",
    "wait-on": "^7.2.0",
    "cross-env": "^7.0.3"
  },
  "dependencies": {
    "electron-store": "^8.1.0",
    "electron-updater": "^6.1.7",
    "electron-log": "^5.0.1",
    "fix-path": "^4.0.0"
  }
}
```

---

### Phase 2: Main Process Implementation (Week 2-3)

#### 4.3 Main Process Entry (`electron/main/index.ts`)

```typescript
import { app, BrowserWindow, ipcMain, shell, Menu, Tray } from 'electron';
import { join } from 'path';
import { startBackendServer, stopBackendServer } from './server';
import { setupAutoUpdater } from './utils/updater';
import { initDatabase } from './utils/database';
import log from 'electron-log';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const FRONTEND_URL = 'http://localhost:8081';
const BACKEND_URL = 'http://localhost:3000';

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    icon: join(__dirname, '../resources/icon.png'),
    show: false, // Show when ready
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the frontend
  await mainWindow.loadURL(FRONTEND_URL);

  // DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform === 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initialize() {
  log.info('Starting TMS Desktop Application...');

  // Initialize database (if using embedded)
  await initDatabase();

  // Start backend server
  await startBackendServer();

  // Create main window
  await createWindow();

  // Setup auto-updater
  setupAutoUpdater();

  // Create system tray
  createTray();

  log.info('TMS Desktop Application started successfully');
}

function createTray() {
  tray = new Tray(join(__dirname, '../resources/icon.png'));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show TMS', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } }
  ]);

  tray.setToolTip('TMS - Tiffin Management System');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => mainWindow?.show());
}

// App lifecycle
app.whenReady().then(initialize);

app.on('before-quit', async () => {
  isQuitting = true;
  await stopBackendServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});
```

#### 4.4 Backend Server Manager (`electron/main/server.ts`)

```typescript
import { fork, ChildProcess } from 'child_process';
import { join } from 'path';
import log from 'electron-log';
import waitOn from 'wait-on';

let backendProcess: ChildProcess | null = null;

export async function startBackendServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const backendPath = join(__dirname, '../../Backend');

    log.info('Starting backend server...');

    // Fork the backend process
    backendProcess = fork(
      join(backendPath, 'node_modules/.bin/next'),
      ['start', '-p', '3000'],
      {
        cwd: backendPath,
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      }
    );

    backendProcess.stdout?.on('data', (data) => {
      log.info(`[Backend] ${data.toString()}`);
    });

    backendProcess.stderr?.on('data', (data) => {
      log.error(`[Backend Error] ${data.toString()}`);
    });

    backendProcess.on('error', (err) => {
      log.error('Backend process error:', err);
      reject(err);
    });

    // Wait for backend to be ready
    waitOn({
      resources: ['http://localhost:3000/api/health'],
      timeout: 30000,
    })
      .then(() => {
        log.info('Backend server is ready');
        resolve();
      })
      .catch((err) => {
        log.error('Backend server failed to start:', err);
        reject(err);
      });
  });
}

export async function stopBackendServer(): Promise<void> {
  if (backendProcess) {
    log.info('Stopping backend server...');
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
}
```

---

### Phase 3: Database Integration (Week 3-4)

#### 4.5 Embedded Database Options

**Option A: Bundled MySQL (Recommended for Full Compatibility)**

Use `mysql-server` binaries bundled with the app:
- Windows: MariaDB Portable
- macOS: MySQL.prefPane or Homebrew bundle
- Linux: AppImage with MySQL

**Option B: SQLite Migration (For Simpler Deployment)**

```typescript
// electron/main/utils/database.ts
import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import log from 'electron-log';

let db: Database.Database | null = null;

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'tms.db');

  log.info(`Initializing database at: ${dbPath}`);

  db = new Database(dbPath);

  // Run migrations
  runMigrations();
}

function runMigrations(): void {
  // Migration logic here
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}
```

**Option C: Docker-based MySQL (For Power Users)**

```typescript
// Launch MySQL container on startup
import { exec } from 'child_process';

async function startDockerMySQL(): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(
      'docker run -d --name tms-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=tms_db -p 3306:3306 mysql:8.0',
      (error, stdout) => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
}
```

---

### Phase 4: Build Configuration (Week 4)

#### 4.6 Electron Builder Configuration (`electron/electron-builder.yml`)

```yaml
appId: com.tms.desktop
productName: TMS Desktop
copyright: Copyright © 2024 TMS

directories:
  output: dist
  buildResources: resources

files:
  - "main/**/*"
  - "preload/**/*"
  - "!node_modules/**/*"
  - "node_modules/**/*"

extraResources:
  - from: "../Backend"
    to: "backend"
    filter:
      - "**/*"
      - "!node_modules/**/*"
  - from: "../Frontend"
    to: "frontend"
    filter:
      - ".next/**/*"
      - "public/**/*"
      - "package.json"

# Windows Configuration
win:
  target:
    - target: nsis
      arch: [x64]
    - target: portable
      arch: [x64]
  icon: resources/icon.ico
  publisherName: TMS

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: resources/icon.ico
  uninstallerIcon: resources/icon.ico
  installerHeaderIcon: resources/icon.ico
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: TMS Desktop

# macOS Configuration
mac:
  target:
    - target: dmg
      arch: [x64, arm64]
    - target: zip
      arch: [x64, arm64]
  icon: resources/icon.icns
  category: public.app-category.business
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: entitlements.mac.plist
  entitlementsInherit: entitlements.mac.inherit.plist

dmg:
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications

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
  maintainer: tms@example.com
  vendor: TMS

# Auto-update configuration
publish:
  provider: github
  owner: your-github-username
  repo: TMS_DEV_NODEJS
  releaseType: release
```

---

### Phase 5: Native Integrations (Week 5)

#### 4.7 System Tray with Notifications

```typescript
// electron/main/notifications.ts
import { Notification, nativeImage } from 'electron';
import { join } from 'path';

export function showNotification(title: string, body: string): void {
  const icon = nativeImage.createFromPath(
    join(__dirname, '../resources/icon.png')
  );

  new Notification({
    title,
    body,
    icon,
  }).show();
}

// Usage: New order notification
export function notifyNewOrder(customerName: string, orderDetails: string): void {
  showNotification(
    `New Order from ${customerName}`,
    orderDetails
  );
}
```

#### 4.8 Native File Dialog Integration

```typescript
// electron/main/dialogs.ts
import { dialog, ipcMain, BrowserWindow } from 'electron';

ipcMain.handle('show-save-dialog', async (event, options) => {
  const window = BrowserWindow.fromWebContents(event.sender);

  const result = await dialog.showSaveDialog(window!, {
    title: options.title || 'Save File',
    defaultPath: options.defaultPath,
    filters: options.filters || [
      { name: 'PDF Documents', extensions: ['pdf'] },
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
      { name: 'All Files', extensions: ['*'] }
    ],
  });

  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const window = BrowserWindow.fromWebContents(event.sender);

  const result = await dialog.showOpenDialog(window!, {
    title: options.title || 'Open File',
    properties: options.properties || ['openFile'],
    filters: options.filters,
  });

  return result;
});
```

#### 4.9 Print Integration

```typescript
// electron/main/printing.ts
import { ipcMain, BrowserWindow } from 'electron';

ipcMain.handle('print-content', async (event, options) => {
  const window = BrowserWindow.fromWebContents(event.sender);

  return new Promise((resolve, reject) => {
    window?.webContents.print(
      {
        silent: options.silent || false,
        printBackground: true,
        margins: { marginType: 'default' },
      },
      (success, errorType) => {
        if (success) resolve(true);
        else reject(new Error(errorType));
      }
    );
  });
});

ipcMain.handle('print-to-pdf', async (event, options) => {
  const window = BrowserWindow.fromWebContents(event.sender);

  const pdfData = await window?.webContents.printToPDF({
    printBackground: true,
    margins: { marginType: 'default' },
    pageSize: options.pageSize || 'A4',
  });

  return pdfData;
});
```

---

### Phase 6: Auto-Update System (Week 5-6)

#### 4.10 Auto-Updater Implementation

```typescript
// electron/main/utils/updater.ts
import { autoUpdater } from 'electron-updater';
import { dialog, BrowserWindow } from 'electron';
import log from 'electron-log';

export function setupAutoUpdater(): void {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
  });

  autoUpdater.on('update-available', async (info) => {
    log.info('Update available:', info.version);

    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available. Would you like to download it?`,
      buttons: ['Download', 'Later'],
      defaultId: 0,
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No updates available');
  });

  autoUpdater.on('download-progress', (progress) => {
    const window = BrowserWindow.getFocusedWindow();
    window?.setProgressBar(progress.percent / 100);
    log.info(`Download progress: ${progress.percent.toFixed(2)}%`);
  });

  autoUpdater.on('update-downloaded', async (info) => {
    const window = BrowserWindow.getFocusedWindow();
    window?.setProgressBar(-1); // Remove progress bar

    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded. Restart now to apply the update?`,
      buttons: ['Restart', 'Later'],
      defaultId: 0,
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err);
  });

  // Check for updates on startup (with delay)
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 10000);

  // Check for updates every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 4 * 60 * 60 * 1000);
}
```

---

### Phase 7: Frontend Modifications (Week 6)

#### 4.11 Preload Script for IPC

```typescript
// electron/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => process.platform,

  // File dialogs
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),

  // File operations
  writeFile: (path: string, data: any) => ipcRenderer.invoke('write-file', path, data),
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),

  // Printing
  print: (options: any) => ipcRenderer.invoke('print-content', options),
  printToPDF: (options: any) => ipcRenderer.invoke('print-to-pdf', options),

  // Notifications
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('show-notification', title, body),

  // Database (if using embedded)
  dbQuery: (sql: string, params: any[]) => ipcRenderer.invoke('db-query', sql, params),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
});
```

#### 4.12 Frontend Electron Detection

```typescript
// Frontend/src/utils/electron.ts
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' &&
         window.electronAPI !== undefined;
};

export const getElectronAPI = () => {
  if (!isElectron()) {
    throw new Error('Not running in Electron');
  }
  return (window as any).electronAPI;
};

// Usage example
export const saveFileWithDialog = async (
  content: Blob,
  defaultName: string
): Promise<boolean> => {
  if (isElectron()) {
    const api = getElectronAPI();
    const result = await api.showSaveDialog({
      defaultPath: defaultName,
    });

    if (!result.canceled && result.filePath) {
      const buffer = await content.arrayBuffer();
      await api.writeFile(result.filePath, Buffer.from(buffer));
      return true;
    }
    return false;
  } else {
    // Fallback to browser download
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }
};
```

---

## 5. Development Workflow

### 5.1 Development Scripts

```json
// electron/package.json
{
  "name": "tms-desktop",
  "version": "1.0.0",
  "main": "main/index.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:main\" \"npm run dev:renderer\"",
    "dev:main": "electron .",
    "dev:renderer": "cd ../Frontend && yarn dev",
    "build": "tsc && npm run build:renderer",
    "build:renderer": "cd ../Frontend && yarn build",
    "package": "electron-builder --config electron-builder.yml",
    "package:win": "electron-builder --win --config electron-builder.yml",
    "package:mac": "electron-builder --mac --config electron-builder.yml",
    "package:linux": "electron-builder --linux --config electron-builder.yml",
    "publish": "electron-builder --publish always"
  }
}
```

### 5.2 Root Package.json Workspaces

```json
// package.json (root)
{
  "name": "tms-monorepo",
  "private": true,
  "workspaces": [
    "Frontend",
    "Backend",
    "electron"
  ],
  "scripts": {
    "dev:web": "concurrently \"npm run dev --workspace=Backend\" \"npm run dev --workspace=Frontend\"",
    "dev:desktop": "npm run dev --workspace=electron",
    "build:desktop": "npm run build --workspace=electron && npm run package --workspace=electron",
    "build:all": "npm run build --workspace=Backend && npm run build --workspace=Frontend && npm run build --workspace=electron"
  }
}
```

---

## 6. Recommendations

### 6.1 High Priority Recommendations

| # | Recommendation | Rationale |
|---|----------------|-----------|
| 1 | **Start with Option A** | Fastest path to desktop app with minimal risk |
| 2 | **Add health check endpoint** | Required for server startup verification |
| 3 | **Implement proper logging** | Essential for debugging desktop issues |
| 4 | **Use electron-store** | For persisting user preferences locally |
| 5 | **Code sign your app** | Required for macOS Gatekeeper and Windows SmartScreen |

### 6.2 Performance Recommendations

| # | Recommendation | Impact |
|---|----------------|--------|
| 1 | **Lazy load heavy components** | Faster startup time |
| 2 | **Use background workers** | Prevent UI freezes during heavy operations |
| 3 | **Implement splash screen** | Better perceived performance |
| 4 | **Cache API responses** | Reduce server load and improve responsiveness |
| 5 | **Use production builds** | Significant performance improvement |

### 6.3 Security Recommendations

| # | Recommendation | Implementation |
|---|----------------|----------------|
| 1 | **Enable context isolation** | `contextIsolation: true` (already recommended) |
| 2 | **Disable node integration** | `nodeIntegration: false` (already recommended) |
| 3 | **Use preload scripts** | For controlled IPC exposure |
| 4 | **Validate IPC inputs** | Prevent injection attacks |
| 5 | **Store secrets securely** | Use `electron-store` with encryption |

### 6.4 Distribution Recommendations

| Platform | Recommended Format | Notes |
|----------|-------------------|-------|
| Windows | NSIS Installer | User-friendly, supports auto-update |
| macOS | DMG + Notarization | Required for distribution |
| Linux | AppImage | Universal, no root required |

---

## 7. File Modifications Required

### 7.1 Backend Changes

1. **Add health check endpoint** (`Backend/pages/api/health.ts`):
```typescript
export default function handler(req, res) {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
}
```

2. **Update CORS configuration** for localhost variations

3. **Make file paths configurable** for electron app data directory

### 7.2 Frontend Changes

1. **Add electron detection utility**
2. **Conditionally use native dialogs** for file save/open
3. **Add native print support** for invoices/labels
4. **Update API URL configuration** for packaged app

---

## 8. Testing Strategy

### 8.1 Testing Matrix

| Test Type | Tools | Coverage |
|-----------|-------|----------|
| Unit Tests | Jest, React Testing Library | Components, utilities |
| Integration Tests | Playwright, Spectron | Electron-specific flows |
| E2E Tests | Playwright | Full user journeys |
| Manual Testing | - | All platforms (Win/Mac/Linux) |

### 8.2 Platform Testing Checklist

- [ ] Windows 10/11 installation and launch
- [ ] macOS (Intel and Apple Silicon)
- [ ] Ubuntu/Debian Linux
- [ ] Auto-update flow
- [ ] Offline mode (if implemented)
- [ ] File operations (save, open, print)
- [ ] System tray functionality
- [ ] Native notifications

---

## 9. Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Setup | Week 1-2 | Project structure, dependencies |
| Phase 2: Main Process | Week 2-3 | Electron shell, server management |
| Phase 3: Database | Week 3-4 | Database integration strategy |
| Phase 4: Build Config | Week 4 | Multi-platform builds |
| Phase 5: Native Features | Week 5 | Tray, notifications, dialogs |
| Phase 6: Auto-Update | Week 5-6 | Update system |
| Phase 7: Frontend | Week 6 | IPC integration |
| Phase 8: Testing | Week 7-8 | Full testing cycle |
| Phase 9: Release | Week 8 | Distribution, documentation |

**Total Estimated Duration: 8 weeks**

---

## 10. Future Enhancements

After the initial release, consider these enhancements:

1. **Offline Mode**: Local SQLite with sync capability
2. **Native Printing**: Direct thermal printer support for labels
3. **Barcode Scanning**: USB barcode scanner integration
4. **Keyboard Shortcuts**: Global hotkeys for common actions
5. **Multiple Windows**: Support for multi-monitor setups
6. **Deep Linking**: Custom protocol handler (`tms://`)
7. **Crash Reporting**: Sentry or similar integration
8. **Usage Analytics**: Opt-in telemetry for improvement insights

---

## 11. Alternative Technologies Considered

| Technology | Pros | Cons | Verdict |
|------------|------|------|---------|
| **Electron** | Full Node.js API, mature ecosystem | Large bundle size | ✅ Selected |
| **Tauri** | Smaller bundles, Rust backend | Learning curve, less ecosystem | Consider for v2 |
| **NW.js** | Similar to Electron | Smaller community | Not recommended |
| **Neutralinojs** | Very small bundles | Limited native access | Not suitable |
| **PWA** | No packaging needed | Limited native features | Supplement only |

---

## 12. Conclusion

Converting TMS to an Electron desktop application is a viable and recommended approach. The existing Next.js architecture maps well to Electron's capabilities, and the phased implementation approach minimizes risk while delivering value incrementally.

The recommended path (Option A with embedded servers) provides:
- **90%+ code reuse** from the existing web application
- **Cross-platform support** (Windows, macOS, Linux)
- **Native desktop features** (system tray, notifications, file dialogs)
- **Auto-update capability** for easy maintenance
- **Reasonable timeline** of 8 weeks to first release

Start with the basic wrapper and progressively add native features based on user feedback and business requirements.
