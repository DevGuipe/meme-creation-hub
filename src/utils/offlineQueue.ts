import { logger } from '@/lib/logger';
import { invokeEdgeFunction } from '@/utils/edgeInvoke';
import { isNetworkError, safeString } from '@/utils/errorHandling';

interface QueueItem {
  name: string;
  body: Record<string, any> & { idempotencyKey?: string };
  enqueuedAt: number;
}

const STORAGE_KEY = 'offlineQueue:v1';
let processing = false;

function loadQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    logger.warn('[offlineQueue] load failed', e);
    return [];
  }
}

function saveQueue(items: QueueItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    logger.warn('[offlineQueue] save failed', e);
  }
}

function upsertItem(items: QueueItem[], item: QueueItem): QueueItem[] {
  const key = item.body?.idempotencyKey;
  if (!key) return [...items, item];
  const idx = items.findIndex(i => i.body?.idempotencyKey === key && i.name === item.name);
  if (idx >= 0) {
    const copy = [...items];
    copy[idx] = item; // replace newer payload
    return copy;
  }
  return [...items, item];
}

export function enqueueSaveMeme(body: Record<string, any> & { idempotencyKey?: string }) {
  const item: QueueItem = { name: 'save-meme', body, enqueuedAt: Date.now() };
  const q = loadQueue();
  const updated = upsertItem(q, item);
  saveQueue(updated);
  logger.info('[offlineQueue] enqueued save-meme', { size: updated.length });
  // Try to process shortly
  setTimeout(processQueue, 500);
}

async function processQueue() {
  if (processing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    logger.info('[offlineQueue] offline, will retry when online');
    return;
  }

  const q = loadQueue();
  if (q.length === 0) return;

  processing = true;
  try {
    while (true) {
      const queue = loadQueue();
      if (queue.length === 0) break;
      const item = queue[0];
      try {
        logger.info(`[offlineQueue] flushing ${item.name}`);
        await invokeEdgeFunction<any>(item.name, item.body, { timeoutMs: 20000, attempts: 2, delayMs: 1000 });
        const next = queue.slice(1);
        saveQueue(next);
        logger.info('[offlineQueue] flushed one item, remaining:', { remaining: next.length });
      } catch (e: any) {
        const msg = safeString(e);
        if (isNetworkError(e) || msg.includes('Failed to fetch') || msg.includes('timeout') || msg.includes('network')) {
          logger.warn('[offlineQueue] network issue, will retry later');
          break; // stop processing until network recovers
        }
        // Non-network error: drop item to avoid blocking
        logger.error('[offlineQueue] dropping item due to non-network error', { msg });
        const next = queue.slice(1);
        saveQueue(next);
      }
    }
  } finally {
    processing = false;
  }
}

// Auto start processing when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    logger.info('[offlineQueue] online event, processing');
    void processQueue();
  });
  // Attempt on load
  setTimeout(processQueue, 0);
}
