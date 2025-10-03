import { logger } from '@/lib/logger';
import { isNetworkError, safeString } from './errorHandling';

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  retryCondition?: (error: any) => boolean;
}

const defaultRetryCondition = (error: any): boolean => {
  // Check for network-related and transient errors that should trigger retry
  const msg = typeof error?.message === 'string' ? error.message : String(error);
  const name = error?.name;
  const status = error?.status ?? error?.response?.status;

  const isRetryable = (
    isNetworkError(error) ||
    error?.code === 'NETWORK_ERROR' ||
    error?.code === 'TIMEOUT' ||
    name === 'AbortError' ||
    msg.includes('Failed to fetch') ||
    msg.includes('TypeError: Failed to fetch') ||
    msg.includes('Failed to send') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('fetch') ||
    msg.includes('ECONNRESET') ||
    msg.includes('EAI_AGAIN') ||
    (typeof status === 'number' && status >= 500)
  );
  
  return isRetryable;
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    retryCondition = defaultRetryCondition,
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        logger.info(`${operationName} succeeded after ${attempt} attempts`);
      }
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !retryCondition(error)) {
        const msg = safeString(error);
        const detailed = (typeof error === 'object' && error)
          ? (() => { try { return JSON.stringify(error); } catch { return msg; } })()
          : msg;
        const finalMsg = `${operationName} failed: ${msg && msg !== '{}' ? msg : detailed || 'Unknown error'}`;
        logger.error(`${operationName} failed after ${attempt} attempts: ${finalMsg}`);
        const wrapped = new Error(finalMsg) as any;
        // Preserve original error for higher-level handlers
        wrapped.details = error;
        wrapped.code = (error as any)?.code;
        wrapped.status = (error as any)?.status ?? (error as any)?.response?.status;
        throw wrapped;
      }

      const baseWait = backoff ? delay * Math.pow(2, attempt - 1) : delay;
      const jitterFactor = 0.85 + Math.random() * 0.3; // 0.85x - 1.15x
      const waitTime = Math.max(200, Math.floor(baseWait * jitterFactor));
      logger.warn(`${operationName} attempt ${attempt} failed, retrying in ${waitTime}ms: ${safeString(error)}`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
};