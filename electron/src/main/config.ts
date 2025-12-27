import Store = require("electron-store");
import { app } from "electron";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import log from "electron-log";

// App configuration interface
export interface AppConfig {
  // Database settings
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
  // Server settings
  server: {
    backendPort: number;
    frontendPort: number;
  };
  // Google OAuth settings
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  // JWT settings
  jwt: {
    secret: string;
    expiresIn: string;
  };
  // App settings
  app: {
    autoStart: boolean;
    minimizeToTray: boolean;
    checkUpdates: boolean;
  };
  // Flag to track if initial setup is complete
  setupComplete: boolean;
}

// Default configuration
const DEFAULT_CONFIG: AppConfig = {
  database: {
    host: "localhost",
    port: 3306,
    user: "root",
    password: "Mysql",
    name: "TmsDb_Dev",
  },
  server: {
    backendPort: 47847,
    frontendPort: 47848,
  },
  google: {
    clientId: "",
    clientSecret: "",
    redirectUri: "http://localhost:47847/api/gmail/callback",
  },
  jwt: {
    secret: "your-secret-key-change-in-production",
    expiresIn: "3d",
  },
  app: {
    autoStart: false,
    minimizeToTray: true,
    checkUpdates: true,
  },
  setupComplete: false,
};

// Schema for electron-store validation
const schema = {
  database: {
    type: "object" as const,
    properties: {
      host: { type: "string" as const },
      port: { type: "number" as const },
      user: { type: "string" as const },
      password: { type: "string" as const },
      name: { type: "string" as const },
    },
  },
  server: {
    type: "object" as const,
    properties: {
      backendPort: { type: "number" as const },
      frontendPort: { type: "number" as const },
    },
  },
  google: {
    type: "object" as const,
    properties: {
      clientId: { type: "string" as const },
      clientSecret: { type: "string" as const },
      redirectUri: { type: "string" as const },
    },
  },
  jwt: {
    type: "object" as const,
    properties: {
      secret: { type: "string" as const },
      expiresIn: { type: "string" as const },
    },
  },
  app: {
    type: "object" as const,
    properties: {
      autoStart: { type: "boolean" as const },
      minimizeToTray: { type: "boolean" as const },
      checkUpdates: { type: "boolean" as const },
    },
  },
  setupComplete: { type: "boolean" as const },
};

// Create store instance
let store: Store<AppConfig> | null = null;

function getStore(): Store<AppConfig> {
  if (!store) {
    store = new Store<AppConfig>({
      name: "config",
      defaults: DEFAULT_CONFIG,
      schema,
      encryptionKey: "tms-desktop-config-v1", // Encrypts sensitive data
    });
  }
  return store;
}

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// Get Backend .env path
function getBackendEnvPath(): string {
  if (isDev) {
    return join(__dirname, "../../../Backend/.env");
  } else {
    return join(process.resourcesPath, "backend", ".env");
  }
}

// Parse .env file content
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  content.split("\n").forEach((line) => {
    const trimmedLine = line.split("#")[0].trim();

    if (trimmedLine && trimmedLine.includes("=")) {
      const [key, ...valueParts] = trimmedLine.split("=");
      let value = valueParts.join("=").trim();

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      result[key.trim()] = value;
    }
  });

  return result;
}

