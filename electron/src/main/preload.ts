import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Identify as Electron
  isElectron: true,

  // App Information
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
  getPlatform: (): string => process.platform,
  getArch: (): string => process.arch,

  // Window Controls
  minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  maximize: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
  close: (): Promise<void> => ipcRenderer.invoke('window:close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
  setFullScreen: (flag: boolean): Promise<void> => ipcRenderer.invoke('window:set-fullscreen', flag),
  isFullScreen: (): Promise<boolean> => ipcRenderer.invoke('window:is-fullscreen'),

  // File Dialogs
  showSaveDialog: (options: {
    title?: string;
    defaultPath?: string;
    fileName?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<{ canceled: boolean; filePath?: string }> =>
    ipcRenderer.invoke('dialog:save', options),

  showOpenDialog: (options: {
    title?: string;
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
    properties?: ('openFile' | 'openDirectory' | 'multiSelections')[];
  }): Promise<{ canceled: boolean; filePaths: string[] }> =>
    ipcRenderer.invoke('dialog:open', options),

  showMessageBox: (options: {
    type?: 'none' | 'info' | 'error' | 'question' | 'warning';
    title?: string;
    message: string;
    detail?: string;
    buttons?: string[];
  }): Promise<{ response: number }> =>
    ipcRenderer.invoke('dialog:message', options),

  // File Operations
  saveFile: (filePath: string, data: ArrayBuffer | string): Promise<void> =>
    ipcRenderer.invoke('file:save', filePath, data),
  readFile: (filePath: string): Promise<ArrayBuffer> =>
    ipcRenderer.invoke('file:read', filePath),
  getDownloadsPath: (): Promise<string> =>
    ipcRenderer.invoke('file:get-downloads-path'),
  getDocumentsPath: (): Promise<string> =>
    ipcRenderer.invoke('file:get-documents-path'),

  // Printing
  print: (options?: { silent?: boolean; printBackground?: boolean }): Promise<boolean> =>
    ipcRenderer.invoke('print:content', options),
  printToPDF: (options?: {
    pageSize?: 'A4' | 'Letter' | 'Legal';
    landscape?: boolean;
    marginsType?: number;
  }): Promise<ArrayBuffer> =>
    ipcRenderer.invoke('print:to-pdf', options),

  // Notifications
  showNotification: (
    title: string,
    body: string,
    options?: { silent?: boolean }
  ): Promise<void> =>
    ipcRenderer.invoke('notification:show', { title, body, ...options }),

  // Database Settings
  getDBConfig: (): Promise<{
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }> => ipcRenderer.invoke('db:get-config'),

  saveDBConfig: (config: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  }): Promise<void> => ipcRenderer.invoke('db:save-config', config),

  testDBConnection: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('db:test-connection'),

  // Auto Updates
  checkForUpdates: (): Promise<void> =>
    ipcRenderer.invoke('updater:check'),
  downloadUpdate: (): Promise<void> =>
    ipcRenderer.invoke('updater:download'),
  installUpdate: (): Promise<void> =>
    ipcRenderer.invoke('updater:install'),
  getUpdateStatus: (): Promise<{
    status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready';
    version?: string;
    progress?: number;
  }> => ipcRenderer.invoke('updater:get-status'),

  // Update event listeners
  onUpdateAvailable: (callback: (info: { version: string }) => void): void => {
    ipcRenderer.on('updater:available', (_, info) => callback(info));
  },
  onUpdateProgress: (callback: (progress: { percent: number }) => void): void => {
    ipcRenderer.on('updater:progress', (_, progress) => callback(progress));
  },
  onUpdateReady: (callback: (info: { version: string }) => void): void => {
    ipcRenderer.on('updater:ready', (_, info) => callback(info));
  },
  onUpdateError: (callback: (error: string) => void): void => {
    ipcRenderer.on('updater:error', (_, error) => callback(error));
  },

  // Shell Operations
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('shell:open-external', url),
  openPath: (path: string): Promise<string> =>
    ipcRenderer.invoke('shell:open-path', path),
  showItemInFolder: (path: string): Promise<void> =>
    ipcRenderer.invoke('shell:show-in-folder', path),

  // System Information
  getSystemInfo: (): Promise<{
    platform: string;
    arch: string;
    version: string;
    electronVersion: string;
    nodeVersion: string;
    chromeVersion: string;
    memory: { total: number; free: number };
  }> => ipcRenderer.invoke('system:get-info'),

  // Navigation (from tray menu)
  onNavigate: (callback: (path: string) => void): void => {
    ipcRenderer.on('navigate', (_, path) => callback(path));
  },

  // Check for updates trigger (from tray menu)
  onCheckUpdates: (callback: () => void): void => {
    ipcRenderer.on('check-updates', () => callback());
  },
});

// TypeScript declaration for window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      isElectron: true;
      getVersion: () => Promise<string>;
      getPlatform: () => string;
      getArch: () => string;
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      setFullScreen: (flag: boolean) => Promise<void>;
      isFullScreen: () => Promise<boolean>;
      showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>;
      showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
      showMessageBox: (options: any) => Promise<{ response: number }>;
      saveFile: (filePath: string, data: ArrayBuffer | string) => Promise<void>;
      readFile: (filePath: string) => Promise<ArrayBuffer>;
      getDownloadsPath: () => Promise<string>;
      getDocumentsPath: () => Promise<string>;
      print: (options?: any) => Promise<boolean>;
      printToPDF: (options?: any) => Promise<ArrayBuffer>;
      showNotification: (title: string, body: string, options?: any) => Promise<void>;
      getDBConfig: () => Promise<any>;
      saveDBConfig: (config: any) => Promise<void>;
      testDBConnection: () => Promise<{ success: boolean; error?: string }>;
      checkForUpdates: () => Promise<void>;
      downloadUpdate: () => Promise<void>;
      installUpdate: () => Promise<void>;
      getUpdateStatus: () => Promise<any>;
      onUpdateAvailable: (callback: (info: any) => void) => void;
      onUpdateProgress: (callback: (progress: any) => void) => void;
      onUpdateReady: (callback: (info: any) => void) => void;
      onUpdateError: (callback: (error: string) => void) => void;
      openExternal: (url: string) => Promise<void>;
      openPath: (path: string) => Promise<string>;
      showItemInFolder: (path: string) => Promise<void>;
      getSystemInfo: () => Promise<any>;
      onNavigate: (callback: (path: string) => void) => void;
      onCheckUpdates: (callback: () => void) => void;
    };
  }
}

export {};
