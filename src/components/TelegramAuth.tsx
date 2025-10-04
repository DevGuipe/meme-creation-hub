import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { telegramUserSchema, validateTelegramId } from '@/lib/validations';
import { TELEGRAM_ID_RANGE } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, INFO_MESSAGES } from '@/lib/messages';
import { withRetry } from '@/utils/retryLogic';
import type { TelegramUser } from '@/types';


interface TelegramAuthProps {
  onAuthenticated: (user: TelegramUser) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: TelegramUser;
        };
        initData?: string;
        ready?: () => void;
      };
    };
  }
}

export const TelegramAuth = ({ onAuthenticated }: TelegramAuthProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logger.debug('TelegramAuth: Starting authentication');
    logger.debug('window.Telegram exists?', { hasTelegram: !!window.Telegram });
    
    // CRITICAL FIX: Add timeout to prevent infinite loading
    const authTimeout = setTimeout(() => {
      if (isLoading) {
        logger.error('TelegramAuth: Authentication timeout after 10 seconds');
        setError('Authentication timeout. Please try refreshing the page.');
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout
    
    // Try to get user from URL params first (fallback method)
    const urlParams = new URLSearchParams(window.location.search);
    const tgUserId = urlParams.get('tgUserId');
    const tgUsername = urlParams.get('tgUsername');
    const tgFirstName = urlParams.get('tgFirstName');
    
    // FIXED: Validate tgUserId before parsing with proper null handling
    let parsedUserId: number | null = null;
    if (tgUserId) {
      parsedUserId = parseInt(tgUserId, 10);
      if (isNaN(parsedUserId) || parsedUserId <= 0) {
        logger.error('Invalid tgUserId in URL params', { tgUserId });
        setError(ERROR_MESSAGES.AUTH.INVALID_TELEGRAM_ID);
        setIsLoading(false);
        return;
      }
    }
    
    logger.debug('URL params received', { hasTgUserId: !!tgUserId, hasTgUsername: !!tgUsername });
    
    // Check if running inside Telegram WebApp
    if (window.Telegram?.WebApp) {
      logger.info('Detected Telegram WebApp');
      window.Telegram.WebApp.ready?.();

      // Helper to extract user from Telegram initData
      const getUserFromInitData = () => {
        try {
          const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
          if (u?.id) return u;
        } catch {}
        try {
          const initData = window.Telegram?.WebApp?.initData;
          if (!initData) return null;
          const params = new URLSearchParams(initData);
          const userStr = params.get('user');
          if (userStr) return JSON.parse(userStr);
        } catch (parseError) {
          logger.error('Error parsing initData', parseError);
        }
        return null;
      };

      // Wait up to 5s for Telegram to populate user data (some clients are delayed)
      const waitForUser = async (timeoutMs = 5000, intervalMs = 100) => {
        const start = Date.now();
        let u = getUserFromInitData();
        while (!u && Date.now() - start < timeoutMs) {
          await new Promise((r) => setTimeout(r, intervalMs));
          u = getUserFromInitData();
        }
        return u;
      };

      (async () => {
        logger.info('Waiting for Telegram user data...');
        const user = await waitForUser(5000, 100);
        logger.debug('Telegram user data', { hasUser: !!user, user });

        if (user) {
          logger.info('User obtained from Telegram WebApp');
          registerUser(user);
          return;
        }

        if (parsedUserId) {
          // Fallback: use URL params if initDataUnsafe is empty
          logger.info('initData empty, using URL data');
          const userFromUrl = {
            id: parsedUserId,
            username: tgUsername || undefined,
            first_name: tgFirstName || 'User'
          };
          registerUser(userFromUrl);
          return;
        }

        logger.error('No user data found after waiting');
        setError('Could not get Telegram data. Please open the app through the bot using the "Open App" button.');
        setIsLoading(false);
      })();
    } else {
      logger.info('Not running inside Telegram WebApp');
      
      // Check if we have URL params (opened from bot in browser)
      if (parsedUserId) {
        logger.info('Using URL data (browser mode)');
        const userFromUrl = {
          id: parsedUserId,
          username: tgUsername || undefined,
          first_name: tgFirstName || 'User'
        };
        registerUser(userFromUrl);
      } else {
        // For development - simulate Telegram user with non-conflicting ID
        logger.info('Development mode - using mock user');
        // FIXED: Use constant already imported at top instead of dynamic import
        const mockUser = {
          id: TELEGRAM_ID_RANGE.DEV_MOCK_ID,
          username: 'dev_testuser',
          first_name: 'Dev Test User'
        };
        registerUser(mockUser);
      }
    }
    
    // Cleanup timeout on unmount
    return () => {
      clearTimeout(authTimeout);
    };
  }, [isLoading]); // Added isLoading as dependency to track state

  const registerUser = async (telegramUser: TelegramUser) => {
    try {
      logger.debug('Starting registerUser');
      setIsLoading(true);
      
      // Validate telegram user data
      logger.debug('Validating user data');
      const validatedUser = telegramUserSchema.parse(telegramUser);
      
      if (!validateTelegramId(validatedUser.id)) {
        logger.error('Invalid Telegram ID', { id: validatedUser.id });
        throw new Error(ERROR_MESSAGES.AUTH.INVALID_TELEGRAM_ID);
      }
      logger.debug('Valid Telegram ID');
      
      // Check if user exists via secure function (avoids UPDATE via RLS) - WITH RETRY
      logger.debug('Checking if user exists with retry logic');
      
      const userExists = await withRetry(
        async () => {
          const { data, error } = await supabase
            .rpc('check_user_exists_by_telegram_id', { telegram_user_id: validatedUser.id });
          
          if (error) {
            logger.error('RPC check_user_exists_by_telegram_id failed', error);
            throw error;
          }
          
          return data;
        },
        'Check user exists',
        {
          maxAttempts: 3,
          delay: 1000,
          backoff: true,
          retryCondition: (error: any) => {
            // Retry on network errors, timeouts, or server errors
            return (
              error?.message?.includes('fetch') ||
              error?.message?.includes('timeout') ||
              error?.message?.includes('network') ||
              error?.code === 'PGRST301' ||
              error?.code === 'PGRST204'
            );
          }
        }
      );

      if (!userExists) {
        logger.info('User does not exist, creating via secure RPC with retry logic');
        
        const newUserId = await withRetry(
          async () => {
            const { data, error } = await supabase
              .rpc('create_user_if_not_exists', {
                telegram_user_id: validatedUser.id,
                user_first_name: validatedUser.first_name || null,
              });

            if (error) {
              logger.error('RPC create_user_if_not_exists failed', error);
              throw error;
            }
            
            if (!data) {
              logger.error('RPC create_user_if_not_exists returned null');
              throw new Error('Failed to create user - no ID returned');
            }

            return data;
          },
          'Create user',
          {
            maxAttempts: 3,
            delay: 1000,
            backoff: true,
            retryCondition: (error: any) => {
              // Retry on network errors, timeouts, or server errors
              return (
                error?.message?.includes('fetch') ||
                error?.message?.includes('timeout') ||
                error?.message?.includes('network') ||
                error?.code === 'PGRST301' ||
                error?.code === 'PGRST204'
              );
            }
          }
        );

        logger.info('User created successfully via RPC with retry', { newUserId });
      } else {
        logger.debug('User already exists');
      }

      // FIXED: Removed unnecessary anonymous auth - system uses telegram_id, not Supabase auth
      // Edge functions use SERVICE_ROLE_KEY, so anonymous auth is not needed
      
      logger.info('Authentication successful');
      onAuthenticated(validatedUser);
    } catch (err: unknown) {
      logger.error('Authentication error', err);
      
      // Enhanced error handling with specific messages
      let userFriendlyMessage = 'Failed to authenticate with Telegram. Please try again.';
      
      if (err instanceof Error) {
        if (err.message?.includes('timeout') || err.message?.includes('network')) {
          userFriendlyMessage = 'Connection timeout. Please check your internet and try again.';
        } else if (err.message?.includes('Invalid')) {
          userFriendlyMessage = err.message;
        } else if (err.message?.includes('PGRST')) {
          userFriendlyMessage = 'Database connection failed. Please try again in a moment.';
        }
      }
      
      setError(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 animate-fade-in">
        <Card className="max-w-md w-full p-12 text-center glass-effect border-2 border-white/40 shadow-2xl animate-scale-in">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <div className="absolute inset-2 animate-pulse rounded-full bg-gradient-to-br from-primary to-accent opacity-30" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 opacity-20 animate-ping" />
          </div>
          <h2 className="text-3xl font-popcat gradient-text mb-4">
            🐱 Connecting
          </h2>
          <p className="text-muted-foreground font-ui text-base leading-relaxed">
            Authenticating with Telegram...
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 animate-fade-in">
        <Card className="max-w-md w-full p-10 text-center glass-effect border-2 border-white/40 shadow-2xl animate-scale-in">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-destructive/20 popcat-glow" />
            <User className="w-14 h-14 text-destructive absolute inset-0 m-auto drop-shadow-lg" strokeWidth={2.5} />
          </div>
          
          <h2 className="text-3xl font-popcat gradient-text mb-4">
            🔐 Authentication Required
          </h2>
          
          <div className="bg-white/80 backdrop-blur rounded-2xl p-5 mb-5 border-2 border-white/60">
            <p className="text-foreground font-ui text-base mb-3 font-semibold">
              This app works exclusively through Telegram
            </p>
            <p className="text-sm text-muted-foreground font-ui leading-relaxed">
              Please open the app through the Telegram bot for full access
            </p>
          </div>
          
          {error && (
            <div className="bg-destructive/10 border-2 border-destructive/30 rounded-2xl p-4 mb-5 backdrop-blur">
              <p className="text-sm text-destructive font-ui font-semibold">
                ⚠️ {error}
              </p>
            </div>
          )}
          
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full mt-4 h-14 text-lg shadow-xl hover:shadow-2xl"
            variant="popcat"
            size="lg"
          >
            🔄 Try Again
          </Button>
          
          <p className="text-xs text-muted-foreground font-ui mt-6 italic">
            Need help? Contact @PopcatSupport on Telegram
          </p>
        </Card>
      </div>
    );
  }

  return null;
};