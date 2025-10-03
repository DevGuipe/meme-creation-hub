// Application constants

export const FILE_UPLOAD_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
} as const;

export const CANVAS_CONFIG = {
  DEFAULT_SIZE: 400,
  EXPORT_MULTIPLIER: 2,
  MAX_SIZE: 800,
  // Meme-optimized: small size, high compression
  MAX_EXPORT_DIMENSION: 600, // Max 600x600 for memes (suficiente para redes sociais)
  MAX_EXPORT_BYTES: 800_000, // 800KB max (muito menor, compressão agressiva)
  EXPORT_QUALITY_PRESETS: [
    { quality: 0.75, multiplier: 1.5, maxDim: 600 },  // Primeira tentativa
    { quality: 0.65, multiplier: 1.25, maxDim: 500 }, // Segunda tentativa
    { quality: 0.55, multiplier: 1.0, maxDim: 400 },  // Terceira tentativa (bem comprimido)
  ]
} as const;

export const VALIDATION_LIMITS = {
  TEXT_MAX_LENGTH: 280,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 32,
  FIRST_NAME_MAX_LENGTH: 64,
  MEME_ID_MIN_LENGTH: 4,
  MEME_ID_MAX_LENGTH: 6
} as const;

export const TELEGRAM_ID_RANGE = {
  MIN: 1,
  MAX: 10000000000,
  // FIXED: Use safer dev ID that's clearly in a reserved range (negative IDs are invalid for Telegram)
  // Using 999999990 instead of 999999999 to avoid potential collision with real high IDs
  DEV_MOCK_ID: 999999990
} as const;

export const POPCAT_CONFIG = {
  SAVE_MEME_POINTS: 3,
  // REMOVED: UPLOAD_MEME_POINTS - This constant was never used
  // Upload points are now given as part of save operation
  SHARE_MEME_POINTS: 1,
  WEEKLY_RESET_DAY: 1, // Monday
  // ADDED: Weekly ranking bonus points
  WEEKLY_TOP_1_BONUS: 10,
  WEEKLY_TOP_2_BONUS: 6,
  WEEKLY_TOP_3_BONUS: 3,
  REACTION_POINTS: 1, // Points awarded for reactions
} as const;

export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 500,
  BACKOFF_MULTIPLIER: 2
} as const;