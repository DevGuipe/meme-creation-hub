import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export const AdminTelegramTools = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const call = async (action: 'getWebhookInfo' | 'setWebhook' | 'deleteWebhook' | 'getMe') => {
    try {
      setLoading(action);
      setResult(null);
      const { data, error } = await supabase.functions.invoke('debug-telegram', {
        body: { action }
      });
      if (error) throw error;
      setResult(data);
    } catch (e) {
      setResult({ error: (e as any)?.message || String(e) });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <Card className="p-4 md:p-6 glass-effect border-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-xl font-popcat gradient-text">🐱 Telegram Webhook Tools (Admin)</h2>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => call('getWebhookInfo')} disabled={loading!==null}>
              {loading === 'getWebhookInfo' ? 'Loading…' : 'Get Webhook Info'}
            </Button>
            <Button variant="popcat" onClick={() => call('setWebhook')} disabled={loading!==null}>
              {loading === 'setWebhook' ? 'Setting…' : 'Set Webhook'}
            </Button>
            <Button variant="destructive" onClick={() => call('deleteWebhook')} disabled={loading!==null}>
              {loading === 'deleteWebhook' ? 'Deleting…' : 'Delete Webhook'}
            </Button>
            <Button variant="outline" onClick={() => call('getMe')} disabled={loading!==null}>
              {loading === 'getMe' ? 'Loading…' : 'Get Bot Info'}
            </Button>
          </div>
        </div>
        <pre className="mt-4 bg-muted/40 rounded-xl p-4 overflow-auto text-xs">
{JSON.stringify(result, null, 2) || 'Run an action to see results here.'}
        </pre>
      </Card>
    </div>
  );
};