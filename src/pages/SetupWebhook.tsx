import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';

export default function SetupWebhook() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'setting' | 'success' | 'error'>('idle');
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoSetup, setAutoSetup] = useState(false);

  const checkWebhook = async () => {
    try {
      setStatus('checking');
      setError(null);
      
      const { data, error: invokeError } = await supabase.functions.invoke('debug-telegram', {
        body: { action: 'getWebhookInfo' }
      });

      if (invokeError) throw invokeError;
      
      setWebhookInfo(data);
      
      const expectedUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook`;
      const currentUrl = data?.result?.url || '';
      
      if (currentUrl === expectedUrl) {
        setStatus('success');
      } else {
        setStatus('idle');
        if (autoSetup) {
          await setupWebhook();
        }
      }
    } catch (e) {
      console.error('Error checking webhook:', e);
      setError((e as any)?.message || 'Failed to check webhook');
      setStatus('error');
    }
  };

  const setupWebhook = async () => {
    try {
      setStatus('setting');
      setError(null);
      
      // First delete existing webhook
      await supabase.functions.invoke('debug-telegram', {
        body: { action: 'deleteWebhook' }
      });
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set new webhook
      const { data, error: invokeError } = await supabase.functions.invoke('debug-telegram', {
        body: { action: 'setWebhook' }
      });

      if (invokeError) throw invokeError;
      
      if (data?.result?.ok) {
        setStatus('success');
        await checkWebhook();
      } else {
        throw new Error(data?.result?.description || 'Failed to set webhook');
      }
    } catch (e) {
      console.error('Error setting webhook:', e);
      setError((e as any)?.message || 'Failed to setup webhook');
      setStatus('error');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auto') === '1') {
      setAutoSetup(true);
      checkWebhook();
    }
  }, []);

  const expectedUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook`;
  const currentUrl = webhookInfo?.result?.url || '';
  const isCorrect = currentUrl === expectedUrl;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 glass-effect border-2 border-white/40 shadow-2xl">
        <h1 className="text-3xl font-popcat gradient-text mb-6 text-center">
          🐱 Telegram Webhook Setup
        </h1>

        {status === 'idle' && (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground">
              Configure the Telegram webhook to enable bot functionality
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={checkWebhook} variant="secondary" size="lg">
                Check Current Status
              </Button>
              <Button onClick={setupWebhook} variant="popcat" size="lg">
                Setup Webhook
              </Button>
            </div>
          </div>
        )}

        {status === 'checking' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-center text-muted-foreground">Checking webhook status...</p>
          </div>
        )}

        {status === 'setting' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-center text-muted-foreground">Configuring webhook...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <h2 className="text-2xl font-bold text-green-600">Webhook Configured Successfully!</h2>
            <p className="text-center text-muted-foreground">
              Your Telegram bot is now properly configured and ready to use in English.
            </p>
            <Button onClick={checkWebhook} variant="outline" className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Again
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <XCircle className="w-16 h-16 text-red-500" />
            <h2 className="text-2xl font-bold text-red-600">Error</h2>
            <p className="text-center text-destructive">{error}</p>
            <Button onClick={() => setStatus('idle')} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {webhookInfo && (
          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-semibold">Current Configuration:</h3>
            
            <div className="bg-muted/40 rounded-xl p-4 space-y-2">
              <div className="flex items-start gap-2">
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold mb-1">Webhook URL:</p>
                  <p className="text-xs break-all font-mono bg-background/60 p-2 rounded">
                    {currentUrl || 'Not set'}
                  </p>
                </div>
              </div>

              {!isCorrect && currentUrl && (
                <div className="flex items-start gap-2 mt-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-1 text-orange-600">Expected URL:</p>
                    <p className="text-xs break-all font-mono bg-background/60 p-2 rounded">
                      {expectedUrl}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  <strong>Pending Updates:</strong> {webhookInfo.result?.pending_update_count || 0}
                </p>
                {webhookInfo.result?.last_error_message && (
                  <p className="text-xs text-destructive mt-2">
                    <strong>Last Error:</strong> {webhookInfo.result.last_error_message}
                  </p>
                )}
              </div>
            </div>

            {!isCorrect && (
              <Button onClick={setupWebhook} variant="popcat" size="lg" className="w-full">
                Fix Webhook Configuration
              </Button>
            )}
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            <strong>💡 Tip:</strong> After setting up the webhook, test your bot by sending <code className="bg-background/60 px-2 py-0.5 rounded">/start</code> in Telegram.
            All messages should now be in English with proper Popcat styling! 🐱
          </p>
        </div>
      </Card>
    </div>
  );
}
