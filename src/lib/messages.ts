// User messages and error constants

export const ERROR_MESSAGES = {
  AUTH: {
    NO_TELEGRAM_DATA: 'No Telegram data found - connect your account to POP!',
    INVALID_TELEGRAM_ID: 'Invalid Telegram ID - can\'t verify your identity',
    VERIFICATION_FAILED: 'Failed to verify your POPCAT status',
    REGISTRATION_FAILED: 'Failed to register - couldn\'t join the POPCAT squad',
    AUTH_REQUIRED: 'This app requires Telegram WebApp authentication to POP!',
    GENERIC_FAILURE: 'Authentication failed - try again and let\'s POP!'
  },
  
  VALIDATION: {
    INVALID_TEXT: 'Text contains invalid characters or is too long - keep it snappy!',
    FILE_TOO_LARGE: 'Whoa there! Image must be smaller than 5MB',
    INVALID_FILE_TYPE: 'Please select a valid image file (PNG, JPG, GIF)',
    UPLOAD_FAILED: 'Couldn\'t process that image - try another one',
    READ_FAILED: 'Couldn\'t read the image file - give it another shot'
  },
  
  PROCESSING: {
    EXPORT_FAILED: 'Failed to export your meme - retry to make it POP!',
    SAVE_FAILED: 'Failed to save your meme - check your connection and try again',
    CANVAS_NOT_READY: 'Canvas not ready yet - hold tight!'
  }
} as const;

export const SUCCESS_MESSAGES = {
  AUTH: {
    USER_REGISTERED: 'Welcome to the POPCAT squad! Let\'s create some epic memes!',
    USER_EXISTS: 'Welcome back, POPCAT! Let\'s keep poppin\' those memes!'
  },
  
  PROCESSING: {
    IMAGE_ADDED: 'Image added! Time to make it POP! 🐱',
    MEME_SAVED: 'Meme saved! Share it and earn POPS points! 🚀',
    PROCESSING_IMAGE: 'Processing your masterpiece... 🎨'
  }
} as const;

export const INFO_MESSAGES = {
  CANVAS: {
    CONNECTING_TELEGRAM: 'Connecting to Telegram... almost there! 🔌',
    EXPORTING_MEME: 'Creating your epic POPCAT meme... 🐱✨',
    LOADING_ASSETS: 'Loading meme assets... getting ready to POP! 🎭'
  }
} as const;