import { useEffect, useRef, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricImage, FabricText, Shadow, Line } from 'fabric';
import { assets } from '@/assets';
import { logger } from '@/lib/logger';
import { CANVAS_CONFIG } from '@/lib/constants';
import type { Layer } from '@/types';

// Extended Fabric object types for better TypeScript support
interface FabricObjectWithLayerData {
  layerId?: string;
  layerType?: Layer['type'];
  content?: string;
  textProps?: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    textColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    textAlign?: string;
    textShadow?: string;
  };
  excludeFromExport?: boolean;
  left?: number;
  top?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  set?: (props: Record<string, unknown>) => void;
}

interface SelectionEvent {
  selected?: FabricObjectWithLayerData[];
}


export const useMemeCanvas = (layers: Layer[], canvasSize: number = 400, onLayerUpdate?: (layers: Layer[]) => void, onSelect?: (layerId: string | null) => void) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  
  // CRITICAL FIX: LRU cache with memory management
  const imageCache = useRef<Map<string, { 
    img: HTMLImageElement; 
    lastUsed: number; 
    size: number; 
  }>>(new Map());
  
  const isUpdatingFromFabric = useRef(false);
  const baseScales = useRef<Map<string, number>>(new Map());
  
  // CRITICAL FIX: Render lock for proper concurrency control
  const renderLock = useRef<Promise<void> | null>(null);
  
  // CRITICAL FIX: Centralized timeout management
  const timeouts = useRef<Set<NodeJS.Timeout>>(new Set());

  // CRITICAL FIX: Helper functions for cache management
  const addTimeout = useCallback((timeout: NodeJS.Timeout): NodeJS.Timeout => {
    timeouts.current.add(timeout);
    return timeout;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    for (const timeout of timeouts.current) {
      clearTimeout(timeout);
    }
    timeouts.current.clear();
  }, []);

  // CRITICAL FIX: LRU cache with memory and size limits
  const MAX_CACHE_SIZE = 20; // Reduced from 50 for better memory control
  const MAX_CACHE_MEMORY = 50 * 1024 * 1024; // 50MB limit

  const getTotalCacheMemory = useCallback((): number => {
    let total = 0;
    for (const entry of imageCache.current.values()) {
      total += entry.size;
    }
    return total;
  }, []);

  const removeLRUItem = useCallback(() => {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of imageCache.current.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      imageCache.current.delete(oldestKey);
    }
  }, []);

  const addToCache = useCallback((src: string, img: HTMLImageElement) => {
    const estimatedSize = img.naturalWidth * img.naturalHeight * 4; // RGBA bytes
    const now = Date.now();
    
    // Remove old items if needed (memory or count limit)
    while (imageCache.current.size >= MAX_CACHE_SIZE || 
           getTotalCacheMemory() + estimatedSize > MAX_CACHE_MEMORY) {
      removeLRUItem();
    }
    
    imageCache.current.set(src, { 
      img, 
      lastUsed: now, 
      size: estimatedSize 
    });
  }, [getTotalCacheMemory, removeLRUItem]);

  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const cached = imageCache.current.get(src);
      if (cached) {
        // Update last used time for LRU
        cached.lastUsed = Date.now();
        resolve(cached.img);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        addToCache(src, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }, [addToCache]);

  // Compute visible bounds (trim transparent margins) of an image
  const computeAlphaBounds = useCallback((imgEl: HTMLImageElement, threshold: number = 24, bottomThreshold: number = 180) => {
    const w = imgEl.naturalWidth;
    const h = imgEl.naturalHeight;
    if (!w || !h) return null;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(imgEl, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    let maxYStrong = -1; // bottom using stronger threshold to kill soft halos
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = data[(y * w + x) * 4 + 3];
        // General bounds (any reasonably visible pixel)
        if (alpha >= threshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
        // Strong bottom detection to avoid residual transparent padding
        if (alpha >= bottomThreshold) {
          if (y > maxYStrong) maxYStrong = y;
        }
      }
    }
    if (maxX < 0 || maxY < 0) return null;
    const bottom = Math.max(maxY, maxYStrong);
    return { cropX: minX, cropY: minY, width: maxX - minX + 1, height: bottom - minY + 1 };
  }, []);

  const getAssetUrl = useCallback((type: Layer['type'], content: string): string => {
    if (!content) return '';
    
    let assetUrl = '';
    switch (type) {
      case 'background':
        assetUrl = assets.backgrounds[content as keyof typeof assets.backgrounds] || assets.backgrounds.meme;
        console.log('🖼️ Background asset lookup:', { content, assetUrl, available: Object.keys(assets.backgrounds) });
        break;
      case 'body':
        assetUrl = assets.bodies[content as keyof typeof assets.bodies] || content;
        break;
      case 'head':
        assetUrl = assets.heads[content as keyof typeof assets.heads] || content;
        break;
      case 'prop':
        assetUrl = assets.props[content as keyof typeof assets.props] || content;
        break;
      default:
        assetUrl = content;
    }
    
    console.log('🔍 Asset URL resolution:', { type, content, assetUrl });
    return assetUrl;
  }, []);

  const syncFabricToLayers = useCallback(() => {
    if (!fabricCanvasRef.current || !onLayerUpdate || isUpdatingFromFabric.current) return;
    
    isUpdatingFromFabric.current = true;
    
    const fabricObjects = fabricCanvasRef.current.getObjects();
    const updatedLayers: Layer[] = [];
    
    let z = 0;
    fabricObjects.forEach((obj) => {
      // Skip helper/guide objects
      const fabricObj = obj as FabricObjectWithLayerData;
      if (fabricObj.excludeFromExport === true) return;
      const layerId = fabricObj.layerId;
      const layerType = fabricObj.layerType;
      const content = fabricObj.content || '';
      if (!layerId || !layerType) return;
      const baseScale = baseScales.current.get(layerId) || 1;
      
      // Convert Fabric coordinates back to percentage
      const x = ((obj.left || 0) / canvasSize) * 100;
      const y = ((obj.top || 0) / canvasSize) * 100;
      
      // Calculate user scale relative to base scale
      const userScale = (obj.scaleX || 1) / baseScale;
      
      const baseLayer: Layer = {
        id: layerId,
        type: layerType,
        content,
        x,
        y,
        scale: userScale,
        rotation: obj.angle || 0,
        zIndex: z++
      };

      // Add text-specific properties if it's a text layer
      if (layerType === 'text' && obj instanceof FabricText) {
        baseLayer.fontSize = obj.fontSize;
        baseLayer.fontFamily = obj.fontFamily;
        baseLayer.fontWeight = obj.fontWeight as string;
        baseLayer.fontStyle = obj.fontStyle as string;
        baseLayer.textColor = obj.fill as string;
        baseLayer.strokeColor = obj.stroke as string;
        baseLayer.strokeWidth = obj.strokeWidth;
        baseLayer.textAlign = obj.textAlign as string;
        
        // FIXED: Preserve complete shadow configuration instead of just boolean
        const shadow = obj.shadow as Shadow | null;
        baseLayer.textShadow = shadow ? JSON.stringify({
          enabled: true,
          color: shadow.color || 'rgba(0,0,0,0.5)',
          blur: shadow.blur || 5,
          offsetX: shadow.offsetX || 2,
          offsetY: shadow.offsetY || 2
        }) : '';
      }
      
      updatedLayers.push(baseLayer);
    });

    onLayerUpdate(updatedLayers);
    
    setTimeout(() => {
      isUpdatingFromFabric.current = false;
    }, 100);
  }, [canvasSize, onLayerUpdate]);

  // FIXED: Use persistent ref for timeout cleanup
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const initFabricCanvas = useCallback(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;
    
    const fabricCanvas = new FabricCanvas(canvasRef.current, {
      width: canvasSize,
      height: canvasSize,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });
    
    fabricCanvas.on('object:modified', () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        timeouts.current.delete(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = addTimeout(setTimeout(syncFabricToLayers, 150));
    });

    // Selection events to notify editor about current selection
    fabricCanvas.on('selection:created', (e: SelectionEvent) => {
      const obj = e?.selected?.[0];
      const layerId = obj ? obj.layerId : null;
      onSelect?.(layerId || null);
    });
    fabricCanvas.on('selection:updated', (e: SelectionEvent) => {
      const obj = e?.selected?.[0];
      const layerId = obj ? obj.layerId : null;
      onSelect?.(layerId || null);
    });
    fabricCanvas.on('selection:cleared', () => {
      onSelect?.(null);
    });
    
    // Prevent browser zoom but allow fabric interaction
    const canvas = canvasRef.current;
    
    // More refined touch handling
    const handleTouchStart = (e: TouchEvent) => {
      // Only prevent zoom on multi-touch
      if (e.touches.length > 1) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    const handleWheel = (e: WheelEvent) => {
      // Prevent zoom on ctrl+wheel
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    // CSS to prevent zoom while allowing interaction
    canvas.style.touchAction = 'pan-x pan-y';
    canvas.style.userSelect = 'none';
    canvas.style.webkitUserSelect = 'none';
    
    fabricCanvasRef.current = fabricCanvas;
    
    return () => {
      // CRITICAL FIX: Complete cleanup of all resources
      clearAllTimeouts();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('wheel', handleWheel);
      fabricCanvas.dispose();
      fabricCanvasRef.current = null;
      renderLock.current = null;
    };
  }, [canvasSize, syncFabricToLayers, onSelect, clearAllTimeouts, addTimeout]);

  const renderCanvas = useCallback(async () => {
    if (!fabricCanvasRef.current || isUpdatingFromFabric.current) return;
    
    // CRITICAL FIX: Wait for any existing render to complete
    if (renderLock.current) {
      try {
        await renderLock.current;
      } catch (e) {
        // Previous render failed, continue with new one
        logger.warn('Previous render failed, continuing with new render', e);
      }
    }
    
    // CRITICAL FIX: Create new render promise with proper error handling
    renderLock.current = (async () => {
      try {
        // Get current fabric objects and their transforms to preserve them
        const currentObjects = fabricCanvasRef.current!.getObjects();
        const currentTransforms = new Map();
        
        currentObjects.forEach(obj => {
          const fabricObj = obj as FabricObjectWithLayerData;
          const layerId = fabricObj.layerId;
          const layerType = fabricObj.layerType;
          const content = fabricObj.content;
          
          if (layerId) {
            currentTransforms.set(layerId, {
              left: obj.left,
              top: obj.top,
              scaleX: obj.scaleX,
              scaleY: obj.scaleY,
              angle: obj.angle
            });
          }
          
          // Fallback by content signature for when IDs change
          if (layerType && content) {
            const contentKey = `${layerType}:${content}`;
            if (!currentTransforms.has(contentKey)) {
              currentTransforms.set(contentKey, {
                left: obj.left,
                top: obj.top,
                scaleX: obj.scaleX,
                scaleY: obj.scaleY,
                angle: obj.angle
              });
            }
          }
        });
        
        // Clear existing objects
        fabricCanvasRef.current!.clear();
        fabricCanvasRef.current!.backgroundColor = '#ffffff';
        baseScales.current.clear();
        
        // Sort layers by zIndex
        const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
        
        for (const layer of sortedLayers) {
          try {
            if (layer.type === 'text') {
              // FIXED: Parse shadow configuration to preserve all properties
              let shadowConfig: { enabled: boolean; color: string; blur: number; offsetX: number; offsetY: number } | null = null;
              if (layer.textShadow) {
                try {
                  shadowConfig = JSON.parse(layer.textShadow);
                } catch {
                  // Fallback for old format (simple 'shadow' string)
                  shadowConfig = { enabled: true, color: 'rgba(0,0,0,0.5)', blur: 5, offsetX: 2, offsetY: 2 };
                }
              }
              
              // Create text object
              const text = new FabricText(layer.content, {
                left: (layer.x / 100) * canvasSize,
                top: (layer.y / 100) * canvasSize,
                fontSize: layer.fontSize || 24,
                fontWeight: layer.fontWeight || 'bold',
                fontStyle: layer.fontStyle || 'normal',
                fontFamily: layer.fontFamily || 'Arial, sans-serif',
                fill: layer.textColor || '#000000',
                stroke: layer.strokeColor || '#ffffff',
                strokeWidth: layer.strokeWidth || 2,
                textAlign: (layer.textAlign as 'left' | 'center' | 'right' | 'justify') || 'center',
                originX: 'center',
                originY: 'bottom',
                scaleX: layer.scale,
                scaleY: layer.scale,
                angle: layer.rotation,
                lockUniScaling: false,
                shadow: shadowConfig?.enabled ? new Shadow({
                  color: shadowConfig.color,
                  blur: shadowConfig.blur,
                  offsetX: shadowConfig.offsetX,
                  offsetY: shadowConfig.offsetY
                }) : null,
              });
              
              // Store custom data using proper typing
              const fabricText = text as FabricText & FabricObjectWithLayerData;
              fabricText.layerId = layer.id;
              fabricText.layerType = layer.type;
              fabricText.content = layer.content;
              
              // Store text properties for sync
              fabricText.textProps = {
                fontSize: layer.fontSize,
                fontFamily: layer.fontFamily,
                fontWeight: layer.fontWeight,
                fontStyle: layer.fontStyle,
                textColor: layer.textColor,
                strokeColor: layer.strokeColor,
                strokeWidth: layer.strokeWidth,
                textAlign: layer.textAlign,
                textShadow: layer.textShadow
              };
              
              // Apply current transforms if they exist (preserve user changes)
              const savedTransform = currentTransforms.get(layer.id) || 
                                     currentTransforms.get(`${layer.type}:${layer.content}`);
              if (savedTransform) {
                text.set(savedTransform);
              }
              
              baseScales.current.set(layer.id, 1);
              fabricCanvasRef.current!.add(text);
            } else {
              // Create image object
              const assetUrl = getAssetUrl(layer.type, layer.content);
              console.log('🎨 Rendering layer:', { id: layer.id, type: layer.type, content: layer.content, assetUrl });
              
              if (!assetUrl) {
                console.warn('❌ No asset URL for layer:', layer);
                continue;
              }
              
              // FIXED: Optimize by loading image once and reusing it
              const imgEl = await loadImage(assetUrl);
              console.log('✅ Image loaded successfully:', { assetUrl, width: imgEl.width, height: imgEl.height });
              const fabricImg = new FabricImage(imgEl, { crossOrigin: 'anonymous' });
              
              // Trim transparent padding for non-background assets to align visually
              if (layer.type !== 'background') {
                const bounds = computeAlphaBounds(imgEl);
                if (bounds) {
                  fabricImg.set({ cropX: bounds.cropX, cropY: bounds.cropY, width: bounds.width, height: bounds.height });
                }
              }
                // Set origin before positioning to ensure consistent anchoring
                fabricImg.set({
                  originX: 'center',
                  originY: layer.type === 'background' ? 'center' : 'bottom',
                  angle: layer.rotation
                });
                
                let baseScale = 1;
                
                if (layer.type === 'background') {
                // Background covers full canvas - scale to fit canvas
                const scaleX = canvasSize / fabricImg.width;
                const scaleY = canvasSize / fabricImg.height;
                baseScale = Math.max(scaleX, scaleY); // Cover entire canvas
                
                fabricImg.set({
                  left: canvasSize / 2,
                  top: canvasSize / 2,
                  scaleX: baseScale * layer.scale,
                  scaleY: baseScale * layer.scale,
                  selectable: false, // Background shouldn't be selectable
                  evented: false
                });
              } else {
                // Other elements - scale to reasonable size
                // Increased from 0.3 to 0.6 to make objects larger and better proportioned
                const maxSize = canvasSize * 0.6;
                baseScale = Math.min(maxSize / fabricImg.width, maxSize / fabricImg.height);
                
                fabricImg.set({
                  left: (layer.x / 100) * canvasSize,
                  top: (layer.y / 100) * canvasSize,
                  scaleX: baseScale * layer.scale,
                  scaleY: baseScale * layer.scale,
                  lockUniScaling: false,
                });
                
                // Apply current transforms if they exist (preserve user changes)
                const savedTransform = currentTransforms.get(layer.id) || 
                                       currentTransforms.get(`${layer.type}:${layer.content}`);
                if (savedTransform) {
                  fabricImg.set(savedTransform);
                }
              }
              
               // Angle may be updated from layer
               fabricImg.set({
                 angle: layer.rotation
               });
              
              // Store custom data and base scale using proper typing
              const fabricImage = fabricImg as FabricImage & FabricObjectWithLayerData;
              fabricImage.layerId = layer.id;
              fabricImage.layerType = layer.type;
              fabricImage.content = layer.content;
              
              baseScales.current.set(layer.id, baseScale);
              fabricCanvasRef.current!.add(fabricImg);
            }
          } catch (error) {
            logger.warn('Failed to add layer to canvas', { layer: layer.id, type: layer.type, error });
          }
        }
        
        // Add a bottom guide line aligned to the exact canvas edge (not exported)
        try {
          const guide = new Line([0, canvasSize - 1, canvasSize, canvasSize - 1], {
            stroke: '#00FF00',
            strokeWidth: 1,
            strokeDashArray: [6, 4],
            selectable: false,
            evented: false,
            opacity: 0.35,
          });
          const fabricGuide = guide as Line & FabricObjectWithLayerData;
          fabricGuide.excludeFromExport = true;
          fabricCanvasRef.current!.add(guide);
        } catch (e) {
          // ignore guide errors
        }
        
        fabricCanvasRef.current!.renderAll();
        
      } catch (error) {
        logger.error('Failed to render canvas', error);
      } finally {
        // CRITICAL FIX: Always clear render lock when done
        renderLock.current = null;
      }
    })();
    
    return renderLock.current;
  }, [layers, canvasSize, getAssetUrl, loadImage, computeAlphaBounds]);

  const exportCanvas = useCallback(async (): Promise<string | null> => {
    if (!fabricCanvasRef.current) return null;
    
    try {
      // Hide guides before export
      const objects = fabricCanvasRef.current.getObjects();
      const guidesToHide: any[] = [];
      
      objects.forEach(obj => {
        const fabricObj = obj as FabricObjectWithLayerData;
        if (fabricObj.excludeFromExport) {
          obj.set({ visible: false });
          guidesToHide.push(obj);
        }
      });
      
      fabricCanvasRef.current.renderAll();
      
      // Compressão agressiva para meme (prioridade: tamanho pequeno)
      const tryExport = (maxDim: number, quality: number, format: 'jpeg' | 'webp'): string => {
        // Calculate multiplier to respect maxDim
        const currentSize = canvasSize;
        const mult = Math.min(maxDim / currentSize, 2); // Never exceed maxDim
        
        const opts: any = { 
          format: format === 'jpeg' ? 'jpeg' : 'webp',
          quality,
          multiplier: mult
        };
        return fabricCanvasRef.current!.toDataURL(opts);
      };

      const presets = CANVAS_CONFIG.EXPORT_QUALITY_PRESETS;
      let dataURL: string | null = null;
      
      for (const preset of presets) {
        // Try WEBP first (melhor compressão)
        try {
          let candidate = tryExport(preset.maxDim, preset.quality, 'webp');
          const base64 = candidate.split(',')[1] || '';
          const sizeBytes = Math.floor(base64.length * 0.75);
          
          if (sizeBytes <= CANVAS_CONFIG.MAX_EXPORT_BYTES) {
            dataURL = candidate;
            logger.info(`✅ Export success: WEBP ${preset.maxDim}px @ ${Math.round(preset.quality * 100)}% = ${Math.round(sizeBytes / 1024)}KB`);
            break;
          }
        } catch (e) {
          logger.warn('WEBP export failed, trying JPEG', e);
        }
        
        // Fallback: JPEG
        try {
          let candidate = tryExport(preset.maxDim, preset.quality, 'jpeg');
          const base64 = candidate.split(',')[1] || '';
          const sizeBytes = Math.floor(base64.length * 0.75);
          
          if (sizeBytes <= CANVAS_CONFIG.MAX_EXPORT_BYTES) {
            dataURL = candidate;
            logger.info(`✅ Export success: JPEG ${preset.maxDim}px @ ${Math.round(preset.quality * 100)}% = ${Math.round(sizeBytes / 1024)}KB`);
            break;
          }
        } catch (e) {
          logger.warn('JPEG export failed', e);
        }
      }

      // Last resort: ultra-compressed JPEG 400px @ 50%
      if (!dataURL) {
        dataURL = tryExport(400, 0.5, 'jpeg');
        logger.warn('⚠️ Using ultra-compressed fallback (400px JPEG @ 50%)');
      }
      
      // Restore guide visibility
      guidesToHide.forEach(obj => { obj.set({ visible: true }); });
      fabricCanvasRef.current.renderAll();
      
      return dataURL;
    } catch (error) {
      logger.error('Failed to export canvas', error);
      return null;
    }
  }, [canvasSize]);

  const setTextDraft = useCallback((layerId: string, text: string) => {
    if (!fabricCanvasRef.current) return false;
    const obj = fabricCanvasRef.current.getObjects().find(o => (o as FabricObjectWithLayerData).layerId === layerId);
    if (obj && obj instanceof FabricText) {
      obj.set({ text });
      fabricCanvasRef.current.requestRenderAll();
      return true;
    }
    return false;
  }, []);

  const debouncedSetTextDraft = useCallback((layerId: string, text: string) => {
    return setTextDraft(layerId, text);
  }, [setTextDraft]);

  useEffect(() => {
    const cleanup = initFabricCanvas();
    return cleanup;
  }, [initFabricCanvas]);

  // Use debounced rendering to avoid excessive re-renders
  useEffect(() => {
    const renderTimeout = addTimeout(setTimeout(renderCanvas, 100));
    return () => {
      clearTimeout(renderTimeout);
      timeouts.current.delete(renderTimeout);
    };
  }, [renderCanvas, layers, addTimeout]);

  // CRITICAL FIX: Cleanup all resources on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      imageCache.current.clear();
      renderLock.current = null;
    };
  }, [clearAllTimeouts]);

  return {
    canvasRef,
    exportCanvas,
    setTextDraft: debouncedSetTextDraft,
  };
};
