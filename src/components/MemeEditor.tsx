import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Save, Download, Upload, RotateCw, FlipHorizontal, Plus, Bold, Italic, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { memeLayerSchema, memeTextSchema, sanitizeText, validateTelegramId, sanitizeLayer } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/messages';
import { assets } from '@/assets';
import { useMemeCanvas } from '@/hooks/useMemeCanvas';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Layer, TelegramUser } from '@/types';
import { POPCAT_CONFIG, FILE_UPLOAD_LIMITS, TELEGRAM_ID_RANGE } from '@/lib/constants';
import { invokeEdgeFunction } from '@/utils/edgeInvoke';
import { safeString, isNetworkError } from '@/utils/errorHandling';
import { enqueueSaveMeme } from '@/utils/offlineQueue';


interface MemeEditorProps {
  onBack: () => void;
  onSave: (memeId: string) => void;
  telegramUserId?: number;
}

// FIXED: Move generateId outside component to prevent recreation on every render
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers (Safari < 15.4)
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// FIXED: Shadow configuration utilities for consistent format across all code paths
const SHADOW_DEFAULT = JSON.stringify({
  enabled: true,
  color: 'rgba(0,0,0,0.5)',
  blur: 5,
  offsetX: 2,
  offsetY: 2
});

const createShadowConfig = (enabled: boolean): string => 
  enabled ? SHADOW_DEFAULT : '';

const toggleShadow = (currentShadow: string): string => {
  if (!currentShadow) return SHADOW_DEFAULT;
  try {
    const config = JSON.parse(currentShadow);
    config.enabled = !config.enabled;
    return JSON.stringify(config);
  } catch {
    // If parsing fails (old format), return empty to disable
    return '';
  }
};

// Timeout protection for network calls to avoid the UI getting stuck on pending Promises
const raceWithTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
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

const TEMPLATES = [
  { key: 'pop_vs_closed', name: 'POP vs Closed 🐱' },
  { key: 'yes_pop', name: 'Yes POP ✅' },
  { key: 'click_wars', name: 'Click Wars ⚔️' },
  { key: 'pro_gamer', name: 'Pro Gamer 🎮' },
  { key: 'evolution', name: 'Evolution 📈' },
  { key: 'world_record', name: 'World Record 🏆' }
];

const BACKGROUNDS = [
  { key: 'room', name: 'Room 🛏️', url: assets.backgrounds.room },
  { key: 'neon', name: 'Neon 💜', url: assets.backgrounds.neon },
  { key: 'beach', name: 'Beach 🌊', url: assets.backgrounds.beach },
  { key: 'office', name: 'Office 💻', url: assets.backgrounds.office },
  { key: 'fire', name: 'Fire 🔥', url: assets.backgrounds.fire },
  { key: 'meme', name: 'Meme 🎭', url: assets.backgrounds.meme }
];

const BODIES = [
  { key: 'lasers', name: 'Lasers 👁️', url: assets.bodies.lasers },
  { key: 'gamer', name: 'Gamer 🎮', url: assets.bodies.gamer },
  { key: 'otaku', name: 'Otaku 📺', url: assets.bodies.otaku },
  { key: 'threeD', name: '3D 🎨', url: assets.bodies.threeD },
  { key: 'classic', name: 'Classic 🐱', url: assets.bodies.classic },
  { key: 'cartoon', name: 'Cartoon 🎨', url: assets.bodies.cartoon }
];

const PROPS = [
  { key: 'glasses', name: 'Chad Shades 😎', url: assets.props.glasses },
  { key: 'chain', name: 'Drip 💎', url: assets.props.chain },
  { key: 'flag', name: 'Nation 🚩', url: assets.props.flag },
  { key: 'confetti', name: 'Celebrate 🎉', url: assets.props.confetti },
  { key: 'crown', name: 'King 👑', url: assets.props.crown },
  { key: 'headphones', name: 'Gamer 🎧', url: assets.props.headphones },
  { key: 'diamondHands', name: 'HODL 💎🙌', url: assets.props.diamondHands },
  { key: 'rocket', name: 'To The Moon 🚀', url: assets.props.rocket },
  { key: 'controller', name: 'Pro Player 🎮', url: assets.props.controller },
  { key: 'coin', name: 'Rich 🪙', url: assets.props.coin }
];

const HEADS = [
  { key: 'popcat', name: 'Closed 🐱', url: assets.heads.popcat },
  { key: 'megapopcat', name: 'POP! 😮', url: assets.heads.megapopcat },
  { key: 'laser', name: 'Laser 👁️', url: assets.heads.laser }
];

