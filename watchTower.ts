import axios, { AxiosError } from "axios";

const LogTypes = {
  info: process.env.LOGINFO || "goerli/info",
  warn: process.env.LOGWARNING || "goerli/warning",
  severe: process.env.LOGSEVERE || "goerli/severe",
} as const;

interface LogMetadata {
  [key: string]: any;
}

type LogType = (typeof LogTypes)[keyof typeof LogTypes];
interface LogMessage {
  type: LogType;
  message: string;
  metadata?: LogMetadata;
  app_id: string;
  timestamp: number;
}

const WatchTowerLogger = {
  endpoint: process.env.WATCHTOWER_URL || "http://localhost:3000",
  app_id: process.env.APP_NAME || "MyApp",
  enabled: process.env.WATCHTOWER_ENABLED === "true" || false, // Optionally disable logging
  token: process.env.WATCHTOWER_TOKEN || "",

  async log(type: LogType, message: string, metadata: LogMetadata = {}) {
    console.log(message);
    if (!this.enabled) return;

    const logMessage: LogMessage = {
      type,
      message,
      metadata,
      app_id: this.app_id,
      timestamp: Date.now(),
    };
    try {
      await axios.post(this.endpoint, { token: this.token, log: logMessage });
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error("WatchTower logging failed:", error.message);
      } else {
        console.error("Unknown error during WatchTower logging:", error);
      }
    }
  },

  info(message: string, metadata: LogMetadata = {}) {
    this.log(LogTypes["info"], message, metadata);
  },

  warn(message: string, metadata: LogMetadata = {}) {
    this.log(LogTypes["warn"], message, metadata);
  },

  error(message: string, metadata: LogMetadata = {}) {
    this.log(LogTypes["severe"], message, metadata);
  },
};

export default WatchTowerLogger;
