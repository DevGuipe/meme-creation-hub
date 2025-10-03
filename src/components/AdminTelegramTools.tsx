import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

export const AdminTelegramTools = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [autoFixing, setAutoFixing] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'checking' | 'correct' | 'incorrect' | 'error'>('checking');

  const call = async (action: 'getWebhookInfo' | 'setWebhook' | 'deleteWebhook' | 'getMe') => {
    try {
      setLoading(action);
      const { data, error } = await supabase.functions.invoke('debug-telegram', {
        body: { action }
      });
      if (error) throw error;
      setResult(data);
      
      // Check webhook status after getting info
      if (action === 'getWebhookInfo' && data?.result) {
        const expectedUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook`;
        const currentUrl = data.result.url || '';
        setWebhookStatus(currentUrl === expectedUrl ? 'correct' : 'incorrect');
      }
      
      return data;
    } catch (e) {
      const errorResult = { error: (e as any)?.message || String(e) };
      setResult(errorResult);
      setWebhookStatus('error');
      throw e;
    } finally {
      setLoading(null);
    }
  };

  const autoFix = async () => {
    try {
      setAutoFixing(true);
      setResult(null);
      
      // Step 1: Delete existing webhook
      await call('deleteWebhook');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 2: Set new webhook
      await call('setWebhook');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 3: Verify
      await call('getWebhookInfo');
      
      setResult({
        success: true,
        message: '✅ Webhook configured successfully! Test /start in Telegram now.'
      });
    } catch (e) {
      setResult({
        success: false,
        error: '❌ Auto-fix failed. Try manual steps below.',
        details: (e as any)?.message
      });
    } finally {
      setAutoFixing(false);
    }
  };

  useEffect(() => {
    // Auto-check on mount
    call('getWebhookInfo').catch(() => {});
  }, []);

  const expectedUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook`;
  const currentUrl = result?.result?.url || '';

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10">
      <Card className="p-6 glass-effect border-2 border-primary/20 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h2 className="text-2xl font-popcat gradient-text">🐱 Telegram Webhook Configuration</h2>
            <p className="text-sm text-muted-foreground mt-1">Fix /start appearing in Portuguese</p>
          </div>
          <div className="flex items-center gap-2">
            {webhookStatus === 'checking' && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
            {webhookStatus === 'correct' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            {webhookStatus === 'incorrect' && <XCircle className="w-5 h-5 text-orange-500" />}
            {webhookStatus === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
          </div>
        </div>

        {/* Quick Auto-Fix Button */}
        {webhookStatus === 'incorrect' && (
          <div className="mb-6 p-4 bg-orange-500/10 border-2 border-orange-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-orange-600 mb-1">Webhook is pointing to wrong URL</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  This is why /start is still in Portuguese. Click below to fix automatically:
                </p>
                <Button 
                  onClick={autoFix} 
                  disabled={autoFixing || loading !== null}
                  variant="popcat"
                  size="lg"
                  className="w-full"
                >
                  {autoFixing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Fixing Webhook...
                    </>
                  ) : (
                    <>
                      🔧 Auto-Fix Webhook Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {webhookStatus === 'correct' && (
          <div className="mb-6 p-4 bg-green-500/10 border-2 border-green-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-green-600 mb-1">Webhook Configured Correctly!</h3>
                <p className="text-sm text-muted-foreground">
                  Your bot should now respond in English. Test with /start in Telegram.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Manual Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Manual Controls:</h3>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => call('getWebhookInfo')} disabled={loading!==null || autoFixing}>
              {loading === 'getWebhookInfo' ? <Loader2 className="w-4 h-4 animate-spin" /> : '📋'} Check Status
            </Button>
            <Button variant="popcat" onClick={() => call('setWebhook')} disabled={loading!==null || autoFixing}>
              {loading === 'setWebhook' ? <Loader2 className="w-4 h-4 animate-spin" /> : '✅'} Set Webhook
            </Button>
            <Button variant="destructive" onClick={() => call('deleteWebhook')} disabled={loading!==null || autoFixing}>
              {loading === 'deleteWebhook' ? <Loader2 className="w-4 h-4 animate-spin" /> : '🗑️'} Delete Webhook
            </Button>
            <Button variant="outline" onClick={() => call('getMe')} disabled={loading!==null || autoFixing}>
              {loading === 'getMe' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ℹ️'} Bot Info
            </Button>
          </div>
        </div>

        {/* Webhook Details */}
        {result && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold">Current Configuration:</h3>
            
            {currentUrl && (
              <div className="space-y-2">
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Current URL:</p>
                  <code className="text-xs break-all block bg-background/60 p-2 rounded">{currentUrl}</code>
                </div>
                
                {webhookStatus === 'incorrect' && (
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-orange-600 mb-1">Expected URL:</p>
                    <code className="text-xs break-all block bg-background/60 p-2 rounded">{expectedUrl}</code>
                  </div>
                )}
              </div>
            )}

            <details className="bg-muted/20 rounded-lg">
              <summary className="cursor-pointer p-3 text-xs font-semibold hover:bg-muted/40 rounded-lg">
                Full Response (click to expand)
              </summary>
              <pre className="p-3 overflow-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}

        <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            <strong>💡 After fixing:</strong> Send /start to your bot in Telegram. 
            It should now respond in English with Popcat styling! 🐱
          </p>
        </div>
      </Card>
    </div>
  );
};