const buildTemplateLayers = (templateKey: string): Layer[] => {
  const baseBg: Layer = { id: 'bg', type: 'background', content: 'meme', x: 50, y: 50, scale: 1, rotation: 0, zIndex: 0 };
  switch (templateKey) {
    case 'pop_vs_closed':
      return [
        { id: 'bg', type: 'background', content: assets.backgrounds.meme, x: 50, y: 50, scale: 1.0, rotation: 0, zIndex: 0 },
        { id: 'body_left', type: 'body', content: assets.templates.pop_vs_closed.closedBody, x: 30, y: 65, scale: 0.85, rotation: 0, zIndex: 1 },
        { id: 'head_left', type: 'head', content: assets.templates.pop_vs_closed.closedHead, x: 30, y: 40, scale: 0.75, rotation: 0, zIndex: 2 },
        { id: 'text_left', type: 'text', content: 'CLOSED', x: 30, y: 18, scale: 0.8, rotation: 0, zIndex: 3, fontSize: 16, fontFamily: 'Impact, sans-serif', fontWeight: 'bold', fontStyle: 'normal', textColor: '#000000', strokeColor: '#ffffff', strokeWidth: 2, textAlign: 'center', textShadow: createShadowConfig(false) },
        { id: 'body_right', type: 'body', content: assets.templates.pop_vs_closed.popBody, x: 70, y: 65, scale: 0.90, rotation: 0, zIndex: 1 },
        { id: 'head_right', type: 'head', content: assets.templates.pop_vs_closed.popHead, x: 70, y: 40, scale: 0.80, rotation: 0, zIndex: 2 },
        { id: 'text_right', type: 'text', content: 'POP! 😮', x: 70, y: 18, scale: 0.9, rotation: 0, zIndex: 3, fontSize: 18, fontFamily: 'Impact, sans-serif', fontWeight: 'bold', fontStyle: 'normal', textColor: '#000000', strokeColor: '#ffffff', strokeWidth: 2, textAlign: 'center', textShadow: createShadowConfig(false) },
      ];
    case 'yes_pop':
      return [
        { id: 'bg', type: 'background', content: assets.backgrounds.meme, x: 50, y: 50, scale: 1.0, rotation: 0, zIndex: 0 },
        { id: 'body', type: 'body', content: assets.templates.yes_pop.popBody, x: 50, y: 65, scale: 1.05, rotation: 0, zIndex: 1 },
        { id: 'head', type: 'head', content: assets.templates.yes_pop.popHead, x: 50, y: 40, scale: 0.90, rotation: 0, zIndex: 2 },
        { id: 'text', type: 'text', content: 'YES.', x: 50, y: 15, scale: 1.2, rotation: 0, zIndex: 3, fontSize: 32, fontFamily: 'Impact, sans-serif', fontWeight: 'bold', fontStyle: 'normal', textColor: '#000000', strokeColor: '#ffffff', strokeWidth: 3, textAlign: 'center', textShadow: createShadowConfig(false) },
      ];
    case 'click_wars':
      return [
        { id: 'bg', type: 'background', content: assets.backgrounds.room, x: 50, y: 50, scale: 1.0, rotation: 0, zIndex: 0 },
        { id: 'body', type: 'body', content: assets.templates.click_wars.popBody, x: 50, y: 65, scale: 1.05, rotation: 0, zIndex: 1 },
        { id: 'head', type: 'head', content: assets.templates.click_wars.popHead, x: 50, y: 40, scale: 0.90, rotation: 0, zIndex: 2 },
        { id: 'text', type: 'text', content: 'CLICK CHAMPION', x: 50, y: 15, scale: 1.0, rotation: 0, zIndex: 3, fontSize: 22, fontFamily: 'Impact, sans-serif', fontWeight: 'bold', fontStyle: 'normal', textColor: '#000000', strokeColor: '#ffffff', strokeWidth: 3, textAlign: 'center', textShadow: createShadowConfig(false) },
      ];
    case 'pro_gamer':
      return [
        { id: 'bg', type: 'background', content: assets.backgrounds.neon, x: 50, y: 50, scale: 1.0, rotation: 0, zIndex: 0 },
        { id: 'body', type: 'body', content: assets.templates.pro_gamer.popBody, x: 50, y: 68, scale: 1.0, rotation: 0, zIndex: 1 },
        { id: 'head', type: 'head', content: assets.templates.pro_gamer.popHead, x: 50, y: 42, scale: 0.85, rotation: 0, zIndex: 2 },
        { id: 'text', type: 'text', content: 'PRO GAMER', x: 50, y: 15, scale: 0.8, rotation: 0, zIndex: 3, fontSize: 20, fontFamily: 'Impact, sans-serif', fontWeight: 'bold', fontStyle: 'normal', textColor: '#000000', strokeColor: '#ffffff', strokeWidth: 2, textAlign: 'center', textShadow: createShadowConfig(false) },
      ];
    case 'evolution':
      return [
        baseBg,
        { id: 'text_before', type: 'text', content: 'NOOB', x: 30, y: 12, scale: 0.9, rotation: 0, zIndex: 3, fontSize: 18, fontFamily: 'Impact, sans-serif', fontWeight: 'bold', fontStyle: 'normal', textColor: '#000000', strokeColor: '#ffffff', strokeWidth: 2, textAlign: 'center', textShadow: createShadowConfig(false) },
        { id: 'body_before', type: 'body', content: assets.templates.evolution.noobBody, x: 30, y: 65, scale: 0.85, rotation: 0, zIndex: 1 },
        { id: 'text_after', type: 'text', content: 'PRO 🚀', x: 70, y: 12, scale: 0.9, rotation: 0, zIndex: 3, fontSize: 18, fontFamily: 'Impact, sans-serif', fontWeight: 'bold', fontStyle: 'normal', textColor: '#000000', strokeColor: '#ffffff', strokeWidth: 2, textAlign: 'center', textShadow: createShadowConfig(false) },
        { id: 'body_after', type: 'body', content: assets.templates.evolution.proBody, x: 70, y: 65, scale: 0.90, rotation: 0, zIndex: 1 },
        { id: 'head_after', type: 'head', content: assets.templates.evolution.proHead, x: 70, y: 38, scale: 0.85, rotation: 0, zIndex: 2 },
      ];
    case 'world_record':
      return [
        baseBg,
        { id: 'body', type: 'body', content: assets.templates.world_record.popBody, x: 50, y: 65, scale: 1.0, rotation: 0, zIndex: 1 },
        { id: 'head', type: 'head', content: assets.templates.world_record.popHead, x: 50, y: 40, scale: 0.90, rotation: 0, zIndex: 2 },
        { id: 'trophy', type: 'prop', content: assets.templates.world_record.trophy, x: 75, y: 25, scale: 0.60, rotation: 0, zIndex: 3 },
        { id: 'text', type: 'text', content: 'WORLD RECORD 🏆', x: 50, y: 10, scale: 0.95, rotation: 0, zIndex: 4, fontSize: 22, fontFamily: 'Impact, sans-serif', fontWeight: 'bold', fontStyle: 'normal', textColor: '#000000', strokeColor: '#ffffff', strokeWidth: 2, textAlign: 'center', textShadow: createShadowConfig(false) },
      ];
    default:
      return [baseBg];
  }
};

