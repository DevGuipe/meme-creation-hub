import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Telegram ID validation (must match frontend)
export const telegramIdSchema = z.number()
  .int()
  .positive()
  .min(1)
  .max(9999999999);

// Template key validation
export const templateKeySchema = z.string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Template key contains invalid characters');

// Layer validation (matches frontend schema)
export const layerSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['background', 'body', 'head', 'prop', 'text']),
  content: z.string().max(10000),
  x: z.number().min(-1000).max(1000),
  y: z.number().min(-1000).max(1000),
  scale: z.number().min(0.1).max(10),
  rotation: z.number().min(-360).max(360),
  zIndex: z.number().int().min(0).max(100),
  // Text-specific properties (optional)
  fontSize: z.number().min(8).max(200).optional(),
  fontFamily: z.string().max(100).optional(),
  fontWeight: z.string().max(50).optional(),
  fontStyle: z.string().max(50).optional(),
  textColor: z.string().max(50).optional(),
  strokeColor: z.string().max(50).optional(),
  strokeWidth: z.number().min(0).max(50).optional(),
  textAlign: z.string().max(20).optional(),
  textShadow: z.string().max(500).optional(),
});

// Layers array validation
export const layersPayloadSchema = z.array(layerSchema)
  .min(1, 'At least one layer is required')
  .max(50, 'Too many layers (maximum 50)');

// Data URL validation (for images)
export const dataUrlSchema = z.string()
  .regex(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/, 'Invalid image format')
  .max(10_000_000, 'Image too large (maximum 10MB in base64)');

// Save meme request validation
export const saveMemeRequestSchema = z.object({
  telegramUserId: telegramIdSchema,
  templateKey: templateKeySchema,
  layersPayload: z.union([
    layersPayloadSchema,
    z.string().transform((str, ctx) => {
      try {
        const parsed = JSON.parse(str);
        return layersPayloadSchema.parse(parsed);
      } catch (e) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid layers payload JSON',
        });
        return z.NEVER;
      }
    })
  ]),
  image: dataUrlSchema.optional(),
  idempotencyKey: z.string().min(1).max(100).optional(), // Dedup key
});

// Upload meme image request validation
export const uploadMemeImageRequestSchema = z.object({
  memeId: z.string().uuid('Invalid meme ID format'),
  id_short: z.string().regex(/^\d{4,6}$/, 'Invalid short ID format'),
  image: dataUrlSchema,
});

// Finalize preview request validation
export const finalizeMemePreviewRequestSchema = z.object({
  memeId: z.string().uuid('Invalid meme ID format'),
  id_short: z.string().regex(/^\d{4,6}$/, 'Invalid short ID format').optional(),
});

// Generate image request validation
export const generateMemeImageRequestSchema = z.object({
  memeId: z.string().uuid('Invalid meme ID format'),
});

// Helper function to validate and parse request body
export async function validateRequest<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T } | { error: string; details?: string[] }> {
  try {
    const body = await req.json();
    const validated = schema.parse(body);
    return { data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return { 
        error: 'Validation failed', 
        details: messages 
      };
    }
    if (error instanceof SyntaxError) {
      return { error: 'Invalid JSON format' };
    }
    return { error: 'Invalid request format' };
  }
}
