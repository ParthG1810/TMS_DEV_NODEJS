import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import { join } from 'path';
import log from 'electron-log';

let tray: Tray | null = null;
let mainWindowRef: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Get icon path based on platform and environment
function getIconPath(): string {
  const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';

  if (isDev) {
    return join(__dirname, '../../resources', iconName);
  } else {
    return join(process.resourcesPath, iconName);
  }
}

// Create system tray
export function createTray(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow;

  const iconPath = getIconPath();
  log.info(`Creating tray with icon: ${iconPath}`);

  let icon: Electron.NativeImage;

  try {
    icon = nativeImage.createFromPath(iconPath);

    // Resize icon for tray (16x16 on most platforms)
    if (!icon.isEmpty()) {
      icon = icon.resize({ width: 16, height: 16 });
    } else {
      log.warn('Tray icon is empty, using default');
      // Create a simple colored icon as fallback
      icon = nativeImage.createEmpty();
    }
  } catch (error) {
    log.error('Failed to load tray icon:', error);
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);

  // Build context menu
  updateTrayMenu();

  // Set tooltip
  tray.setToolTip('TMS - Tiffin Management System');

  // Click handlers
  tray.on('click', () => {
    if (mainWindowRef) {
      if (mainWindowRef.isVisible()) {
        mainWindowRef.focus();
      } else {
        mainWindowRef.show();
        mainWindowRef.focus();
      }
    }
  });

  tray.on('double-click', () => {
    if (mainWindowRef) {
      mainWindowRef.show();
      mainWindowRef.focus();
    }
  });

  log.info('System tray created successfully');
}

// Update tray menu
export function updateTrayMenu(): void {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show TMS',
      click: () => {
        if (mainWindowRef) {
          mainWindowRef.show();
          mainWindowRef.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quick Navigation',
      submenu: [
        {
          label: 'Dashboard',
          click: () => navigateTo('/dashboard'),
        },
        {
          label: 'Orders',
          click: () => navigateTo('/dashboard/tiffin/orders'),
        },
        {
          label: 'Customers',
          click: () => navigateTo('/dashboard/tiffin/customers'),
        },
        {
          label: 'Meal Plans',
          click: () => navigateTo('/dashboard/tiffin/meal-plans'),
        },
        { type: 'separator' },
        {
          label: 'Recipes',
          click: () => navigateTo('/dashboard/recipe/list'),
        },
        {
          label: 'Invoices',
          click: () => navigateTo('/dashboard/invoice/list'),
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Check for Updates',
      click: () => {
        if (mainWindowRef) {
          mainWindowRef.webContents.send('check-updates');
        }
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

  tray.setContextMenu(contextMenu);
}

// Navigate to a path in the app
function navigateTo(path: string): void {
  if (mainWindowRef) {
    mainWindowRef.show();
    mainWindowRef.focus();
    mainWindowRef.webContents.send('navigate', path);
  }
}

// Update tray tooltip
export function updateTrayTooltip(message: string): void {
  if (tray) {
    tray.setToolTip(`TMS - ${message}`);
  }
}

// Show balloon notification (Windows only)
export function showTrayBalloon(title: string, content: string): void {
  if (tray && process.platform === 'win32') {
    tray.displayBalloon({
      title,
      content,
      iconType: 'info',
    });
  }
}

// Destroy tray
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
    mainWindowRef = null;
    log.info('System tray destroyed');
  }
}

// Get tray instance
export function getTray(): Tray | null {
  return tray;
}
