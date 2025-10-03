import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminLoginProps {
  onAuthenticated: () => void;
}

export const AdminLogin = ({ onAuthenticated }: AdminLoginProps) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter the admin password",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-admin', {
        body: { password }
      });

      if (error) throw error;

      if (data?.valid) {
        // Store token with timestamp
        const authToken = btoa(JSON.stringify({
          timestamp: Date.now(),
          hash: btoa(password)
        }));
        sessionStorage.setItem('admin_auth', authToken);
        
        toast({
          title: "Access Granted",
          description: "Welcome to admin panel! 🐱",
        });
        
        onAuthenticated();
      } else {
        toast({
          title: "Access Denied",
          description: "Invalid admin password",
          variant: "destructive"
        });
        setPassword('');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      toast({
        title: "Error",
        description: "Failed to verify password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500">
      <Card className="max-w-md w-full p-8 glass-effect border-2 border-white/40 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-popcat gradient-text">Admin Access</h2>
          <p className="text-sm text-muted-foreground mt-2">Enter password to access admin tools</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-12 text-center"
              autoFocus
            />
          </div>

          <Button
            type="submit"
            variant="popcat"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Access Admin Panel
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-6">
          🐱 Authorized personnel only
        </p>
      </Card>
    </div>
  );
};
