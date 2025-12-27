import { Menu, shell, app, BrowserWindow, dialog } from 'electron';
import log from 'electron-log';
import { showSetupWizard } from './setupWizard';

const isMac = process.platform === 'darwin';
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Create application menu
export function createApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: 'Preferences...',
                accelerator: 'CmdOrCtrl+,',
                click: () => showSetupWizard(),
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Order',
          accelerator: 'CmdOrCtrl+N',
          click: () => navigateTo('/dashboard/tiffin/orders/new'),
        },
        {
          label: 'New Customer',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => navigateTo('/dashboard/tiffin/customers/new'),
        },
        { type: 'separator' },
        {
          label: 'Export Data...',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            const window = BrowserWindow.getFocusedWindow();
            if (window) {
              window.webContents.send('menu:export');
            }
          },
        },
        {
          label: 'Print...',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            const window = BrowserWindow.getFocusedWindow();
            if (window) {
              window.webContents.print();
            }
          },
        },
        { type: 'separator' },
        ...(!isMac
          ? [
              {
                label: 'Settings',
                accelerator: 'CmdOrCtrl+,',
                click: () => showSetupWizard(),
              },
              { type: 'separator' as const },
            ]
          : []),
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
            ]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const },
            ]),
      ],
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => navigateTo('/dashboard'),
        },
        {
          label: 'Orders',
          accelerator: 'CmdOrCtrl+2',
          click: () => navigateTo('/dashboard/tiffin/orders'),
        },
        {
          label: 'Customers',
          accelerator: 'CmdOrCtrl+3',
          click: () => navigateTo('/dashboard/tiffin/customers'),
        },
        {
          label: 'Meal Plans',
          accelerator: 'CmdOrCtrl+4',
          click: () => navigateTo('/dashboard/tiffin/meal-plans'),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        ...(isDev ? [{ role: 'toggleDevTools' as const }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },

    // Help Menu
    {
      role: 'help',
      submenu: [
        {
          label: 'TMS Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/ParthG1810/TMS_DEV_NODEJS');
          },
        },
        {
          label: 'Report an Issue',
          click: async () => {
            await shell.openExternal(
              'https://github.com/ParthG1810/TMS_DEV_NODEJS/issues/new'
            );
          },
        },
        { type: 'separator' },
        {
          label: 'View Logs',
          click: () => {
            shell.openPath(log.transports.file.getFile().path);
          },
        },
        {
          label: 'Open Config Folder',
          click: () => {
            shell.openPath(app.getPath('userData'));
          },
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => {
            const window = BrowserWindow.getFocusedWindow();
            if (window) {
              window.webContents.send('check-updates');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'About TMS Desktop',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About TMS Desktop',
              message: 'TMS Desktop',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}\nPlatform: ${process.platform} ${process.arch}`,
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  log.info('Application menu created');
}

// Navigate to a path in the app
function navigateTo(path: string): void {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.webContents.send('navigate', path);
  }
}

// Update menu items dynamically
export function updateMenuItem(menuId: string, updates: Partial<Electron.MenuItem>): void {
  const menu = Menu.getApplicationMenu();
  if (!menu) return;

  const item = menu.getMenuItemById(menuId);
  if (item) {
    Object.assign(item, updates);
  }
}
