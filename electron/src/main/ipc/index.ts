import {
  ipcMain,
  dialog,
  shell,
  app,
  BrowserWindow,
  Notification,
} from 'electron';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { freemem, totalmem } from 'os';
import log from 'electron-log';
import {
  getDBConfig,
  saveDBConfig,
  checkMySQLConnection,
} from '../database';
import {
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  getUpdateStatus,
} from '../updater';

// Setup all IPC handlers
export function setupIPC(): void {
  log.info('Setting up IPC handlers...');

  // ============================================
  // App Information
  // ============================================
  ipcMain.handle('app:get-version', () => {
    return app.getVersion();
  });

  // ============================================
  // Window Controls
  // ============================================
  ipcMain.handle('window:minimize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.minimize();
  });

  ipcMain.handle('window:maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  });

  ipcMain.handle('window:close', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.close();
  });

  ipcMain.handle('window:is-maximized', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window?.isMaximized() ?? false;
  });

  ipcMain.handle('window:set-fullscreen', (event, flag: boolean) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.setFullScreen(flag);
  });

  ipcMain.handle('window:is-fullscreen', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window?.isFullScreen() ?? false;
  });

  // ============================================
  // File Dialogs
  // ============================================
  ipcMain.handle('dialog:save', async (event, options: any) => {
    const window = BrowserWindow.fromWebContents(event.sender);

    const defaultPath = options.defaultPath ||
      join(app.getPath('downloads'), options.fileName || 'file');

    const result = await dialog.showSaveDialog(window!, {
      title: options.title || 'Save File',
      defaultPath,
      filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
    });

    return result;
  });

  ipcMain.handle('dialog:open', async (event, options: any) => {
    const window = BrowserWindow.fromWebContents(event.sender);

    const result = await dialog.showOpenDialog(window!, {
      title: options.title || 'Open File',
      defaultPath: options.defaultPath,
      filters: options.filters,
      properties: options.properties || ['openFile'],
    });

    return result;
  });

  ipcMain.handle('dialog:message', async (event, options: any) => {
    const window = BrowserWindow.fromWebContents(event.sender);

    const result = await dialog.showMessageBox(window!, {
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      detail: options.detail,
      buttons: options.buttons || ['OK'],
    });

    return result;
  });

  // ============================================
  // File Operations
  // ============================================
  ipcMain.handle('file:save', async (_, filePath: string, data: ArrayBuffer | string) => {
    try {
      const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
      await writeFile(filePath, buffer);
      log.info(`File saved: ${filePath}`);
    } catch (error: any) {
      log.error(`Failed to save file: ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('file:read', async (_, filePath: string) => {
    try {
      const data = await readFile(filePath);
      return data.buffer;
    } catch (error: any) {
      log.error(`Failed to read file: ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('file:get-downloads-path', () => {
    return app.getPath('downloads');
  });

  ipcMain.handle('file:get-documents-path', () => {
    return app.getPath('documents');
  });

  // ============================================
  // Printing
  // ============================================
  ipcMain.handle('print:content', async (event, options: any = {}) => {
    const window = BrowserWindow.fromWebContents(event.sender);

    return new Promise((resolve, reject) => {
      window?.webContents.print(
        {
          silent: options.silent || false,
          printBackground: options.printBackground ?? true,
          ...options,
        },
        (success, errorType) => {
          if (success) {
            log.info('Print job completed');
            resolve(true);
          } else {
            log.error(`Print failed: ${errorType}`);
            reject(new Error(errorType));
          }
        }
      );
    });
  });

  ipcMain.handle('print:to-pdf', async (event, options: any = {}) => {
    const window = BrowserWindow.fromWebContents(event.sender);

    try {
      const pdfData = await window?.webContents.printToPDF({
        printBackground: true,
        pageSize: options.pageSize || 'A4',
        landscape: options.landscape || false,
        marginsType: options.marginsType || 0,
        ...options,
      });

      log.info('PDF generated successfully');
      return pdfData?.buffer;
    } catch (error: any) {
      log.error(`Failed to generate PDF: ${error.message}`);
      throw error;
    }
  });

  // ============================================
  // Notifications
  // ============================================
  ipcMain.handle('notification:show', (_, options: any) => {
    const { title, body, silent } = options;

    const notification = new Notification({
      title,
      body,
      silent: silent ?? false,
      icon: join(__dirname, '../../../resources/icon.png'),
    });

    notification.show();
    log.info(`Notification shown: ${title}`);
  });

  // ============================================
  // Database Configuration
  // ============================================
  ipcMain.handle('db:get-config', () => {
    const config = getDBConfig();
    // Don't send password to renderer for security
    return {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password ? '******' : '',
      database: config.database,
    };
  });

  ipcMain.handle('db:save-config', (_, config: any) => {
    saveDBConfig(config);
  });

  ipcMain.handle('db:test-connection', async () => {
    return checkMySQLConnection();
  });

  // ============================================
  // Auto Updater
  // ============================================
  ipcMain.handle('updater:check', async () => {
    await checkForUpdates();
  });

  ipcMain.handle('updater:download', async () => {
    await downloadUpdate();
  });

  ipcMain.handle('updater:install', () => {
    installUpdate();
  });

  ipcMain.handle('updater:get-status', () => {
    return getUpdateStatus();
  });

  // ============================================
  // Shell Operations
  // ============================================
  ipcMain.handle('shell:open-external', async (_, url: string) => {
    // Security: Only allow http/https URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('Only HTTP/HTTPS URLs are allowed');
    }
    await shell.openExternal(url);
    log.info(`Opened external URL: ${url}`);
  });

  ipcMain.handle('shell:open-path', async (_, path: string) => {
    const result = await shell.openPath(path);
    if (result) {
      log.error(`Failed to open path: ${result}`);
    }
    return result;
  });

  ipcMain.handle('shell:show-in-folder', (_, path: string) => {
    shell.showItemInFolder(path);
  });

  // ============================================
  // System Information
  // ============================================
  ipcMain.handle('system:get-info', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      memory: {
        total: totalmem(),
        free: freemem(),
      },
    };
  });

  log.info('IPC handlers setup complete');
}
