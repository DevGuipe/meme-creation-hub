// Improved background removal using border flood fill (no WASM, no external APIs)
// Strategy:
// 1) Downscale if needed (<=1024px)
// 2) Estimate background color from multiple border samples
// 3) Run flood fill from all border pixels, marking as background only when within a color distance threshold
// 4) Set alpha=0 for marked background pixels, alpha=255 for others (crisp cut, no gradient)

const MAX_IMAGE_DIMENSION = 1024;

function resizeImageIfNeeded(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);
}

function colorDistanceSq(a0: number, a1: number, a2: number, b0: number, b1: number, b2: number) {
  // Weighted RGB distance (slightly favor G which human vision is more sensitive to)
  const dr = a0 - b0;
  const dg = a1 - b1;
  const db = a2 - b2;
  return (dr * dr) * 0.9 + (dg * dg) * 1.2 + (db * db) * 0.9;
}

function sampleBorderAverage(imgData: ImageData, w: number, h: number) {
  const d = imgData.data;
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  const stepX = Math.max(1, Math.floor(w / 100));
  const stepY = Math.max(1, Math.floor(h / 100));

  // Top and bottom rows
  for (let x = 0; x < w; x += stepX) {
    let iTop = (0 * w + x) * 4;
    rSum += d[iTop]; gSum += d[iTop + 1]; bSum += d[iTop + 2]; count++;

    let iBot = ((h - 1) * w + x) * 4;
    rSum += d[iBot]; gSum += d[iBot + 1]; bSum += d[iBot + 2]; count++;
  }

  // Left and right columns
  for (let y = 0; y < h; y += stepY) {
    let iLeft = (y * w + 0) * 4;
    rSum += d[iLeft]; gSum += d[iLeft + 1]; bSum += d[iLeft + 2]; count++;

    let iRight = (y * w + (w - 1)) * 4;
    rSum += d[iRight]; gSum += d[iRight + 1]; bSum += d[iRight + 2]; count++;
  }

  return [Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count)] as [number, number, number];
}

export const removeBackground = async (
  imageElement: HTMLImageElement,
  opts?: { threshold?: number }
): Promise<string> => {
  // Threshold defaults tuned for typical flat backgrounds; increase if background is more varied
  const threshold = opts?.threshold ?? 42; // in linear RGB distance units (we compare squared distance)
  const threshSq = threshold * threshold;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  resizeImageIfNeeded(canvas, ctx, imageElement);
  const { width: w, height: h } = canvas;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const [br, bg, bb] = sampleBorderAverage(imgData, w, h);

  // Flood fill from all borders
  const visited = new Uint8Array(w * h); // 0=unvisited, 1=queued/visited background, 2=foreground
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);
  let qs = 0, qe = 0;

  const enqueue = (x: number, y: number) => {
    const idx = y * w + x;
    if (visited[idx] !== 0) return;
    const i = idx * 4;
    const distSq = colorDistanceSq(data[i], data[i + 1], data[i + 2], br, bg, bb);
    if (distSq <= threshSq) {
      visited[idx] = 1;
      qx[qe] = x; qy[qe] = y; qe++;
    } else {
      visited[idx] = 2; // mark as foreground-ish to avoid enqueuing it later
    }
  };

  // Seed queue with all border pixels
  for (let x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
  for (let y = 0; y < h; y++) { enqueue(0, y); enqueue(w - 1, y); }

  // BFS (4-connected)
  while (qs < qe) {
    const cx = qx[qs];
    const cy = qy[qs];
    qs++;

    const neighbors = (
      cx > 0 ? [[cx - 1, cy]] : []
    ).concat(
      cx < w - 1 ? [[cx + 1, cy]] : []
    ).concat(
      cy > 0 ? [[cx, cy - 1]] : []
    ).concat(
      cy < h - 1 ? [[cx, cy + 1]] : []
    );

    for (const [nx, ny] of neighbors) {
      const nIdx = ny * w + nx;
      if (visited[nIdx] !== 0) continue;
      const i = nIdx * 4;
      const distSq = colorDistanceSq(data[i], data[i + 1], data[i + 2], br, bg, bb);
      if (distSq <= threshSq) {
        visited[nIdx] = 1;
        qx[qe] = nx; qy[qe] = ny; qe++;
      } else {
        visited[nIdx] = 2; // foreground-ish
      }
    }
  }

  // Compose final alpha: background -> 0, others -> 255
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const aIndex = idx * 4 + 3;
      if (visited[idx] === 1) {
        data[aIndex] = 0;
      } else {
        data[aIndex] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png', 1.0);
};

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};
