import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen } from 'lucide-react';
import { TelegramAuth } from './TelegramAuth';
import { MemeEditor } from './MemeEditor';
import { MemeGallery } from './MemeGallery';
import { PopcatStats } from './PopcatStats';
import { logger } from '@/lib/logger';
import type { TelegramUser } from '@/types';

export const PopcatMaker = () => {
  const [view, setView] = useState<'auth' | 'home' | 'editor' | 'gallery'>('auth');
  const [user, setUser] = useState<TelegramUser | null>(null);

  const handleAuthenticated = (telegramUser: TelegramUser) => {
    logger.debug('PopcatMaker: User authenticated', { userId: telegramUser.id });
    setUser(telegramUser);
    setView('home');
  };

  const handleMemeCreated = (memeId: string) => {
    logger.debug('PopcatMaker: Meme created', { memeId });
    setView('gallery');
  };

  if (view === 'auth') {
    return <TelegramAuth onAuthenticated={handleAuthenticated} />;
  }

  const HomeScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted p-4">
      <div className="max-w-sm mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-4xl animate-bounce">🐱</span>
            <h1 className="text-3xl font-popcat text-foreground tracking-wider bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              POPCAT MEMER
            </h1>
            <span className="text-4xl animate-pulse">🚀</span>
          </div>
          {user && (
            <div className="mb-4">
              <p className="text-lg font-bold font-ui text-foreground">
                Meow meow, {user.first_name || user.username || 'Popcat'}! 🐾
              </p>
              <p className="text-sm text-muted-foreground font-ui">
                Ready to create some epic memes? Let's POP! 💥
              </p>
            </div>
          )}
        </div>

        {/* POPCAT Stats */}
        <div className="mb-8">
          {/* FIXED: Pass number directly without string conversion */}
          {user?.id && <PopcatStats userId={user.id} />}
        </div>

        {/* Main Actions */}
        <div className="space-y-4 mb-8">
          <Card className="p-6 popcat-shadow bg-card popcat-border hover:scale-105 transition-all duration-300">
            <Button 
              onClick={() => setView('editor')}
              variant="popcat"
              className="w-full h-16 text-lg font-popcat"
              size="lg"
            >
              <Plus className="w-6 h-6 mr-2" />
              Create Epic Meme! 🎨
            </Button>
          </Card>

          <Card className="p-6 popcat-shadow bg-card popcat-border hover:scale-105 transition-all duration-300">
            <Button 
              onClick={() => setView('gallery')}
              variant="outline"
              className="w-full h-16 text-lg font-popcat"
              size="lg"
            >
              <FolderOpen className="w-6 h-6 mr-2" />
              My Meme Collection 📁
            </Button>
          </Card>
        </div>

        {/* Tips */}
        <Card className="p-4 bg-card/50 popcat-shadow popcat-border">
          <h3 className="font-bold text-foreground mb-2 font-popcat flex items-center gap-2">
            🐱 POPCAT Pro Tips
            <span className="text-primary">💡</span>
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2 font-ui">
            <li className="flex items-center gap-2">
              <span className="text-primary">🎭</span>
              Upload your face for ultimate POPCAT vibes!
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">💥</span>
              Keep text short and punchy for maximum POP!
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">🏆</span>
              Share your memes and climb the leaderboard!
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">🚀</span>
              Join the POPCAT community revolution!
            </li>
          </ul>
        </Card>

        {/* Community CTA */}
        <Card className="p-4 bg-gradient-to-r from-primary/20 to-accent/20 popcat-shadow popcat-border mt-4">
          <div className="text-center">
            <h3 className="font-bold text-foreground mb-2 font-popcat">
              🌟 Join the POPCAT Revolution! 🌟
            </h3>
            <p className="text-sm text-muted-foreground font-ui mb-3">
              Be part of the most epic meme community on Solana! 
            </p>
            <div className="flex justify-center gap-2 text-2xl">
              <span>🐱</span>
              <span>💎</span>
              <span>🚀</span>
              <span>🌙</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  switch (view) {
    case 'editor':
      return <MemeEditor onBack={() => setView('home')} onSave={handleMemeCreated} telegramUserId={user?.id} />;
    case 'gallery':
      // FIXED: Pass telegramUserId to MemeGallery to filter user's memes
      return <MemeGallery onBack={() => setView('home')} onCreateNew={() => setView('editor')} telegramUserId={user?.id} />;
    default:
      return <HomeScreen />;
  }
};