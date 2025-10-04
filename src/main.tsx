import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logger } from '@/lib/logger';

// CRITICAL FIX: Wait for Telegram script to load before rendering
const initApp = () => {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    logger.error('Root element not found in DOM');
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <div>
          <h1 style="font-size: 24px; margin-bottom: 10px;">⚠️ Error</h1>
          <p style="color: #666;">Could not initialize app. Please refresh the page.</p>
          <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Refresh</button>
        </div>
      </div>
    `;
    return;
  }

  try {
    logger.info('🚀 Initializing POPCAT Memer app');
    logger.info('Telegram WebApp available:', !!window.Telegram?.WebApp);
    createRoot(rootElement).render(<App />);
    logger.info('✅ App rendered successfully');
  } catch (error) {
    logger.error('❌ Error rendering App', error);
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; padding: 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <div style="background: white; padding: 40px; border-radius: 20px; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
          <div style="font-size: 60px; margin-bottom: 20px;">😿</div>
          <h1 style="font-size: 24px; margin-bottom: 10px; color: #333;">Oops! Something went wrong</h1>
          <p style="color: #666; margin-bottom: 20px;">We couldn't start the app. Please try again.</p>
          <button onclick="window.location.reload()" style="padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: bold;">🔄 Try Again</button>
        </div>
      </div>
    `;
  }
};

// CRITICAL FIX: Wait for DOM and Telegram script
if (document.readyState === 'loading') {
  logger.info('⏳ Waiting for DOM to load...');
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  logger.info('✅ DOM already loaded, initializing immediately');
  initApp();
}
