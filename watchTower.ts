import axios, { AxiosError } from "axios";

enum LogLevel {
  Info = "info",
  Warn = "warn",
  Error = "error",
}

interface LogMetadata {
  [key: string]: any;
}

interface LogMessage {
  level: LogLevel;
  message: string;
  metadata?: LogMetadata;
  appName: string;
  timestamp: string;
}

const WatchTowerLogger = {
  serverUrl: process.env.WATCHTOWER_URL || "http://localhost:3000",
  appName: process.env.APP_NAME || "MyApp",
  enabled: process.env.WATCHTOWER_ENABLED === "true" || false, // Optionally disable logging

  async log(level: LogLevel, message: string, metadata: LogMetadata = {}) {
    if (!this.enabled) return;

    const logMessage: LogMessage = {
      level,
      message,
      metadata,
      appName: this.appName,
      timestamp: new Date().toISOString(),
    };

    try {
      await axios.post(`${this.serverUrl}/logs`, logMessage);
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error("WatchTower logging failed:", error.message);
      } else {
        console.error("Unknown error during WatchTower logging:", error);
      }
    }
  },

  info(message: string, metadata: LogMetadata = {}) {
    this.log(LogLevel.Info, message, metadata);
  },

  warn(message: string, metadata: LogMetadata = {}) {
    this.log(LogLevel.Warn, message, metadata);
  },

  error(message: string, metadata: LogMetadata = {}) {
    this.log(LogLevel.Error, message, metadata);
  },
};

export default WatchTowerLogger;
