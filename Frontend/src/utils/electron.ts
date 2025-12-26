/**
 * Electron Desktop Integration Utilities
 *
 * This module provides utilities for integrating with Electron's native features
 * while maintaining browser compatibility for the web version.
 */

// ============================================
// Type Definitions
// ============================================

interface ElectronAPI {
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
  showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>;
  showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogResult>;
  showMessageBox: (options: MessageBoxOptions) => Promise<{ response: number }>;
  saveFile: (filePath: string, data: ArrayBuffer | string) => Promise<void>;
  readFile: (filePath: string) => Promise<ArrayBuffer>;
  getDownloadsPath: () => Promise<string>;
  getDocumentsPath: () => Promise<string>;
  print: (options?: PrintOptions) => Promise<boolean>;
  printToPDF: (options?: PDFOptions) => Promise<ArrayBuffer>;
  showNotification: (title: string, body: string, options?: NotificationOptions) => Promise<void>;
  getDBConfig: () => Promise<DBConfig>;
  saveDBConfig: (config: Partial<DBConfig>) => Promise<void>;
  testDBConnection: () => Promise<{ success: boolean; error?: string }>;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  getUpdateStatus: () => Promise<UpdateStatus>;
  onUpdateAvailable: (callback: (info: { version: string }) => void) => void;
  onUpdateProgress: (callback: (progress: { percent: number }) => void) => void;
  onUpdateReady: (callback: (info: { version: string }) => void) => void;
  onUpdateError: (callback: (error: string) => void) => void;
  openExternal: (url: string) => Promise<void>;
  openPath: (path: string) => Promise<string>;
  showItemInFolder: (path: string) => Promise<void>;
  getSystemInfo: () => Promise<SystemInfo>;
  onNavigate: (callback: (path: string) => void) => void;
  onCheckUpdates: (callback: () => void) => void;
}

interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  fileName?: string;
  filters?: { name: string; extensions: string[] }[];
}

interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: ('openFile' | 'openDirectory' | 'multiSelections')[];
}

interface OpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  title?: string;
  message: string;
  detail?: string;
  buttons?: string[];
}

interface PrintOptions {
  silent?: boolean;
  printBackground?: boolean;
}

interface PDFOptions {
  pageSize?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  marginsType?: number;
}

interface NotificationOptions {
  silent?: boolean;
}

interface DBConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';
  version?: string;
  progress?: number;
  error?: string;
}

interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
  memory: {
    total: number;
    free: number;
  };
}

// ============================================
// Detection & Access
// ============================================

/**
 * Check if running in Electron environment
 */
export const isElectron = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    window.electronAPI !== undefined &&
    window.electronAPI.isElectron === true
  );
};

/**
 * Get Electron API with type safety
 * Returns null if not running in Electron
 */
export const getElectronAPI = (): ElectronAPI | null => {
  if (!isElectron()) {
    return null;
  }
  return window.electronAPI as ElectronAPI;
};

// ============================================
// File Operations
// ============================================

/**
 * Save file with native dialog (falls back to browser download)
 */
export const saveFileWithDialog = async (
  content: Blob | ArrayBuffer | string,
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
        let data: ArrayBuffer | string;

        if (content instanceof Blob) {
          data = await content.arrayBuffer();
        } else {
          data = content;
        }

        await api.saveFile(result.filePath, data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save file:', error);
      return false;
    }
  } else {
    // Browser fallback
    const blob =
      content instanceof Blob
        ? content
        : new Blob([content], { type: 'application/octet-stream' });

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

/**
 * Open file with native dialog
 */
export const openFileWithDialog = async (
  filters?: { name: string; extensions: string[] }[]
): Promise<{ path: string; data: ArrayBuffer } | null> => {
  const api = getElectronAPI();

  if (api) {
    try {
      const result = await api.showOpenDialog({
        filters,
        properties: ['openFile'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const data = await api.readFile(filePath);
        return { path: filePath, data };
      }
      return null;
    } catch (error) {
      console.error('Failed to open file:', error);
      return null;
    }
  }

  // Browser fallback using input element
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';

    if (filters && filters.length > 0) {
      input.accept = filters
        .flatMap((f) => f.extensions.map((ext) => `.${ext}`))
        .join(',');
    }

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const data = await file.arrayBuffer();
        resolve({ path: file.name, data });
      } else {
        resolve(null);
      }
    };

    input.click();
  });
};

