import { logger } from '@/lib/logger';
import { invokeEdgeFunction } from '@/utils/edgeInvoke';

/**
 * Utility to detect and repair memes with placeholder images
 */
export const repairMemePreview = async (memeId: string, shortId: string, imageDataUrl: string): Promise<boolean> => {
  try {
    logger.info('🔧 Attempting to repair meme preview', { memeId, shortId });

    const uploadResponse = await invokeEdgeFunction<{ url: string }>(
      'upload-meme-image',
      {
        memeId,
        id_short: shortId,
        image: imageDataUrl
      },
      { timeoutMs: 20000, attempts: 3, delayMs: 2000 }
    );

    logger.info('✅ Meme preview repaired successfully', { 
      memeId, 
      shortId, 
      newUrl: uploadResponse.url 
    });
    return true;
  } catch (error) {
    logger.error('❌ Error during meme repair after retries', { error, memeId, shortId });
    return false;
  }
};

/**
 * Check if a meme has a placeholder preview
 * Supports both new format (image_url) and old format (image_urls.preview)
 */
export const hasPlaceholderPreview = (meme: { 
  image_url?: string | null; 
  image_urls?: Record<string, string> 
}): boolean => {
  // Check new format first (single image_url field)
  const newFormatUrl = meme.image_url;
  if (newFormatUrl && newFormatUrl !== '/placeholder.svg' && !newFormatUrl.includes('placeholder')) {
    return false; // Has valid image in new format
  }
  
  // Check old format (image_urls.preview)
  const oldFormatUrl = meme.image_urls?.preview;
  if (oldFormatUrl && oldFormatUrl !== '/placeholder.svg' && !oldFormatUrl.includes('placeholder')) {
    return false; // Has valid image in old format
  }
  
  // No valid image found in either format
  return true;
};

export const finalizeMemePreview = async (
  memeId: string,
  shortId: string
): Promise<string | null> => {
  try {
    const resp = await invokeEdgeFunction<{ ok: boolean; url?: string }>(
      'finalize-meme-preview',
      { memeId, id_short: shortId },
      { timeoutMs: 20000, attempts: 3, delayMs: 2000 }
    );

    if (!resp.ok) {
      throw new Error('Preview finalization not successful');
    }

    const url = resp.url ?? null;
    logger.info('✅ Meme preview finalized successfully', { memeId, shortId, url });
    return url;
  } catch (error) {
    logger.error('❌ finalizeMemePreview error after retries', { error, memeId, shortId });
    return null;
  }
};
