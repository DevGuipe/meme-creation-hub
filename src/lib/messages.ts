// User messages and error constants

export const ERROR_MESSAGES = {
  AUTH: {
    NO_TELEGRAM_DATA: 'No Telegram user data available',
    INVALID_TELEGRAM_ID: 'Invalid Telegram user ID',
    VERIFICATION_FAILED: 'Failed to verify user status',
    REGISTRATION_FAILED: 'Failed to register user',
    AUTH_REQUIRED: 'This app requires Telegram WebApp authentication.',
    GENERIC_FAILURE: 'Failed to authenticate with Telegram. Please try again.'
  },
  
  VALIDATION: {
    INVALID_TEXT: 'Text contains invalid characters or is too long',
    FILE_TOO_LARGE: 'Please select an image smaller than 5MB',
    INVALID_FILE_TYPE: 'Please select a valid image file',
    UPLOAD_FAILED: 'Could not process the image file',
    READ_FAILED: 'Could not read the image file'
  },
  
  PROCESSING: {
    EXPORT_FAILED: 'Failed to export your meme. Please try again.',
    SAVE_FAILED: 'Failed to save your meme. Please check your connection.',
    CANVAS_NOT_READY: 'Canvas not ready for export'
  }
} as const;

export const SUCCESS_MESSAGES = {
  AUTH: {
    USER_REGISTERED: 'User registered successfully',
    USER_EXISTS: 'User already exists, proceeding with authentication'
  },
  
  PROCESSING: {
    IMAGE_ADDED: 'Your image was added successfully!',
    MEME_SAVED: 'Your meme has been saved! Share it to earn points.',
    PROCESSING_IMAGE: 'Processing image...'
  }
} as const;

export const INFO_MESSAGES = {
  CANVAS: {
    CONNECTING_TELEGRAM: 'Connecting to Telegram...',
    EXPORTING_MEME: 'Creating your masterpiece...',
    LOADING_ASSETS: 'Loading meme assets...'
  }
} as const;