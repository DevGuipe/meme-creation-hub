// Simple, CSP-safe background removal using Canvas only (no WASM, no external APIs)
// Heuristic: sample background color from corners and remove similar pixels

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

function colorDistance(a: [number, number, number], b: [number, number, number]) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function sampleCorners(imgData: ImageData, w: number, h: number): [number, number, number][] {
  const p = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]] as [number, number, number];
  };
  const m = (a: [number, number, number], b: [number, number, number]) =>
    [Math.round((a[0] + b[0]) / 2), Math.round((a[1] + b[1]) / 2), Math.round((a[2] + b[2]) / 2)] as [number, number, number];

  const tl = p(0, 0);
  const tr = p(w - 1, 0);
  const bl = p(0, h - 1);
  const br = p(w - 1, h - 1);

  return [tl, tr, bl, br, m(tl, tr), m(bl, br), m(tl, bl), m(tr, br)];
}

export const removeBackground = async (
  imageElement: HTMLImageElement,
  opts?: { threshold?: number; softness?: number }
): Promise<string> => {
  const threshold = Math.max(10, Math.min(opts?.threshold ?? 45, 120));
  const softness = Math.max(0, Math.min(opts?.softness ?? 10, 60)); // pixels to feather

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  resizeImageIfNeeded(canvas, ctx, imageElement);
  const { width, height } = canvas;

  const imgData = ctx.getImageData(0, 0, width, height);
  const bgSamples = sampleCorners(imgData, width, height);

  // Averaged background color
  const bg: [number, number, number] = bgSamples.reduce(
    (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]] as [number, number, number],
    [0, 0, 0]
  ).map((v) => Math.round(v / bgSamples.length)) as [number, number, number];

  // First pass: set alpha for background-like pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = imgData.data[i];
      const g = imgData.data[i + 1];
      const b = imgData.data[i + 2];

      const d = colorDistance([r, g, b], bg);
      if (d < threshold) {
        // Feather alpha based on distance (softer edges)
        const alpha = Math.max(0, Math.min(255, Math.round((d / threshold) * 255)));
        imgData.data[i + 3] = alpha;
      }
    }
  }

  // Optional edge softening pass
  if (softness > 0) {
    const out = new ImageData(new Uint8ClampedArray(imgData.data), width, height);
    const rad = Math.max(1, Math.floor(softness / 3));
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4 + 3;
        // Simple box blur on alpha channel
        let sum = 0;
        let count = 0;
        for (let dy = -rad; dy <= rad; dy++) {
          for (let dx = -rad; dx <= rad; dx++) {
            const ai = ((y + dy) * width + (x + dx)) * 4 + 3;
            sum += imgData.data[ai];
            count++;
          }
        }
        out.data[i] = Math.round(sum / count);
      }
    }
    ctx.putImageData(out, 0, 0);
  } else {
    ctx.putImageData(imgData, 0, 0);
  }

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
