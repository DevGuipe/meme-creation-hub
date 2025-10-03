// Performance utilities and optimizations

import { useCallback, useMemo, useRef } from 'react';

// Debounce hook for performance optimization
export const useDebounce = <T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: Parameters<T>) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]) as T;
};

// Memoized asset URL resolver
export const useAssetUrlResolver = () => {
  return useMemo(() => {
    const cache = new Map<string, string>();
    
    return (type: string, content: string, assets: Record<string, Record<string, string>>): string => {
      const key = `${type}-${content}`;
      if (cache.has(key)) {
        return cache.get(key)!;
      }
      
      let url = '';
      switch (type) {
        case 'background':
          url = assets.backgrounds[content] || assets.backgrounds.neutral;
          break;
        case 'body':
          url = assets.bodies[content] || assets.bodies.classic;
          break;
        case 'head':
          url = assets.heads[content] || content; // Allow custom uploads
          break;
        case 'prop':
          url = assets.props[content] || assets.props.glasses;
          break;
      }
      
      cache.set(key, url);
      return url;
    };
  }, []);
};

// Image preloader utility
export const preloadImages = (urls: string[]): Promise<void[]> => {
  return Promise.all(
    urls.map(url => 
      new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      })
    )
  );
};

// Memory management for canvas operations
export const createImageCache = (maxSize: number = 50) => {
  const cache = new Map<string, HTMLImageElement>();
  
  return {
    get: (key: string) => cache.get(key),
    set: (key: string, image: HTMLImageElement) => {
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(key, image);
    },
    has: (key: string) => cache.has(key),
    clear: () => cache.clear(),
    size: () => cache.size
  };
};