// Load defaults from Backend/.env file
export function loadDefaultsFromEnv(): Partial<AppConfig> {
  const envPath = getBackendEnvPath();

  // Also try .env.example if .env doesn't exist
  const envExamplePath = envPath.replace(".env", ".env.example");

  let envContent = "";

  try {
    if (existsSync(envPath)) {
      log.info(`Loading defaults from: ${envPath}`);
      envContent = readFileSync(envPath, "utf-8");
    } else if (existsSync(envExamplePath)) {
      log.info(`Loading defaults from: ${envExamplePath}`);
      envContent = readFileSync(envExamplePath, "utf-8");
    } else {
      log.info("No .env file found, using hardcoded defaults");
      return {};
    }
  } catch (error) {
    log.error("Failed to read .env file:", error);
    return {};
  }

  const env = parseEnvFile(envContent);

  const config: Partial<AppConfig> = {
    database: {
      host: env.DB_HOST || DEFAULT_CONFIG.database.host,
      port: parseInt(env.DB_PORT || String(DEFAULT_CONFIG.database.port), 10),
      user: env.DB_USER || DEFAULT_CONFIG.database.user,
      password: env.DB_PASSWORD || DEFAULT_CONFIG.database.password,
      name: env.DB_NAME || DEFAULT_CONFIG.database.name,
    },
    server: {
      backendPort: parseInt(
        env.PORT || String(DEFAULT_CONFIG.server.backendPort),
        10
      ),
      frontendPort: DEFAULT_CONFIG.server.frontendPort,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID || DEFAULT_CONFIG.google.clientId,
      clientSecret:
        env.GOOGLE_CLIENT_SECRET || DEFAULT_CONFIG.google.clientSecret,
      redirectUri: env.GOOGLE_REDIRECT_URI || DEFAULT_CONFIG.google.redirectUri,
    },
    jwt: {
      secret: env.JWT_SECRET || DEFAULT_CONFIG.jwt.secret,
      expiresIn: env.JWT_EXPIRES_IN || DEFAULT_CONFIG.jwt.expiresIn,
    },
  };

  log.info("Loaded defaults from .env file");
  return config;
}

// Check if setup is required
export function isSetupRequired(): boolean {
  const s = getStore();
  return !s.get("setupComplete", false);
}

// Get full configuration
export function getConfig(): AppConfig {
  return getStore().store;
}

// Get specific config section
export function getConfigSection<K extends keyof AppConfig>(
  key: K
): AppConfig[K] {
  return getStore().get(key);
}

// Set specific config section
export function setConfigSection<K extends keyof AppConfig>(
  key: K,
  value: AppConfig[K]
): void {
  getStore().set(key, value);
  log.info(`Config section '${key}' updated`);
}

// Set full configuration
export function setConfig(config: Partial<AppConfig>): void {
  const s = getStore();
  Object.entries(config).forEach(([key, value]) => {
    if (value !== undefined) {
      s.set(key as keyof AppConfig, value);
    }
  });
  log.info("Configuration updated");
}

// Mark setup as complete
export function markSetupComplete(): void {
  getStore().set("setupComplete", true);
  log.info("Setup marked as complete");
}

// Reset to defaults (for --reset-config flag)
export function resetConfig(): void {
  getStore().clear();
  log.info("Configuration reset to defaults");
}

// Get config for display (with password masked)
export function getConfigForDisplay(): AppConfig {
  const config = getConfig();
  return {
    ...config,
    database: {
      ...config.database,
      password: config.database.password ? "••••••••" : "",
    },
    google: {
      ...config.google,
      clientSecret: config.google.clientSecret ? "••••••••" : "",
    },
    jwt: {
      ...config.jwt,
      secret: config.jwt.secret ? "••••••••" : "",
    },
  };
}

// Get config file path (for user reference)
export function getConfigPath(): string {
  return getStore().path;
}

// Check if this is the first run
export function isFirstRun(): boolean {
  const s = getStore();
  // Check if any config has been saved (setupComplete would still be false on first run)
  return !existsSync(s.path);
}

// Initialize config with defaults from .env if first run
export function initializeConfig(): AppConfig {
  const s = getStore();

  if (isFirstRun() || isSetupRequired()) {
    log.info("First run detected, loading defaults from .env");
    const envDefaults = loadDefaultsFromEnv();

    // Merge env defaults with store defaults
    Object.entries(envDefaults).forEach(([key, value]) => {
      if (value !== undefined) {
        s.set(key as keyof AppConfig, value);
      }
    });
  }

  return s.store;
}

// Export store for direct access if needed
export { getStore };
