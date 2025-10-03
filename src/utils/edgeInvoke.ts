import { supabase } from '@/integrations/supabase/client';
import { withRetry } from '@/utils/retryLogic';
import { normalizeEdgeError } from '@/utils/errorHandling';
import { logger } from '@/lib/logger';

// Deduplicate in-flight calls by name + idempotencyKey to avoid races
const pendingInvocations = new Map<string, Promise<any>>();

// Race any promise with a timeout to avoid UI getting stuck on pending operations
export const raceWithTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let t: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        t = setTimeout(() => reject(new Error(`${label} TIMEOUT`)), ms);
      })
    ]);
  } finally {
    if (t) clearTimeout(t);
  }
};

interface InvokeOptions {
  timeoutMs?: number;
  attempts?: number;
  delayMs?: number;
}

// Centralized, robust edge function invoker with timeout, retries, dedup and normalized errors
export const invokeEdgeFunction = async <T = any>(
  name: string,
  body: any,
  { timeoutMs = 15000, attempts = 3, delayMs = 1000 }: InvokeOptions = {}
): Promise<T> => {
  let lastResponse: any;

  // Pre-warm edge function environment (non-blocking, best-effort)
  if (name !== 'system-status') {
    try {
      // Fire and forget with short timeout
      void raceWithTimeout(
        supabase.functions.invoke('system-status', { body: { ping: name } }),
        1500,
        'system-status prewarm'
      );
    } catch (_) {
      // ignore
    }
  }

  // Build deduplication key
  const idem = body?.idempotencyKey || '';
  const dedupKey = `${name}:${idem || JSON.stringify(body || {}).slice(0, 256)}`;

  // If same request is in-flight, return the same promise
  if (pendingInvocations.has(dedupKey)) {
    logger.info(`[edgeInvoke] dedup hit for ${name}`);
    return pendingInvocations.get(dedupKey)! as Promise<T>;
  }

  const execPromise = withRetry(async () => {
    logger.info(`[edgeInvoke] calling ${name}`);
    const response = await raceWithTimeout(
      supabase.functions.invoke(name, { body }),
      timeoutMs,
      `${name} invoke`
    );

    lastResponse = response;

    if (response.error) {
      const message = normalizeEdgeError(response, response.error, `${name} error`);
      const enriched: any = new Error(message);
      // Attach rich details for upper layers
      enriched.details = response?.data?.details ?? response?.error?.details;
      enriched.code = response?.error?.code ?? response?.data?.code;
      enriched.status = (response as any)?.status ?? response?.error?.status;
      enriched.response = response;
      throw enriched;
    }

    return response.data as T;
  }, `Invoke ${name}` , {
    maxAttempts: attempts,
    delay: delayMs,
    backoff: true,
    retryCondition: (error: any) => {
      const msg = typeof error?.message === 'string' ? error.message : String(error);
      const name = error?.name;
      const status = error?.status ?? error?.response?.status;
      return (
        msg.includes('Failed to send') ||
        msg.includes('Failed to fetch') ||
        msg.includes('TypeError: Failed to fetch') ||
        msg.includes('network') ||
        msg.includes('timeout') ||
        msg.includes('fetch') ||
        error?.code === 'NETWORK_ERROR' ||
        name === 'AbortError' ||
        (typeof status === 'number' && status >= 500)
      );
    }
  });

  pendingInvocations.set(dedupKey, execPromise);

  try {
    const result = await execPromise;
    return result;
  } finally {
    pendingInvocations.delete(dedupKey);
  }
};