export const MemeEditor = ({ onBack, onSave, telegramUserId }: MemeEditorProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: 'bg',
      type: 'background',
      content: 'neutral',
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
      zIndex: 0
    }
  ]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [textContent, setTextContent] = useState('');
  const [allCaps, setAllCaps] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  // Store uploaded images in ref for memory management
  const uploadedImagesRef = useRef<Record<string, string>>({});
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingTextValue, setEditingTextValue] = useState('');
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mobilePreviewUrl, setMobilePreviewUrl] = useState<string | null>(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const { canvasRef, exportCanvas, setTextDraft } = useMemeCanvas(layers, 400, setLayers, setSelectedLayer);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  
  // CRITICAL FIX: Refs to track latest values for cleanup without re-running effect
  const isEditingTextRef = useRef(isEditingText);
  const editingTextValueRef = useRef(editingTextValue);

  // Live text editing is applied directly to the Fabric object via setTextDraft to avoid canvas resets.

  // Handle text editing (draft only, no layer updates until commit)
  const handleTextEdit = (layerId: string, newText: string) => {
    setEditingTextValue(newText);
    if (!isEditingText) {
      setIsEditingText(true);
    }
    // FIXED: Only update if setTextDraft exists
    if (setTextDraft) {
      setTextDraft(layerId, newText);
    }
  };

  // Apply template preset whenever the selected template changes
  useEffect(() => {
    setLayers(buildTemplateLayers(selectedTemplate.key));
    setSelectedLayer(null);
    
    // FIXED: Clear uploaded images memory when template changes to prevent memory leak
    uploadedImagesRef.current = {};
  }, [selectedTemplate.key]);

  // Ensure selectedLayer is valid after layers change
  useEffect(() => {
    if (selectedLayer && !layers.find(layer => layer.id === selectedLayer)) {
      setSelectedLayer(null);
    }
  }, [layers, selectedLayer]);

  const addLayer = (type: Layer['type'], content: string) => {
    const newLayer: Layer = {
      id: generateId(),
      type,
      content,
      x: type === 'background' ? 50 : 20 + Math.random() * 60, // Random position for non-backgrounds
      y: type === 'background' ? 50 : 20 + Math.random() * 60,
      scale: type === 'background' ? 1 : 0.8, // Smaller scale for non-backgrounds
      rotation: 0,
      zIndex: 0, // Will be recalculated based on current layers length
      // Add default text properties for text layers
      ...(type === 'text' ? {
        fontSize: 24,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fontStyle: 'normal',
        textColor: '#000000',
        strokeColor: '#ffffff',
        strokeWidth: 2,
        textAlign: 'center',
        textShadow: createShadowConfig(false)  // FIXED: Use consistent JSON format
      } : {})
    };
    
    // FIXED: Use functional form to prevent race condition
    setLayers(prevLayers => {
      const updatedLayer = { ...newLayer, zIndex: prevLayers.length };
      return [...prevLayers, updatedLayer];
    });
    setSelectedLayer(newLayer.id);
  };

  // FIXED: Memoize updateLayer to prevent useEffect dependency issues
  const updateLayer = useCallback((id: string, updates: Partial<Layer>) => {
    console.log('🔄 UpdateLayer called:', { id, updates });
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === id ? { ...layer, ...updates } : layer
      )
    );
    console.log('✅ Layer updated successfully:', { id, updates });
  }, []);

  const addTextLayer = () => {
    if (!textContent.trim()) return;
    
    try {
      // Validate and sanitize text input
      const validatedText = memeTextSchema.parse({ content: textContent });
      const sanitizedText = sanitizeText(validatedText.content);
      const finalText = allCaps ? sanitizedText.toUpperCase() : sanitizedText;
      
      addLayer('text', finalText);
      setTextContent('');
    } catch (error) {
      logger.warn('Invalid text input', error);
      toast({
        title: "Invalid text",
        description: ERROR_MESSAGES.VALIDATION.INVALID_TEXT,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > FILE_UPLOAD_LIMITS.MAX_SIZE) {
      toast({
        title: "File too large",
        description: ERROR_MESSAGES.VALIDATION.FILE_TOO_LARGE,
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!FILE_UPLOAD_LIMITS.ALLOWED_TYPES.includes(file.type as (typeof FILE_UPLOAD_LIMITS.ALLOWED_TYPES)[number])) {
      toast({
        title: "Invalid file type",
        description: ERROR_MESSAGES.VALIDATION.INVALID_FILE_TYPE,
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      // Validate data URL format
      if (dataUrl && dataUrl.startsWith('data:image/')) {
        // FIXED: Use generateId() directly without redundant prefix (generateId already returns complete UUID)
        const layerId = generateId();
        
        // Store image with memory management
        const newImages = {
          ...uploadedImagesRef.current,
          [layerId]: dataUrl
        };
        
        // FIXED: Limit cache size to prevent memory leak (max 10 images)
        const imageKeys = Object.keys(newImages);
        if (imageKeys.length > 10) {
          const oldestKey = imageKeys[0];
          delete newImages[oldestKey];
          logger.info('Removed oldest uploaded image from memory', { removedKey: oldestKey });
        }
        
        uploadedImagesRef.current = newImages;

        const newLayer: Layer = {
          id: layerId,
          type: 'head',
          content: dataUrl,
          x: 20 + Math.random() * 60,
          y: 20 + Math.random() * 60,
          scale: 0.8,
          rotation: 0,
          zIndex: 0 // Will be set based on current layers
        };

        // FIXED: Use functional form to prevent race condition
        setLayers(prevLayers => [...prevLayers, { ...newLayer, zIndex: prevLayers.length }]);
        setSelectedLayer(layerId);
        
        toast({
          title: "Image added",
          description: SUCCESS_MESSAGES.PROCESSING.IMAGE_ADDED,
        });
      } else {
        toast({
          title: "Upload failed",
          description: ERROR_MESSAGES.VALIDATION.UPLOAD_FAILED,
          variant: "destructive",
        });
      }
    };
    reader.onerror = () => {
      toast({
        title: "Upload failed",
        description: ERROR_MESSAGES.VALIDATION.READ_FAILED,
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const downloadMeme = async () => {
    if (!exportCanvas) {
      toast({
        title: "Download failed",
        description: ERROR_MESSAGES.PROCESSING.CANVAS_NOT_READY,
        variant: "destructive",
      });
      return;
    }
    
    // FIXED: Single try-catch with proper cleanup in finally block
    setIsExporting(true);
    
    try {
      const dataUrl = await exportCanvas();
      if (!dataUrl) {
        toast({
          title: "Download failed",
          description: "Could not generate the image. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Create a temporary canvas for high quality export with watermark
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 800;
      tempCanvas.height = 800;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) {
        toast({
          title: "Download failed",
          description: "Could not create canvas context. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Fill with white background
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Load and draw the canvas image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = async () => {
          try {
            // Draw the main canvas content scaled up
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
            
            // Get final data URL
            const finalDataUrl = tempCanvas.toDataURL('image/png', 1.0);
            
            if (isMobile) {
              // Mobile: try to share or show preview
              try {
                const blob = await new Promise<Blob | null>((resolve) => {
                  tempCanvas.toBlob((b) => resolve(b), 'image/png', 1.0);
                });
                
                if (blob) {
                  const fileName = `popcat-meme-${Date.now()}.png`;
                  const file = new File([blob], fileName, { type: 'image/png' });
                  
                  // Type-safe check for Web Share API
                  if (typeof navigator !== 'undefined' && 'share' in navigator) {
                    try {
                      const nav = navigator as { canShare?: (data: unknown) => boolean; share?: (data: unknown) => Promise<void> };
                      const canShare = nav.canShare?.({ files: [file] }) ?? false;
                      
                      if (canShare && nav.share) {
                        await nav.share({ files: [file], title: 'POPCAT Meme' });
                        toast({ title: 'Shared! 🎉', description: 'Meme sent to your chosen app!' });
                        resolve();
                        return;
                      }
                    } catch (shareErr) {
                      logger.debug('Web Share API failed, using fallback', shareErr);
                    }
                  }
                  
                  // Fallback: show inline preview modal
                  const url = URL.createObjectURL(blob);
                  setMobilePreviewUrl(url);
                  setMobilePreviewOpen(true);
                  toast({ title: 'Image ready 📱', description: 'Tap and hold the image to save.' });
                } else {
                  // No blob: use data URL in modal
                  setMobilePreviewUrl(finalDataUrl);
                  setMobilePreviewOpen(true);
                  toast({ title: 'Image ready 📱', description: 'Tap and hold the image to save.' });
                }
              } catch (blobErr) {
                logger.error('Failed to create blob for mobile', blobErr);
                setMobilePreviewUrl(finalDataUrl);
                setMobilePreviewOpen(true);
                toast({ title: 'Image ready 📱', description: 'Tap and hold the image to save.' });
              }
              resolve();
            } else {
              // Desktop: use blob for better compatibility
              tempCanvas.toBlob((blob) => {
                if (!blob) {
                  // Fallback to dataURL
                  const link = document.createElement('a');
                  link.download = `popcat-meme-${Date.now()}.png`;
                  link.href = finalDataUrl;
                  document.body.appendChild(link);
                  link.click();
                  // FIXED: Use managed timeout with safety check
                  timeoutIdRef.current = setTimeout(() => {
                    if (link && document.body.contains(link)) {
                      document.body.removeChild(link);
                    }
                    timeoutIdRef.current = null;
                  }, 100);
                  toast({ title: "Meme downloaded! 🔥", description: "Your masterpiece is ready to dominate the internet." });
                  resolve();
                  return;
                }
                
                // Create download link
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `popcat-meme-${Date.now()}.png`;
                link.href = url;
                
                document.body.appendChild(link);
                link.click();
                
                // FIXED: Use managed timeout with safety checks
                timeoutIdRef.current = setTimeout(() => {
                  if (link && document.body.contains(link)) {
                    document.body.removeChild(link);
                  }
                  URL.revokeObjectURL(url);
                  timeoutIdRef.current = null;
                }, 100);
                
                toast({
                  title: "Meme downloaded! 🔥",
                  description: "Your masterpiece is ready to dominate the internet.",
                });
                resolve();
              }, 'image/png', 1.0);
            }
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Error loading canvas image'));
        };
        
        img.src = dataUrl;
      });
      
    } catch (error) {
      logger.error('Download failed', error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Could not generate the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      // FIXED: Always cleanup in finally block
      setIsExporting(false);
    }
  };


  const saveMeme = async () => {
    // ANTI-DOUBLE-CLICK: Previne múltiplas execuções simultâneas
    if (isExporting) {
      logger.warn('Save already in progress, ignoring duplicate click');
      toast({
        title: "Already saving",
        description: "Please wait for the current save to complete.",
        variant: "default",
      });
      return;
    }

    let currentIdemKey: string | undefined;
    let layersPayloadVar: Layer[] = [];
    let lastImageDataUrl: string | null = null;
    let finalTelegramUserId: number | undefined;

    try {
      setIsExporting(true);
      
      // Validate telegram user ID with fallback
      let userTelegramId = telegramUserId;
      
      // If no telegramUserId provided, try to get from current context or use development fallback
      if (!userTelegramId) {
        logger.warn('No telegramUserId provided, using development fallback');
        userTelegramId = TELEGRAM_ID_RANGE.DEV_MOCK_ID; // Use constant instead of magic number
      }
      
      finalTelegramUserId = userTelegramId;
      
      if (!validateTelegramId(userTelegramId)) {
        logger.error('Invalid telegram user ID', { 
          provided: telegramUserId, 
          fallback: userTelegramId,
          type: typeof userTelegramId 
        });
        throw new Error('Invalid user session. Please refresh the app and try again.');
      }
      
      // Validate all layers (sanitize first to remove NaN, Infinity, undefined)
      const validatedLayers = layers.map((layer, index) => {
        try {
          // Test JSON serialization BEFORE sanitizing to catch the actual problem
          try {
            JSON.stringify(layer);
          } catch (jsonError) {
            logger.error('❌ Layer cannot be JSON serialized', { 
              layerIndex: index, 
              layer,
              error: jsonError instanceof Error ? jsonError.message : String(jsonError)
            });
            throw new Error(`Layer ${index + 1} contains invalid data that cannot be serialized`);
          }
          
          const sanitized = sanitizeLayer(layer);
          
          // Test JSON serialization AFTER sanitizing
          try {
            JSON.stringify(sanitized);
          } catch (jsonError) {
            logger.error('❌ Sanitized layer cannot be JSON serialized', { 
              layerIndex: index, 
              sanitized,
              error: jsonError instanceof Error ? jsonError.message : String(jsonError)
            });
            throw new Error(`Layer ${index + 1} contains invalid data after sanitization`);
          }
          
          return memeLayerSchema.parse(sanitized);
        } catch (error) {
          logger.error('Layer validation failed', { 
            layerIndex: index, 
            layer, 
            error: error instanceof Error ? error.message : error,
            validationError: error
          });
          throw new Error(`Invalid meme data - Layer ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
      
      // Get current user data
      logger.info('🔍 Fetching/creating user data', { telegramId: userTelegramId });
      
      // First try to get existing user
      const { data: userId, error: userError } = await supabase
        .rpc('get_user_id_by_telegram_id', { 
          telegram_user_id: userTelegramId 
        });
      
      let userData: { id: string };
      
      if (!userError && userId) {
        logger.info('✅ Existing user found', { userId });
        userData = { id: userId };
      } else if (!userError && !userId) {
        // If user doesn't exist, create them
        logger.info('👤 User not found, creating new user', { telegramId: userTelegramId });
        
        const { data: newUserId, error: createError } = await supabase
          .rpc('create_user_if_not_exists', { 
            telegram_user_id: userTelegramId,
            user_first_name: 'Chad' // Default name for web users
          });
        
        if (createError) {
          throw new Error(`Failed to create user: ${createError.message}`);
        }
        
        if (!newUserId) {
          throw new Error('User creation returned no ID');
        }
        
        logger.info('✅ New user created successfully', { userId: newUserId });
        userData = { id: newUserId };
      } else {
        throw userError || new Error('Unknown error fetching user');
      }

      // Validate user data
      if (!userData?.id || typeof userData.id !== 'string' || userData.id.length === 0) {
        logger.error('❌ User data invalid', { 
          telegramId: userTelegramId,
          userData,
          hasUserData: !!userData,
          hasUserId: userData?.id
        });
        throw new Error('Invalid user session. Please refresh and try again.');
      }

      logger.info('✅ User data retrieved successfully', userData);

      // FIXED: Removed duplicate short ID generation - edge function handles this
      // The save-meme edge function generates the short ID internally
      
      // FIXED: Build payload-safe layers (strip huge data URLs, enforce content length)
      const payloadSafeLayers = validatedLayers.map((l) => {
        let content = l.content || '';
        if (typeof content === 'string' && (content.startsWith('data:image/') || content.length > 9800)) {
          content = 'uploaded_asset'; // compact placeholder; actual image is in final exported image
        }
        return { ...l, content };
      });
      layersPayloadVar = payloadSafeLayers;

      // Export canvas to image data URL with null check
      if (!exportCanvas) {
        throw new Error('Canvas export function not available');
      }
      
      const imageDataUrl = await exportCanvas();
      if (!imageDataUrl) {
        throw new Error('Failed to export canvas image - canvas may not be ready');
      }
      lastImageDataUrl = imageDataUrl;
      // Save meme to database first with retry logic
      logger.info('🚀 Saving meme via edge function', {
        templateKey: selectedTemplate.key,
        layersCount: validatedLayers.length,
        hasImage: !!imageDataUrl,
        telegramUserId
      });

      // Deterministic idempotency key based on content (sanitize layers for consistent hash)
      const computeIdemKey = async () => {
        try {
          const enc = new TextEncoder();
          // Sanitize layers before hashing to avoid NaN/undefined inconsistencies
          const cleanLayers = layersPayloadVar.map(sanitizeLayer);
          
          const payloadToHash = {
            uid: userTelegramId,
            templateKey: selectedTemplate.key,
            layers: cleanLayers,
            image: imageDataUrl
          };
          
          // Test JSON serialization before encoding
          let jsonString: string;
          try {
            jsonString = JSON.stringify(payloadToHash);
          } catch (jsonError) {
            logger.error('❌ Cannot serialize idempotency payload', { 
              payloadToHash,
              error: jsonError instanceof Error ? jsonError.message : String(jsonError)
            });
            throw new Error('Cannot create idempotency key: invalid data');
          }
          
          const data = enc.encode(jsonString);
          const digest = await crypto.subtle.digest('SHA-256', data);
          const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
          return hex;
        } catch (error) {
          logger.error('❌ Failed to compute idempotency key', error);
          throw new Error('Failed to compute idempotency key: ' + (error instanceof Error ? error.message : String(error)));
        }
      };
      const idempotencyKey = await computeIdemKey();
      currentIdemKey = idempotencyKey;

      // Save meme via edge function using centralized invoker with idempotency
      const saveData = await invokeEdgeFunction<any>('save-meme', {
        telegramUserId: userTelegramId,
        templateKey: selectedTemplate.key,
        layersPayload: layersPayloadVar,
        image: imageDataUrl,
        idempotencyKey,
      }, { timeoutMs: 30000, attempts: 3, delayMs: 1500 });

      const returnedShortId = saveData?.id_short as string | undefined;
      const memeIdReturned = saveData?.memeId as string | undefined;
      const previewUrl = saveData?.url as string | undefined;

      if (!returnedShortId || !memeIdReturned) {
        logger.error('❌ save-meme missing fields', saveData);
        throw new Error('Save failed: missing data from server');
      }

      logger.info('✅ Meme saved successfully via edge function', {
        memeId: memeIdReturned,
        shortId: returnedShortId,
        previewUrl,
      });

      toast({
        title: `+${POPCAT_CONFIG.SAVE_MEME_POINTS} 🐱 POPS added to your collection!`,
        description: `Meme saved as #${returnedShortId}. Share it with the POPCAT community!`,
      });

      onSave(returnedShortId);
    } catch (error: unknown) {
      const rawError = error;
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      logger.error('Meme save operation failed', {
        error: errorObj,
        rawError,
        errorMessage: errorObj.message,
        errorStack: errorObj.stack,
        telegramUserId,
        hasSelectedTemplate: !!selectedTemplate,
        layersCount: layers.length
      });
      
      // More user-friendly error messages with safe string fallback
      const rawMsg = safeString(errorObj, 'Could not save meme. Please try again.');
      let errorMessage = rawMsg;

      // Extract richer details when possible (ZodError or generic objects)
      const anyErr: any = errorObj as any;
      if (anyErr?.issues && Array.isArray(anyErr.issues)) {
        const details = anyErr.issues.map((i: any) => `${i.path?.join?.('.') || 'field'}: ${i.message}`).join('; ');
        errorMessage = `Validation failed: ${details}`;
      } else if (Array.isArray(anyErr?.details) && anyErr.details.length) {
        errorMessage = `Validation failed: ${anyErr.details.join('; ')}`;
      } else if (anyErr?.details && typeof anyErr.details === 'object') {
        const d = anyErr.details as any;
        const innerMsg = typeof d.message === 'string' ? d.message : (typeof d.error === 'string' ? d.error : undefined);
        if (innerMsg) {
          errorMessage = innerMsg;
        } else {
          try { errorMessage = JSON.stringify(d); } catch { /* ignore */ }
        }
      } else if (rawMsg === '[object Object]' || rawMsg.toLowerCase() === 'object object') {
        // Prefer nested error.message if different from raw
        const nestedMsg = typeof anyErr?.error?.message === 'string' ? anyErr.error.message : undefined;
        const ownMsg = typeof anyErr?.message === 'string' ? anyErr.message : undefined;
        if (nestedMsg && nestedMsg.toLowerCase() !== '[object object]') {
          errorMessage = nestedMsg;
        } else if (ownMsg && ownMsg.toLowerCase() !== '[object object]') {
          errorMessage = ownMsg;
        } else {
          try {
            errorMessage = JSON.stringify(anyErr);
          } catch {
            errorMessage = 'Ocorreu um erro desconhecido ao salvar o meme. Tente novamente.';
          }
        }
      }
      
      const msg = errorMessage.toLowerCase();
      if (msg.includes('session') || msg.includes('invalid user')) {
        errorMessage = 'Sua sessão expirou. Atualize a página e tente novamente.';
      } else if (msg.includes('circular structure')) {
        errorMessage = 'Um dos layers contém dados inválidos (referência circular). Remova e adicione novamente o elemento.';
      } else if (msg.includes('validation failed') || msg.includes('invalid') || msg.includes('layers')) {
        // keep detailed validation message
      } else if (msg.includes('database')) {
        errorMessage = 'Erro no banco de dados. Tente novamente em instantes.';
      } else if (msg.includes('canvas') || msg.includes('export')) {
        errorMessage = 'Falha ao gerar a imagem. Tente atualizar a página.';
      }

      // Final fallback to avoid empty or generic object messages
      if (!errorMessage || !errorMessage.trim() || errorMessage === '{}' || errorMessage === '[]' || errorMessage.toLowerCase() === '[object object]') {
        errorMessage = 'Falha ao salvar: erro desconhecido. Abra o console (F12) e tente novamente.';
      }
      
      const net = isNetworkError(errorObj) || msg.includes('connection') || msg.includes('network') || msg.includes('timeout') || msg.includes('failed to send') || msg.includes('failed to fetch') || msg.includes('fetch');
      if (net) {
        if (finalTelegramUserId && layersPayloadVar.length && lastImageDataUrl && currentIdemKey) {
          enqueueSaveMeme({
            telegramUserId: finalTelegramUserId,
            templateKey: selectedTemplate.key,
            layersPayload: layersPayloadVar,
            image: lastImageDataUrl,
            idempotencyKey: currentIdemKey,
          });
          toast({
            title: 'No connection',
            description: 'Meme queued and will be saved when you\'re back online.',
          });
        } else {
          toast({
            title: 'Conexão instável',
            description: 'Tentaremos novamente automaticamente.',
          });
        }
      } else {
        toast({
          title: 'Save failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      // FIXED: Always clear timeout in outer finally, regardless of success/error/retry outcome
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      setIsExporting(false);
    }
  };
  
  // FIXED: Calculate selectedLayerData before using it
  const selectedLayerData = layers.find(l => l.id === selectedLayer);
  
  // FIXED: Commit text changes immediately on blur or selection change (not on unmount)
  const commitTextChange = useCallback(() => {
    if (isEditingText && selectedLayer) {
      const trimmedText = editingTextValue.trim();
      if (trimmedText) {
        updateLayer(selectedLayer, { content: trimmedText });
      }
      setIsEditingText(false);
    }
  }, [isEditingText, selectedLayer, editingTextValue, updateLayer]);
  
  // CRITICAL FIX: Keep refs in sync with latest state
  useEffect(() => {
    isEditingTextRef.current = isEditingText;
    editingTextValueRef.current = editingTextValue;
  }, [isEditingText, editingTextValue]);
  
  // Sync editing text value when layer is selected
  useEffect(() => {
    if (selectedLayerData && selectedLayerData.type === 'text') {
      setEditingTextValue(selectedLayerData.content);
      setIsEditingText(false);
    }
  }, [selectedLayer, selectedLayerData]);
  
  // CRITICAL FIX: Commit text changes when selection changes (using refs for fresh values)
  useEffect(() => {
    // Commit any pending text changes when switching layers
    return () => {
      // ✅ Access CURRENT values via ref (no stale closure)
      if (isEditingTextRef.current && selectedLayer && editingTextValueRef.current.trim()) {
        // Use functional form to ensure we're working with latest state
        setLayers(prevLayers => 
          prevLayers.map(layer => 
            layer.id === selectedLayer && layer.type === 'text'
              ? { ...layer, content: editingTextValueRef.current.trim() } 
              : layer
          )
        );
      }
    };
  }, [selectedLayer]); // ✅ Only re-runs when selectedLayer changes (performance optimized)

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
          <h2 className="text-xl font-bold font-ui">Meme Factory 🏭</h2>
          <div className="w-16" />
        </div>

        {/* Template Selection */}
        <Card className="p-4 mb-4 bg-card border-border">
          <Label className="text-sm font-ui mb-2 block">🐱 Pick Your Pop Template</Label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {TEMPLATES.map(template => (
              <Button
                key={template.key}
                variant={selectedTemplate.key === template.key ? "default" : "outline"}
                className={`text-xs font-ui px-3 py-2 h-auto min-h-[2.5rem] text-center leading-tight ${
                  selectedTemplate.key === template.key 
                    ? 'bg-accent text-accent-foreground' 
                    : 'bg-secondary text-secondary-foreground'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <span className="break-words">{template.name}</span>
              </Button>
            ))}
          </div>
        </Card>

        {/* Canvas Preview */}
        <div className="relative overflow-hidden">
          <canvas 
            ref={canvasRef}
            className="block w-full h-full"
            width={400}
            height={400}
            onClick={(e) => {
              // Simple layer selection based on click position
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              
              // Find the topmost layer at this position (simple approximation)
              const clickedLayer = layers
                .filter(layer => layer.type !== 'background')
                .sort((a, b) => b.zIndex - a.zIndex)
                .find(layer => {
                  const distance = Math.sqrt(
                    Math.pow(layer.x - x, 2) + Math.pow(layer.y - y, 2)
                  );
                  return distance < 25; // Increased threshold for better selection
                });
                 
              if (clickedLayer) {
                setSelectedLayer(clickedLayer.id);
              } else {
                // If no layer is found at click position, deselect
                setSelectedLayer(null);
              }
            }}
          />
        </div>

        {/* Layer Controls */}
        {selectedLayer && selectedLayerData && (
          <Card className="p-4 mb-4 mt-6 bg-card border-border">
            {selectedLayerData.type === 'text' ? (
              // Text editing panel
              <>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-ui">
                    Text: "{selectedLayerData.content.substring(0, 20)}{selectedLayerData.content.length > 20 ? '...' : ''}"
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    Z: {selectedLayerData.zIndex}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-ui">Text Content</Label>
                    <Input
                      value={isEditingText ? editingTextValue : selectedLayerData.content}
                      onChange={(e) => {
                        if (selectedLayer) {
                          handleTextEdit(selectedLayer, e.target.value);
                        }
                      }}
                      onFocus={() => {
                        setIsEditingText(true);
                        setEditingTextValue(selectedLayerData.content);
                      }}
                      onBlur={() => {
                        // CRITICAL FIX: Safe null check before update
                        if (selectedLayer) {
                          updateLayer(selectedLayer, { content: editingTextValue });
                          setIsEditingText(false);
                        }
                      }}
                      placeholder="Enter text..."
                      className="text-xs"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs font-ui">Font Family</Label>
                    <Select
                      value={selectedLayerData.fontFamily || 'Arial, sans-serif'}
                      onValueChange={(value) => {
                        if (selectedLayer) {
                          updateLayer(selectedLayer, { fontFamily: value });
                        }
                      }}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                        <SelectItem value="Georgia, serif">Georgia</SelectItem>
                        <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                        <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                        <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                        <SelectItem value="Impact, sans-serif">Impact</SelectItem>
                        <SelectItem value="'Comic Sans MS', cursive">Comic Sans</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-ui">Font Size</Label>
                      <Input
                        type="range"
                        min="8"
                        max="72"
                        value={selectedLayerData.fontSize || 24}
                        onChange={(e) => {
                          if (selectedLayer) {
                            updateLayer(selectedLayer, { fontSize: parseInt(e.target.value) });
                          }
                        }}
                        className="h-6"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs font-ui">Stroke Width</Label>
                      <Input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={selectedLayerData.strokeWidth || 2}
                        onChange={(e) => {
                          if (selectedLayer) {
                            updateLayer(selectedLayer, { strokeWidth: parseFloat(e.target.value) });
                          }
                        }}
                        className="h-6"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-ui">Text Color</Label>
                      <Input
                        type="color"
                        value={selectedLayerData.textColor || '#000000'}
                        onChange={(e) => {
                          if (selectedLayer) {
                            updateLayer(selectedLayer, { textColor: e.target.value });
                          }
                        }}
                        className="h-8"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs font-ui">Stroke Color</Label>
                      <Input
                        type="color"
                        value={selectedLayerData.strokeColor || '#ffffff'}
                        onChange={(e) => {
                          if (selectedLayer) {
                            updateLayer(selectedLayer, { strokeColor: e.target.value });
                          }
                        }}
                        className="h-8"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant={selectedLayerData.fontWeight === 'bold' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        if (selectedLayer) {
                          updateLayer(selectedLayer, { 
                            fontWeight: selectedLayerData.fontWeight === 'bold' ? 'normal' : 'bold' 
                          });
                        }
                      }}
                      className="flex-1 text-xs"
                    >
                      <Bold className="w-3 h-3" />
                    </Button>
                    
                    <Button
                      variant={selectedLayerData.fontStyle === 'italic' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        if (selectedLayer) {
                          updateLayer(selectedLayer, { 
                            fontStyle: selectedLayerData.fontStyle === 'italic' ? 'normal' : 'italic' 
                          });
                        }
                      }}
                      className="flex-1 text-xs"
                    >
                      <Italic className="w-3 h-3" />
                    </Button>
                    
                    <Button
                      variant={selectedLayerData.textShadow ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        if (selectedLayer) {
                          updateLayer(selectedLayer, { 
                            textShadow: toggleShadow(selectedLayerData.textShadow || '')
                          });
                        }
                      }}
                      className="flex-1 text-xs"
                    >
                      Shadow
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // FIXED: Use functional form to prevent race condition
                        setLayers(prevLayers => prevLayers.filter(l => l.id !== selectedLayer));
                        setSelectedLayer(null);
                      }}
                      className="text-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-ui">X Position</Label>
                      <Input
                        type="range"
                        min="0"
                        max="100"
                        value={selectedLayerData.x}
                        onChange={(e) => {
                          if (selectedLayer) {
                            updateLayer(selectedLayer, { x: parseInt(e.target.value) });
                          }
                        }}
                        className="h-6"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-ui">Y Position</Label>
                      <Input
                        type="range"
                        min="0"
                        max="100"
                        value={selectedLayerData.y}
                        onChange={(e) => {
                          if (selectedLayer) {
                            updateLayer(selectedLayer, { y: parseInt(e.target.value) });
                          }
                        }}
                        className="h-6"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-ui">Scale</Label>
                      <Input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={Math.abs(selectedLayerData.scale)}
                        onChange={(e) => {
                          if (selectedLayer) {
                            const newScale = parseFloat(e.target.value);
                            updateLayer(selectedLayer, { 
                              scale: selectedLayerData.scale < 0 ? -newScale : newScale
                            });
                          }
                        }}
                        className="h-6"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-ui">Rotation</Label>
                      <Input
                        type="range"
                        min="0"
                        max="359"
                        value={selectedLayerData.rotation}
                        onChange={(e) => {
                          if (selectedLayer) {
                            updateLayer(selectedLayer, { rotation: parseInt(e.target.value) });
                          }
                        }}
                        className="h-6"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Image editing panel
              <>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-ui">
                    Layer: {selectedLayerData.type}
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    Z: {selectedLayerData.zIndex}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-ui"
                      onClick={() => {
                        if (selectedLayer) {
                          updateLayer(selectedLayer, { 
                            rotation: (selectedLayerData.rotation + 90) % 360 
                          });
                        }
                      }}
                    >
                      <RotateCw className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline" 
                      size="sm"
                      className="text-xs font-ui"
                      onClick={() => {
                        if (selectedLayer) {
                          updateLayer(selectedLayer, { 
                            scale: -selectedLayerData.scale // Proper horizontal flip
                          });
                        }
                      }}
                    >
                      <FlipHorizontal className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-ui"
                      onClick={() => {
                        // FIXED: Use functional form to prevent race condition
                        setLayers(prevLayers => prevLayers.filter(l => l.id !== selectedLayer));
                        setSelectedLayer(null);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-ui">X Position</Label>
                      <Input
                        type="range"
                        min="0"
                        max="100"
                        value={selectedLayerData.x}
                        onChange={(e) => {
                          if (selectedLayer) {
                            updateLayer(selectedLayer, { x: parseInt(e.target.value) });
                          }
                        }}
                        className="h-6"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-ui">Y Position</Label>
                      <Input
                        type="range"
                        min="0"
                        max="100"
                        value={selectedLayerData.y}
                        onChange={(e) => {
                          if (selectedLayer) {
                            updateLayer(selectedLayer, { y: parseInt(e.target.value) });
                          }
                        }}
                        className="h-6"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-ui">Scale</Label>
                      <Input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={Math.abs(selectedLayerData.scale)}
                        onChange={(e) => {
                          if (selectedLayer) {
                            const newScale = parseFloat(e.target.value);
                            updateLayer(selectedLayer, { 
                              scale: selectedLayerData.scale < 0 ? -newScale : newScale
                            });
                          }
                        }}
                        className="h-6"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-ui">Rotation</Label>
                      <Input
                        type="range"
                        min="0"
                        max="359"
                        value={selectedLayerData.rotation}
                        onChange={(e) => {
                          if (selectedLayer) {
                            updateLayer(selectedLayer, { rotation: parseInt(e.target.value) });
                          }
                        }}
                        className="h-6"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>
        )}

        {/* Layers Panel */}
        <Card className="p-6 mb-6 glass-effect border-3 border-white/40 hover-lift">
          <Label className="text-base font-popcat mb-4 block gradient-text flex items-center gap-2">
            🎨 Backgrounds
          </Label>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {BACKGROUNDS.map(bg => (
              <Button
                key={bg.key}
                variant="outline"
                className="text-xs font-ui px-3 py-3 h-auto min-h-[2.5rem] text-center rounded-xl hover:scale-105"
                onClick={() => {
                  console.log('🎯 Background clicked:', { key: bg.key, name: bg.name, url: bg.url });
                  updateLayer('bg', { content: bg.key });
                  console.log('📝 Background layer updated with content:', bg.key);
                }}
              >
                <span className="truncate">{bg.name}</span>
              </Button>
            ))}
          </div>

          <Label className="text-base font-popcat mb-4 block gradient-text flex items-center gap-2">
            🐱 Cat Poses
          </Label>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {BODIES.map(body => (
              <Button
                key={body.key}
                variant="outline"
                className="text-xs font-ui px-3 py-3 h-auto min-h-[2.5rem] text-center rounded-xl hover:scale-105"
                onClick={() => addLayer('body', body.key)}
              >
                <span className="truncate">{body.name}</span>
              </Button>
            ))}
          </div>

          <Label className="text-base font-popcat mb-4 block gradient-text flex items-center gap-2">
            😮 Faces
          </Label>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {HEADS.map(head => (
              <Button
                key={head.key}
                variant="outline"
                className="text-xs font-ui px-3 py-3 h-auto min-h-[2.5rem] text-center rounded-xl hover:scale-105"
                onClick={() => addLayer('head', head.key)}
              >
                <span className="truncate">{head.name}</span>
              </Button>
            ))}
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex gap-3">
              <Label htmlFor="head-upload" className="flex-1">
                <Button 
                  variant="secondary" 
                  className="text-sm font-ui w-full h-12 rounded-xl hover:scale-105" 
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </span>
                </Button>
                <input
                  id="head-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </Label>
            </div>
          </div>

          <Label className="text-base font-popcat mb-4 block gradient-text flex items-center gap-2">
            ✨ Pop Extras
          </Label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {PROPS.map(prop => (
              <Button
                key={prop.key}
                variant="outline"
                className="text-xs font-ui px-3 py-3 h-auto min-h-[2.5rem] text-center rounded-xl hover:scale-105"
                onClick={() => addLayer('prop', prop.key)}
              >
                <span className="truncate">{prop.name}</span>
              </Button>
            ))}
          </div>
        </Card>

        {/* Text Controls */}
        <Card className="p-6 mb-6 glass-effect border-3 border-white/40 hover-lift">
          <Label className="text-base font-popcat mb-4 block gradient-text flex items-center gap-2">
            💬 Add Text
          </Label>
          <div className="space-y-3">
            <Input
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Make it legendary..."
              className="font-ui"
            />
            <div className="flex items-center gap-2">
              <Button
                variant={allCaps ? "default" : "outline"}
                className={`text-xs font-ui ${
                  allCaps ? 'bg-accent text-accent-foreground' : ''
                }`}
                onClick={() => setAllCaps(!allCaps)}
              >
                ALL CAPS
              </Button>
              <Button
                onClick={addTextLayer}
                disabled={!textContent.trim()}
                className="text-xs font-ui bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Text
              </Button>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={saveMeme}
            disabled={isExporting}
            className="w-full h-12 font-ui bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {isExporting ? 'Saving your masterpiece...' : '💾 Save to Gallery'}
          </Button>
          
          <Button
            onClick={downloadMeme}
            disabled={isExporting}
            variant="secondary"
            className="w-full h-12 font-ui bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Generating PNG...' : '⬇️ Download PNG'}
          </Button>
        </div>

        {/* Watermark Notice */}
        <div className="mt-4 text-center">
          <Badge variant="outline" className="text-xs font-ui">
            🐱 "Made with POPCAT Memer" watermark included
          </Badge>
        </div>

        {/* Mobile save dialog */}
        <Dialog
          open={mobilePreviewOpen}
          onOpenChange={(open) => {
            setMobilePreviewOpen(open);
            if (!open && mobilePreviewUrl) {
              try { URL.revokeObjectURL(mobilePreviewUrl); } catch {}
              setMobilePreviewUrl(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-ui">Save to Your Device 📱</DialogTitle>
              <DialogDescription className="font-ui">
                Long-press the image to save to gallery, or tap "Download" below.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg overflow-hidden border border-border">
              {mobilePreviewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mobilePreviewUrl} alt="Your POPCAT meme ready to download" className="w-full h-auto" />
              )}
            </div>
            <DialogFooter>
              {mobilePreviewUrl && (
                <a
                  href={mobilePreviewUrl}
                  download={`popcat-meme-${Date.now()}.png`}
                  className="inline-flex items-center justify-center rounded-md bg-accent text-accent-foreground px-4 py-2 font-ui"
                >
                  Download Now 📥
                </a>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MemeEditor;