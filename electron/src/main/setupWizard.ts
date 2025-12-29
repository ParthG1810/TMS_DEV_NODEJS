import { BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import log from "electron-log";
import mysql from "mysql2/promise";
import {
  getConfig,
  setConfig,
  markSetupComplete,
  loadDefaultsFromEnv,
  initializeConfig,
  AppConfig,
} from "./config";

let setupWindow: BrowserWindow | null = null;
let onSetupComplete: (() => void) | null = null;

// Create and show setup wizard window
export function showSetupWizard(onComplete?: () => void): Promise<void> {
  return new Promise((resolve) => {
    if (setupWindow && !setupWindow.isDestroyed()) {
      setupWindow.focus();
      return resolve();
    }

    onSetupComplete = () => {
      if (onComplete) onComplete();
      resolve();
    };

    setupWindow = new BrowserWindow({
      width: 650,
      height: 700,
      minWidth: 500,
      minHeight: 600,
      resizable: true,
      frame: true,
      titleBarStyle: "default",
      title: "TMS Desktop - Setup",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, "setupPreload.js"),
      },
      show: false,
    });

    const setupPath = join(__dirname, "../../src/setup/index.html");
    log.info(`Loading setup wizard from: ${setupPath}`);

    setupWindow.loadFile(setupPath);

    setupWindow.once("ready-to-show", () => {
      setupWindow?.show();
      setupWindow?.center();
    });

    setupWindow.on("closed", () => {
      setupWindow = null;
    });
  });
}

// Close setup wizard
export function closeSetupWizard(): void {
  if (setupWindow && !setupWindow.isDestroyed()) {
    setupWindow.close();
    setupWindow = null;
  }
}

// Check if setup wizard is open
export function isSetupWizardOpen(): boolean {
  return setupWindow !== null && !setupWindow.isDestroyed();
}

// Register IPC handlers for setup wizard
export function registerSetupIPC(): void {
  // Get current config
  ipcMain.handle("setup:getConfig", async () => {
    log.info("Setup: Getting config");
    const config = initializeConfig();
    return config;
  });

  // Test database connection
  ipcMain.handle(
    "setup:testConnection",
    async (
      _event,
      dbConfig: {
        host: string;
        port: number;
        name: string;
        user: string;
        password: string;
      }
    ) => {
      log.info(
        `Setup: Testing connection to ${dbConfig.host}:${dbConfig.port}/${dbConfig.name}`
      );

      try {
        const connection = await mysql.createConnection({
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.user,
          password: dbConfig.password,
          database: dbConfig.name,
          connectTimeout: 10000,
        });

        await connection.query("SELECT 1");
        await connection.end();

        log.info("Setup: Connection test successful");
        return { success: true };
      } catch (error: any) {
        log.error("Setup: Connection test failed:", error.message);

        let errorMessage = error.message;

        switch (error.code) {
          case "ECONNREFUSED":
            errorMessage = `Cannot connect to MySQL at ${dbConfig.host}:${dbConfig.port}. Is MySQL running?`;
            break;
          case "ER_ACCESS_DENIED_ERROR":
            errorMessage = `Access denied for user '${dbConfig.user}'. Check username/password.`;
            break;
          case "ER_BAD_DB_ERROR":
            errorMessage = `Database '${dbConfig.name}' does not exist.`;
            break;
          case "ETIMEDOUT":
            errorMessage = `Connection timed out. Check if MySQL is accessible.`;
            break;
        }

        return { success: false, error: errorMessage };
      }
    }
  );

  // Save config
  ipcMain.handle(
    "setup:saveConfig",
    async (_event, config: Partial<AppConfig>) => {
      log.info("Setup: Saving config");
      setConfig(config);
      return { success: true };
    }
  );

  // Reset to defaults (from .env)
  ipcMain.handle("setup:resetToDefaults", async () => {
    log.info("Setup: Resetting to defaults");
    const defaults = loadDefaultsFromEnv();

    // Merge with hardcoded defaults
    const config: AppConfig = {
      database: {
        host: defaults.database?.host || "localhost",
        port: defaults.database?.port || 3306,
        user: defaults.database?.user || "root",
        password: defaults.database?.password || "Mysql",
        name: defaults.database?.name || "Tms_db",
      },
      server: {
        backendPort: defaults.server?.backendPort || 47847,
        frontendPort: defaults.server?.frontendPort || 47848,
      },
      google: {
        clientId: defaults.google?.clientId || "",
        clientSecret: defaults.google?.clientSecret || "",
        redirectUri:
          defaults.google?.redirectUri ||
          "http://localhost:47847/api/gmail/callback",
      },
      jwt: {
        secret: defaults.jwt?.secret || "your-secret-key-change-in-production",
        expiresIn: defaults.jwt?.expiresIn || "3d",
      },
      app: {
        autoStart: false,
        minimizeToTray: true,
        checkUpdates: true,
      },
      setupComplete: false,
    };

    return config;
  });

  // Finish setup
  ipcMain.handle("setup:finishSetup", async () => {
    log.info("Setup: Completing setup");
    markSetupComplete();
    closeSetupWizard();

    if (onSetupComplete) {
      onSetupComplete();
    }

    return { success: true };
  });
}
