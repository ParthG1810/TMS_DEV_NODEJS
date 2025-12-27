import { contextBridge, ipcRenderer } from 'electron';

// Expose setup API to renderer
contextBridge.exposeInMainWorld('setupAPI', {
  // Get current configuration
  getConfig: () => ipcRenderer.invoke('setup:getConfig'),

  // Test database connection
  testConnection: (dbConfig: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  }) => ipcRenderer.invoke('setup:testConnection', dbConfig),

  // Save configuration
  saveConfig: (config: any) => ipcRenderer.invoke('setup:saveConfig', config),

  // Reset to defaults from .env
  resetToDefaults: () => ipcRenderer.invoke('setup:resetToDefaults'),

  // Finish setup and launch app
  finishSetup: () => ipcRenderer.invoke('setup:finishSetup'),
});
