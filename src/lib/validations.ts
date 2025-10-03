import { z } from 'zod';
import { VALIDATION_LIMITS, TELEGRAM_ID_RANGE } from '@/lib/constants';

// Validation schemas for security
export const telegramUserSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().optional().refine(
    (val) => !val || (val.length >= VALIDATION_LIMITS.USERNAME_MIN_LENGTH && val.length <= VALIDATION_LIMITS.USERNAME_MAX_LENGTH),
    `Username must be ${VALIDATION_LIMITS.USERNAME_MIN_LENGTH}-${VALIDATION_LIMITS.USERNAME_MAX_LENGTH} characters`
  ),
  first_name: z.string().min(1).max(VALIDATION_LIMITS.FIRST_NAME_MAX_LENGTH, `First name must be 1-${VALIDATION_LIMITS.FIRST_NAME_MAX_LENGTH} characters`)
});

export const memeLayerSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['background', 'body', 'head', 'prop', 'text']),
  content: z.string().max(10000), // Limit to match backend
  x: z.number().finite().min(-1000).max(1000),
  y: z.number().finite().min(-1000).max(1000),
  scale: z.number().finite().min(0.1).max(10),
  rotation: z.number().finite().min(-360).max(360),
  zIndex: z.number().int().min(0).max(100),
  // Text-specific optional fields
  fontSize: z.number().finite().min(8).max(200).optional(),
  fontFamily: z.string().max(100).optional(),
  fontWeight: z.string().max(50).optional(),
  fontStyle: z.string().max(50).optional(),
  textColor: z.string().max(50).optional(),
  strokeColor: z.string().max(50).optional(),
  strokeWidth: z.number().finite().min(0).max(50).optional(),
  textAlign: z.string().max(20).optional(),
  textShadow: z.string().max(500).optional(),
}).strict(); // Reject unknown fields to catch bugs early

export const memeTextSchema = z.object({
  content: z.string()
    .min(1, 'Text cannot be empty')
    .max(VALIDATION_LIMITS.TEXT_MAX_LENGTH, `Text must be less than ${VALIDATION_LIMITS.TEXT_MAX_LENGTH} characters`)
    .refine(
      (val) => !/[<>'"&]/.test(val),
      'Text contains invalid characters'
    )
});

export const memeIdSchema = z.string()
  .regex(new RegExp(`^\\d{${VALIDATION_LIMITS.MEME_ID_MIN_LENGTH},${VALIDATION_LIMITS.MEME_ID_MAX_LENGTH}}$`), 'Invalid meme ID format');

// Sanitize user input
export const sanitizeText = (text: string): string => {
  const sanitized = text
    .replace(/[<>'"&]/g, '') // Remove HTML-breaking characters
    .trim()
    .slice(0, VALIDATION_LIMITS.TEXT_MAX_LENGTH); // Enforce max length
  
  // CRITICAL FIX: Throw error instead of silent fallback to prevent unexpected behavior
  // If user enters only invalid characters like "<>&'", they should get an error,
  // NOT have their text silently replaced with "User"
  if (sanitized.length === 0) {
    throw new Error('Text contains only invalid characters');
  }
  
  return sanitized;
};

// Validate telegram ID
export const validateTelegramId = (id: number): boolean => {
  return Number.isInteger(id) && id >= TELEGRAM_ID_RANGE.MIN && id < TELEGRAM_ID_RANGE.MAX; // Valid Telegram ID range
};

// Sanitize layer for serialization - normalize numbers, clamp ranges, and set safe defaults
export const sanitizeLayer = (layer: any): any => {
  const defaults = {
    x: 50,
    y: 50,
    scale: 1,
    rotation: 0,
    zIndex: 0,
    fontSize: 24,
    strokeWidth: 0,
  } as const;

  const clamps: Record<string, { min: number; max: number }> = {
    x: { min: -1000, max: 1000 },
    y: { min: -1000, max: 1000 },
    scale: { min: 0.1, max: 10 },
    rotation: { min: -360, max: 360 },
    zIndex: { min: 0, max: 100 },
    fontSize: { min: 8, max: 200 },
    strokeWidth: { min: 0, max: 50 },
  };

  const sanitized: any = {};
  for (const key in layer) {
    const val = layer[key];
    if (val === undefined) continue;

    if (typeof val === 'number') {
      let num = Number(val);
      if (!Number.isFinite(num)) {
        if (key in defaults) {
          sanitized[key] = (defaults as any)[key];
        }
        continue;
      }
      const range = clamps[key];
      if (range) {
        if (num < range.min) num = range.min;
        if (num > range.max) num = range.max;
      }
      sanitized[key] = num;
      continue;
    }

    sanitized[key] = val;
  }

  // Ensure required numeric fields exist
  for (const req of ['x', 'y', 'scale', 'rotation', 'zIndex']) {
    if (!(req in sanitized)) {
      sanitized[req] = (defaults as any)[req];
    }
  }

  return sanitized;
};