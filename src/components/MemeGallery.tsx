import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Trash2, Plus, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { memeIdSchema } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Meme, Layer } from '@/types';
import { invokeEdgeFunction } from '@/utils/edgeInvoke';
import { handleSupabaseError, getUserFriendlyMessage } from '@/utils/errorHandling';
import { hasPlaceholderPreview, finalizeMemePreview } from '@/utils/memeRepair';


interface MemeGalleryProps {
  onBack: () => void;
  onCreateNew: () => void;
  telegramUserId?: number; // FIXED: Added telegramUserId to filter user's memes
}

export const MemeGallery = ({ onBack, onCreateNew, telegramUserId }: MemeGalleryProps) => {
  const [memes, setMemes] = useState<Meme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [repairingMemes, setRepairingMemes] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    loadMemes();
  }, [telegramUserId]); // FIXED: Re-load when telegramUserId changes

  const loadMemes = async (currentRetryCount = 0) => {
    try {
      setIsLoading(true);
      setError(null);
      setRetryCount(currentRetryCount);
      
      console.log('🐱 [MemeGallery] Starting to load memes for telegramUserId:', telegramUserId);
      
      // CRITICAL SECURITY FIX: NEVER allow unfiltered queries - always require user authentication
      if (!telegramUserId) {
        console.error('🚨 [MemeGallery] SECURITY: Attempted to load memes without telegramUserId');
        logger.error('SECURITY: Attempted to load memes without telegramUserId');
        setMemes([]);
        setError('Authentication required');
        toast({
          title: "Authentication required",
          description: "Please log in to view your memes.",
          variant: "destructive",
        });
        return;
      }
      
      // Get user UUID from telegram ID to filter memes
      console.log('🔍 [MemeGallery] Getting user UUID for telegram ID:', telegramUserId);
      const { data: userUuid, error: uuidError } = await supabase
        .rpc('get_user_id_by_telegram_id', { telegram_user_id: telegramUserId });
      
      console.log('📋 [MemeGallery] RPC result - userUuid:', userUuid, 'error:', uuidError);
      
      if (uuidError) {
        console.error('❌ [MemeGallery] Failed to get user UUID:', uuidError);
        logger.error('Failed to get user UUID', uuidError);
        throw new Error('Failed to authenticate user');
      }
      
      // CRITICAL SECURITY CHECK: If user doesn't exist, return empty gallery
      if (!userUuid) {
        console.warn('⚠️ [MemeGallery] User not found in database for telegramUserId:', telegramUserId);
        logger.warn('User not found in database', { telegramUserId });
        setMemes([]);
        setError('User not registered');
        toast({
          title: "User not found",
          description: "Please register to create memes.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('✅ [MemeGallery] User UUID found:', userUuid);
      
      // Load memes using edge function (bypasses RLS issues)
      console.log('📊 [MemeGallery] Loading memes via edge function for userUuid:', userUuid);
      
      const resp = await invokeEdgeFunction<{ data: any[] }>(
        'get-user-memes',
        { telegramUserId },
        { timeoutMs: 15000, attempts: 3, delayMs: 1000 }
      );
      
      console.log('📦 [MemeGallery] Edge function response:', resp);
      
      // Validate response structure
      if (!resp || typeof resp !== 'object') {
        console.error('❌ [MemeGallery] Invalid response from edge function:', resp);
        throw new Error('Invalid response from server');
      }
      
      const data = resp?.data || [];
      
      // Transform Supabase data to match our Meme interface
      console.log('🔄 [MemeGallery] Transforming memes data, count:', data?.length || 0);
      const transformedMemes = (data || []).map(meme => {
        // FIXED: Simplified layers_payload parsing logic
        let layers_payload: Layer[] = [];
        try {
          const payload = meme.layers_payload;
          
          // Handle string (needs parsing)
          if (typeof payload === 'string') {
            const parsed = JSON.parse(payload);
            layers_payload = Array.isArray(parsed) ? parsed : 
                           (parsed?.layers && Array.isArray(parsed.layers)) ? parsed.layers : [];
          } 
          // Handle already parsed array
          else if (Array.isArray(payload)) {
            layers_payload = payload as unknown as Layer[];
          }
          // Handle object with layers property
          else if (payload && typeof payload === 'object' && 'layers' in payload) {
            layers_payload = Array.isArray((payload as any).layers) ? (payload as any).layers : [];
          }
        } catch (error) {
          logger.warn('Error parsing layers_payload for meme', { memeId: meme.id, error });
        }

        // Safely parse image_urls - support both old (image_urls object) and new (image_url string) formats
        let image_urls: Record<string, string> = {};
        try {
          // New format: single image_url field (string)
          if (meme.image_url && typeof meme.image_url === 'string') {
            image_urls = { preview: meme.image_url, original: meme.image_url };
          }
          // Old format: image_urls object
          else if (typeof meme.image_urls === 'string') {
            image_urls = JSON.parse(meme.image_urls);
          } else if (typeof meme.image_urls === 'object' && meme.image_urls !== null) {
            image_urls = meme.image_urls as Record<string, string>;
          }
        } catch (error) {
          logger.warn('Error parsing image_urls for meme', { memeId: meme.id, error });
        }

        return {
          ...meme,
          layers_payload,
          image_urls
        };
      });
      
      setMemes(transformedMemes);
      
      // Info message if we hit the limit
      if (transformedMemes.length === 50) {
        logger.info('Gallery loaded maximum of 50 memes. Older memes are not shown.');
      }
    } catch (error: unknown) {
      logger.error('Failed to load meme gallery', error);
      
      // FIXED: Simplified error handling - withRetry already handled retries
      const errorMessage = error instanceof Error ? error.message : "Could not load your memes";
      setError(errorMessage);
      
      toast({
        title: "Failed to load gallery",
        description: "Could not load your memes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMeme = async (memeId: string, shortId: string) => {
    try {
      // Validate meme ID format
      memeIdSchema.parse(shortId);
    } catch (error) {
      logger.warn('Invalid meme ID format', { shortId });
      toast({
        title: "Invalid meme ID",
        description: "The meme ID format is invalid.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Delete meme #${shortId}? This action cannot be undone.`)) {
      return;
    }

    if (!telegramUserId) {
      logger.error('Cannot delete meme: user not authenticated');
      toast({
        title: "Authentication required",
        description: "You must be logged in to delete memes.",
        variant: "destructive",
      });
      return;
    }

    logger.info('🗑️ Starting secure meme deletion via edge function', { memeId, shortId, telegramUserId });

    try {
      // Call secure edge function to delete meme (validates ownership)
      const result = await invokeEdgeFunction<{ success: boolean }>(
        'delete-meme',
        { memeId, telegramUserId },
        { timeoutMs: 15000, attempts: 3, delayMs: 800 }
      );

      if (!result?.success) throw new Error('Delete operation failed');
      

      // Update local state to remove the meme immediately
      setMemes(currentMemes => {
        const updatedMemes = currentMemes.filter(m => m.id !== memeId);
        logger.info('📱 Local state updated', { 
          removedMemeId: memeId, 
          remainingCount: updatedMemes.length 
        });
        return updatedMemes;
      });

      toast({
        title: "Meme deleted",
        description: `Meme #${shortId} has been deleted successfully.`,
      });

    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      const appErr = handleSupabaseError(errorObj, 'delete meme');
      logger.error('❌ Failed to delete meme - handled error', appErr);
      toast({
        title: "Delete failed",
        description: getUserFriendlyMessage(appErr),
        variant: "destructive",
      });
    }
  };

  const copyMemeCommand = async (memeId: string) => {
    const command = `/meme ${memeId}`;
    
    try {
      await navigator.clipboard.writeText(command);
      toast({
        title: "Command copied! 📋",
        description: `"${command}" copied to clipboard`,
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = command;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "Command copied! 📋",
        description: `"${command}" copied to clipboard`,
      });
    }
  };

  const downloadMeme = async (meme: Meme) => {
    const imageUrl = meme.image_url || meme.image_urls?.preview || meme.image_urls?.original;
    if (!imageUrl) {
      toast({
        title: "Download failed",
        description: "No image available for this meme.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Load the meme image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load meme image'));
        img.src = imageUrl;
      });

      // Create a high-res canvas
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas size (2x resolution for better quality)
      tempCanvas.width = 800;
      tempCanvas.height = 800;
      
      // Draw the meme image scaled to fit
      tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
      
      // Add watermark
      tempCtx.font = 'bold 20px Arial';
      tempCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      tempCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      tempCtx.lineWidth = 2;
      tempCtx.textAlign = 'center';
      
      const watermarkText = 'Made with POPCAT Memer';
      const textX = tempCanvas.width / 2;
      const textY = tempCanvas.height - 25;
      
      // Draw watermark with stroke for better visibility
      tempCtx.strokeText(watermarkText, textX, textY);
      tempCtx.fillText(watermarkText, textX, textY);
      
      // Check if mobile device
      const isMobileDevice = isMobile;
      
      if (isMobileDevice) {
        // Try Web Share API first on mobile
        tempCanvas.toBlob(async (blob) => {
          if (blob) {
            try {
              const fileName = `popcat-meme-${meme.id_short}.png`;
              const file = new File([blob], fileName, { type: 'image/png' });
              
              // Check if Web Share API with files is supported
              const canShareFiles = typeof navigator !== 'undefined' && 'canShare' in navigator && 
                (navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }).canShare?.({ files: [file] });
              
              if (canShareFiles) {
                await (navigator as Navigator & { share?: (data: { files: File[]; title: string }) => Promise<void> }).share?.({ 
                  files: [file], 
                  title: `POPCAT Meme #${meme.id_short}` 
                });
                toast({ 
                  title: 'Shared! 🎉', 
                  description: 'Meme sent to chosen app.' 
                });
                return;
              }
            } catch (e) {
              // Fallback to download
            }
          }
          
          // Fallback: direct download on mobile
          const finalDataUrl = tempCanvas.toDataURL('image/png', 1.0);
          const link = document.createElement('a');
          link.download = `popcat-meme-${meme.id_short}.png`;
          link.href = finalDataUrl;
          document.body.appendChild(link);
          link.click();
          // FIXED: Add safety check for DOM manipulation
          setTimeout(() => {
            if (link && document.body.contains(link)) {
              document.body.removeChild(link);
            }
          }, 100);
          
          toast({ 
            title: "Meme downloaded! 🔥", 
            description: "Your meme is ready to dominate the internet." 
          });
        }, 'image/png', 1.0);
      } else {
        // Desktop: use blob for better compatibility
        tempCanvas.toBlob((blob) => {
          if (!blob) {
            // Fallback to dataURL
            const finalDataUrl = tempCanvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `popcat-meme-${meme.id_short}.png`;
            link.href = finalDataUrl;
            document.body.appendChild(link);
            link.click();
            // FIXED: Add safety check for DOM manipulation
            setTimeout(() => {
              if (link && document.body.contains(link)) {
                document.body.removeChild(link);
              }
            }, 100);
            toast({ 
              title: "Meme downloaded! 🔥", 
              description: "Your meme is ready to dominate the internet." 
            });
            return;
          }
          
          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `popcat-meme-${meme.id_short}.png`;
          link.href = url;
          
          document.body.appendChild(link);
          link.click();
          
          // FIXED: Add safety checks for cleanup
          setTimeout(() => {
            if (link && document.body.contains(link)) {
              document.body.removeChild(link);
            }
            URL.revokeObjectURL(url);
          }, 100);
          
          toast({
            title: "Meme downloaded! 🔥",
            description: "Your meme is ready to dominate the internet.",
          });
        }, 'image/png', 1.0);
      }
      
    } catch (error) {
      logger.error('Error downloading meme from gallery', error);
      toast({
        title: "Download failed",
        description: "Could not download meme. Please try again.",
        variant: "destructive",
      });
    }
  };

  const autoRepairMemePreview = async (meme: Meme) => {
    if (repairingMemes.has(meme.id)) return; // Already repairing

    setRepairingMemes(prev => new Set([...prev, meme.id]));
    logger.info('🔧 Auto-repairing meme preview', { memeId: meme.id, shortId: meme.id_short });

    try {
      const newUrl = await finalizeMemePreview(meme.id, meme.id_short);
      
      if (newUrl) {
        // Refresh this specific meme from DB
        const { data: updatedMeme, error: fetchError } = await supabase
          .from('memes')
          .select('*')
          .eq('id', meme.id)
          .maybeSingle();

        if (updatedMeme && !fetchError) {
          // FIXED: Transform response data correctly with error handling
          let transformedMeme: Meme;
          try {
            transformedMeme = {
              ...updatedMeme,
              layers_payload: typeof updatedMeme.layers_payload === 'string' 
                ? JSON.parse(updatedMeme.layers_payload) 
                : updatedMeme.layers_payload
            } as unknown as Meme;
          } catch (parseError) {
            logger.error('Failed to parse meme data', parseError);
            // Fallback to original data if parsing fails
            transformedMeme = updatedMeme as unknown as Meme;
          }
          
          setMemes(prev => prev.map(m => 
            m.id === meme.id ? transformedMeme : m
          ));
          
          logger.info('✅ Auto-repair successful, meme updated', { 
            memeId: meme.id, 
            shortId: meme.id_short,
            newPreview: newUrl 
          });
          
          toast({
            title: "Preview fixed! 🎉",
            description: `Meme #${meme.id_short} preview restored`,
          });
        } else {
          logger.error('❌ Failed to fetch updated meme', { fetchError, memeId: meme.id });
        }
      } else {
        logger.warn('⚠️ Auto-repair failed', { memeId: meme.id, shortId: meme.id_short });
        toast({
          title: "Repair failed",
          description: `Could not fix preview for meme #${meme.id_short}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('❌ Auto-repair crashed', { error, memeId: meme.id, shortId: meme.id_short });
      toast({
        title: "Repair error",
        description: `Unexpected error while fixing meme #${meme.id_short}`,
        variant: "destructive",
      });
    } finally {
      setRepairingMemes(prev => {
        const newSet = new Set(prev);
        newSet.delete(meme.id);
        return newSet;
      });
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="text-muted-foreground font-ui hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h2 className="text-xl font-bold font-ui">My Gallery 🎨</h2>
            <div className="w-16" />
          </div>
          
          {error ? (
            /* Loading with Error State */
            <Card className="p-6 text-center bg-card border-border">
              <div className="text-4xl mb-4">⏳</div>
              <h3 className="text-lg font-bold mb-2 font-ui">{error}</h3>
              <p className="text-sm text-muted-foreground mb-4 font-ui">
                {retryCount > 0 ? `Attempt ${retryCount + 1}/3` : 'Please wait...'}
              </p>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, (retryCount + 1) * 33.33)}%` }}
                />
              </div>
            </Card>
          ) : (
            /* Normal Loading State */
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="p-4 bg-card border-border animate-pulse">
                  <div className="h-24 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2 mb-1" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state when not loading
  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="text-muted-foreground font-ui hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h2 className="text-xl font-bold font-ui">My Gallery 🎨</h2>
            <div className="w-16" />
          </div>
          
          <Card className="p-6 text-center bg-card border-border">
            <div className="text-6xl mb-4">😿</div>
            <h3 className="text-lg font-bold mb-2 font-ui">Oops! Connection Failed</h3>
            <p className="text-sm text-muted-foreground mb-4 font-ui">
              {error}
            </p>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => loadMemes(0)}
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-ui"
              >
                Try Again 🔄
              </Button>
              <Button 
                variant="outline"
                onClick={onBack}
                className="font-ui"
              >
                Go Back 🏠
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-muted-foreground font-ui hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h2 className="text-xl font-bold font-ui">My Gallery 🎨</h2>
          <div className="w-16" />
        </div>

        {memes.length === 0 ? (
          /* Empty State */
          <Card className="p-6 text-center brutal-shadow bg-card border-border">
            <div className="text-6xl mb-4">🐱</div>
            <h3 className="text-lg font-bold mb-2 font-ui">No Memes Yet!</h3>
            <p className="text-sm text-muted-foreground mb-4 font-ui">
              Time to create your first legendary POPCAT meme! 🚀
            </p>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={onCreateNew}
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-ui"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Meme 🎨
              </Button>
              <Button 
                variant="outline"
                onClick={() => loadMemes(0)}
                className="font-ui"
              >
                Refresh 🔄
              </Button>
            </div>
          </Card>
        ) : (
          /* Gallery Grid */
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground font-ui">
                {memes.length} epic meme{memes.length !== 1 ? 's' : ''} in your collection 🔥
              </p>
            </div>

            {/* 3-column grid for mobile */}
            <div className="grid grid-cols-1 gap-4">
              {memes.map((meme) => (
                <Card key={meme.id} className="p-4 bg-card border-border brutal-shadow">
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                       {(() => {
                         const thumbUrl = meme.image_url || meme.image_urls?.preview || meme.image_urls?.original;
                         return thumbUrl && !hasPlaceholderPreview(meme) ? (
                           <img 
                             src={thumbUrl}
                             alt={`Meme #${meme.id_short}`}
                             className="w-full h-full object-cover"
                             onError={(e) => {
                               const target = e.target as HTMLElement;
                               target.style.display = 'none';
                               const fallback = target.nextElementSibling as HTMLElement;
                               if (fallback) fallback.style.display = 'flex';
                               // Auto-repair attempt
                               autoRepairMemePreview(meme);
                             }}
                           />
                         ) : null;
                       })()}
                       <div 
                         className="text-2xl w-full h-full flex items-center justify-center" 
                         style={{ display: (meme.image_url || meme.image_urls?.preview || meme.image_urls?.original) && !hasPlaceholderPreview(meme) ? 'none' : 'flex' }}
                       >
                         {hasPlaceholderPreview(meme) ? (
                           repairingMemes.has(meme.id) ? (
                             <span className="text-sm text-blue-500 animate-pulse">🔧</span>
                           ) : (
                             <span className="text-sm text-destructive">❌</span>
                           )
                         ) : (
                           '🐱'
                         )}
                       </div>
                       {hasPlaceholderPreview(meme) && (
                         <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
                           {repairingMemes.has(meme.id) ? (
                             <span className="text-xs text-blue-500 font-bold animate-pulse">FIXING</span>
                           ) : (
                             <span className="text-xs text-destructive font-bold">NO IMG</span>
                           )}
                         </div>
                       )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-accent font-ui">#{meme.id_short}</span>
                        <span className="text-xs text-muted-foreground font-ui">
                          {meme.template_key.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-ui mb-2">
                        {formatDate(meme.created_at)}
                      </p>
                       <div className="flex gap-1">
                         <Button
                           variant="outline"
                           size="sm"
                           className="text-xs h-7 px-2 font-ui"
                           onClick={() => downloadMeme(meme)}
                         >
                           <Download className="w-3 h-3" />
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           className="text-xs h-7 px-2 font-ui text-accent hover:text-accent"
                           onClick={() => copyMemeCommand(meme.id_short)}
                         >
                           <Copy className="w-3 h-3" />
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           className="text-xs h-7 px-2 font-ui text-destructive hover:text-destructive"
                           onClick={() => deleteMeme(meme.id, meme.id_short)}
                         >
                           <Trash2 className="w-3 h-3" />
                         </Button>
                       </div>
                    </div>
                  </div>
                  
                   {/* Publish hint with copy button */}
                   <div className="mt-3 pt-3 border-t border-border">
                     <div className="flex items-center justify-between">
                       <p className="text-xs text-muted-foreground font-ui">
                         Share in group: <code className="bg-muted px-1 rounded">/meme {meme.id_short}</code>
                       </p>
                       <Button
                         variant="ghost"
                         size="sm"
                         className="text-xs h-6 px-2 font-ui text-accent hover:text-accent hover:bg-accent/10"
                         onClick={() => copyMemeCommand(meme.id_short)}
                       >
                         <Copy className="w-3 h-3 mr-1" />
                         Copy
                       </Button>
                     </div>
                   </div>
                </Card>
              ))}
            </div>

            {/* Create New Button */}
            <Button
              onClick={onCreateNew}
              className="w-full h-12 font-ui bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Meme 🎨
            </Button>

          </div>
        )}
      </div>
    </div>
  );
};