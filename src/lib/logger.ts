// Production-safe logging utility
const isDevelopment = import.meta.env.DEV;

type LogData = Record<string, unknown> | string | number | boolean | null;
type LogError = Error | Record<string, unknown> | unknown;

export const logger = {
  info: (message: string, data?: LogData) => {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, data);
    }
  },
  
  warn: (message: string, data?: LogData | LogError) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, data);
    }
  },
  
  error: (message: string, error?: LogError) => {
    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, error);
    } else {
      // In production, only log to external service or suppress
      // Never log sensitive data to console in production
      console.error(`[ERROR] ${message}`);
    }
  },
  
  debug: (message: string, data?: LogData | LogError) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }
};