// ============================================
// Printing
// ============================================

/**
 * Print current page
 */
export const printContent = async (options?: PrintOptions): Promise<boolean> => {
  const api = getElectronAPI();

  if (api) {
    try {
      return await api.print(options);
    } catch (error) {
      console.error('Print failed:', error);
      return false;
    }
  } else {
    window.print();
    return true;
  }
};

/**
 * Export current page to PDF
 */
export const exportToPDF = async (
  fileName: string,
  options?: PDFOptions
): Promise<boolean> => {
  const api = getElectronAPI();

  if (api) {
    try {
      const pdfData = await api.printToPDF(options);
      return saveFileWithDialog(pdfData, fileName, [
        { name: 'PDF Documents', extensions: ['pdf'] },
      ]);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      return false;
    }
  }

  // Browser fallback - just trigger print dialog
  window.print();
  return true;
};

// ============================================
// Notifications
// ============================================

/**
 * Show native notification
 */
export const showNotification = async (
  title: string,
  body: string,
  options?: NotificationOptions
): Promise<void> => {
  const api = getElectronAPI();

  if (api) {
    await api.showNotification(title, body, options);
  } else if ('Notification' in window) {
    // Browser fallback
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    }
  }
};

// ============================================
// External Links
// ============================================

/**
 * Open external URL in default browser
 */
export const openExternalUrl = async (url: string): Promise<void> => {
  const api = getElectronAPI();

  if (api) {
    await api.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

// ============================================
// System Information
// ============================================

/**
 * Get application version
 */
export const getAppVersion = async (): Promise<string> => {
  const api = getElectronAPI();

  if (api) {
    return api.getVersion();
  }
  return '1.0.0'; // Default for web
};

/**
 * Get platform information
 */
export const getPlatform = (): string => {
  const api = getElectronAPI();

  if (api) {
    return api.getPlatform();
  }
  return 'web';
};

/**
 * Get system information
 */
export const getSystemInfo = async (): Promise<SystemInfo | null> => {
  const api = getElectronAPI();

  if (api) {
    return api.getSystemInfo();
  }
  return null;
};

// ============================================
// Updates
// ============================================

/**
 * Check for application updates
 */
export const checkForUpdates = async (): Promise<void> => {
  const api = getElectronAPI();

  if (api) {
    await api.checkForUpdates();
  }
};

/**
 * Get update status
 */
export const getUpdateStatus = async (): Promise<UpdateStatus | null> => {
  const api = getElectronAPI();

  if (api) {
    return api.getUpdateStatus();
  }
  return null;
};

/**
 * Install downloaded update
 */
export const installUpdate = async (): Promise<void> => {
  const api = getElectronAPI();

  if (api) {
    await api.installUpdate();
  }
};

// ============================================
// Navigation Hooks
// ============================================

/**
 * Setup navigation listener (for tray menu navigation)
 */
export const setupNavigationListener = (
  navigate: (path: string) => void
): void => {
  const api = getElectronAPI();

  if (api) {
    api.onNavigate((path) => {
      navigate(path);
    });
  }
};

/**
 * Setup update check listener (for tray menu)
 */
export const setupUpdateCheckListener = (callback: () => void): void => {
  const api = getElectronAPI();

  if (api) {
    api.onCheckUpdates(callback);
  }
};

// ============================================
// Window Augmentation
// ============================================

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
