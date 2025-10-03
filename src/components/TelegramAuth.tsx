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
    logger.debug('TelegramAuth: Iniciando autenticação');
    logger.debug('window.Telegram existe?', { hasTelegram: !!window.Telegram });
    
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
      logger.info('Detectado Telegram WebApp');
      window.Telegram.WebApp.ready?.();
      
      // Debug: Log all available Telegram data
      logger.debug('Telegram WebApp data:', {
        hasInitData: !!window.Telegram.WebApp.initData,
        hasInitDataUnsafe: !!window.Telegram.WebApp.initDataUnsafe,
        initDataUnsafe: window.Telegram.WebApp.initDataUnsafe,
        initData: window.Telegram.WebApp.initData
      });
      
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      logger.debug('Telegram user data', { hasUser: !!user, user });
      
      if (user) {
        logger.info('Usuário encontrado no initDataUnsafe');
        registerUser(user);
      } else if (parsedUserId) {
        // Fallback: use URL params if initDataUnsafe is empty
        logger.info('initDataUnsafe vazio, usando dados da URL');
        const userFromUrl = {
          id: parsedUserId,
          username: tgUsername || undefined,
          first_name: tgFirstName || 'User'
        };
        registerUser(userFromUrl);
      } else {
        // Try to parse initData string as last resort
        const initData = window.Telegram.WebApp.initData;
        if (initData) {
          logger.info('Tentando fazer parse do initData string');
          try {
            const params = new URLSearchParams(initData);
            const userStr = params.get('user');
            if (userStr) {
              const parsedUser = JSON.parse(userStr);
              logger.info('Usuário obtido do initData string', { parsedUser });
              registerUser(parsedUser);
              return;
            }
          } catch (parseError) {
            logger.error('Erro ao fazer parse do initData', parseError);
          }
        }
        
        logger.error('Nenhum dado de usuário encontrado em nenhum método');
        setError('Não foi possível obter dados do Telegram. Por favor, abra o app através do bot usando o botão "Abrir App".');
        setIsLoading(false);
      }
    } else {
      logger.info('Não está rodando dentro do Telegram WebApp');
      
      // Check if we have URL params (opened from bot in browser)
      if (parsedUserId) {
        logger.info('Usando dados da URL (modo browser)');
        const userFromUrl = {
          id: parsedUserId,
          username: tgUsername || undefined,
          first_name: tgFirstName || 'User'
        };
        registerUser(userFromUrl);
      } else {
        // For development - simulate Telegram user with non-conflicting ID
        logger.info('Modo desenvolvimento - usando usuário mock');
        // FIXED: Use constant already imported at top instead of dynamic import
        const mockUser = {
          id: TELEGRAM_ID_RANGE.DEV_MOCK_ID,
          username: 'dev_testuser',
          first_name: 'Dev Test User'
        };
        registerUser(mockUser);
      }
    }
  }, []);

  const registerUser = async (telegramUser: TelegramUser) => {
    try {
      logger.debug('Iniciando registerUser');
      setIsLoading(true);
      
      // Validate telegram user data
      logger.debug('Validando dados do usuário');
      const validatedUser = telegramUserSchema.parse(telegramUser);
      
      if (!validateTelegramId(validatedUser.id)) {
        logger.error('Telegram ID inválido', { id: validatedUser.id });
        throw new Error(ERROR_MESSAGES.AUTH.INVALID_TELEGRAM_ID);
      }
      logger.debug('Telegram ID válido');
      
      // Verifica se usuário já existe via função segura (evita UPDATE via RLS) - COM RETRY
      logger.debug('Verificando se usuário existe com retry logic');
      
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
        logger.info('Usuário não existe, criando via RPC segura com retry logic');
        
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

        logger.info('Usuário criado com sucesso via RPC com retry', { newUserId });
      } else {
        logger.debug('Usuário já existe');
      }

      // FIXED: Removed unnecessary anonymous auth - system uses telegram_id, not Supabase auth
      // Edge functions use SERVICE_ROLE_KEY, so anonymous auth is not needed
      
      logger.info('Autenticação bem-sucedida');
      onAuthenticated(validatedUser);
    } catch (err: unknown) {
      logger.error('Erro na autenticação', err);
      
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
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, hsl(25 95% 53%), hsl(32 100% 60%))' }}>
        <Card className="max-w-md w-full p-10 text-center bg-card/95 backdrop-blur-sm border-2 border-primary shadow-2xl">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <div className="absolute inset-2 animate-pulse rounded-full bg-gradient-to-br from-primary to-accent opacity-20" />
          </div>
          <h2 className="text-2xl font-bold font-popcat text-foreground mb-3">
            🐱 Conectando ao Telegram
          </h2>
          <p className="text-muted-foreground font-ui text-base">
            Aguarde enquanto verificamos sua autenticação...
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, hsl(25 95% 53%), hsl(32 100% 60%))' }}>
        <Card className="max-w-md w-full p-10 text-center bg-card/95 backdrop-blur-sm border-2 border-primary shadow-2xl">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 animate-pulse" />
            <User className="w-12 h-12 text-destructive absolute inset-0 m-auto" strokeWidth={2.5} />
          </div>
          
          <h2 className="text-2xl font-bold font-popcat text-foreground mb-3">
            🔐 Autenticação Necessária
          </h2>
          
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <p className="text-foreground font-ui text-base mb-2">
              Este aplicativo funciona exclusivamente através do Telegram
            </p>
            <p className="text-sm text-muted-foreground font-ui">
              Por favor, abra o app através do bot do Telegram para ter acesso completo
            </p>
          </div>
          
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-destructive font-ui">
                ⚠️ {error}
              </p>
            </div>
          )}
          
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-popcat text-lg py-6 shadow-lg hover:shadow-xl transition-all"
          >
            🔄 Tentar Novamente
          </Button>
          
          <p className="text-xs text-muted-foreground font-ui mt-4">
            Precisa de ajuda? Entre em contato com o suporte
          </p>
        </Card>
      </div>
    );
  }

  return null;
};