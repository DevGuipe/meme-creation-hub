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
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/30 to-orange-50/30 p-4 animate-fade-in">
      <div className="max-w-md mx-auto pt-8 space-y-6">
        {/* Enhanced Header with Floating Animation */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-5xl animate-bounce-gentle filter drop-shadow-lg">🐱</span>
            <h1 className="text-4xl md:text-5xl font-popcat gradient-text tracking-wider relative">
              POPCAT
              <span className="block text-2xl md:text-3xl mt-1">MEMER</span>
            </h1>
            <span className="text-5xl animate-pulse filter drop-shadow-lg">🚀</span>
          </div>
          {user && (
            <div className="glass-effect rounded-2xl p-4 border-2 border-primary/20 hover-lift">
              <p className="text-xl font-bold font-popcat gradient-text-sunset">
                Yo {user.first_name || user.username || 'Popcat'}! Ready to POP? 🐱
              </p>
              <p className="text-sm text-muted-foreground font-ui mt-2">
                Let's create some legendary memes and stack those POPS! 💎
              </p>
            </div>
          )}
        </div>

        {/* POPCAT Stats */}
        <div className="animate-scale-in">
          {user?.id && <PopcatStats userId={user.id} />}
        </div>

        {/* Main Actions with Enhanced Design */}
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Card className="p-0 overflow-hidden border-3 border-primary hover-lift brutal-shadow bg-gradient-to-br from-white to-orange-50/50">
            <div className="p-6 bg-gradient-to-r from-primary/5 to-accent/5">
              <Button 
                onClick={() => setView('editor')}
                variant="popcat"
                className="w-full h-16 text-xl font-popcat gap-3"
                size="lg"
              >
                <Plus className="w-7 h-7" />
                Create Meme 🎨
              </Button>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden border-3 border-purple-400 hover-lift brutal-shadow bg-gradient-to-br from-white to-purple-50/50">
            <div className="p-6 bg-gradient-to-r from-purple-100/30 to-pink-100/30">
              <Button 
                onClick={() => setView('gallery')}
                variant="outline"
                className="w-full h-16 text-xl font-popcat gap-3 border-purple-400 text-purple-700 hover:bg-purple-500 hover:text-white"
                size="lg"
              >
                <FolderOpen className="w-7 h-7" />
                My Memes 📁
              </Button>
            </div>
          </Card>
        </div>

        {/* Tips with Modern Glass Effect */}
        <Card className="glass-effect border-2 border-white/40 hover-lift animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="p-6">
            <h3 className="font-popcat text-lg mb-4 flex items-center gap-2 gradient-text">
              🐱 POPCAT Pro Tips
              <span className="text-2xl animate-bounce-gentle">💡</span>
            </h3>
            <ul className="space-y-3 font-ui text-sm">
              <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors">
                <span className="text-2xl flex-shrink-0 animate-bounce-gentle" style={{ animationDelay: '0s' }}>🎭</span>
                <span className="text-foreground leading-relaxed">Upload your face or any image to make it POP!</span>
              </li>
              <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors">
                <span className="text-2xl flex-shrink-0 animate-bounce-gentle" style={{ animationDelay: '0.2s' }}>💥</span>
                <span className="text-foreground leading-relaxed">Keep text short and punchy - let the meme speak!</span>
              </li>
              <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors">
                <span className="text-2xl flex-shrink-0 animate-bounce-gentle" style={{ animationDelay: '0.4s' }}>🏆</span>
                <span className="text-foreground leading-relaxed">Share your memes in groups to earn POPS!</span>
              </li>
              <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors">
                <span className="text-2xl flex-shrink-0 animate-bounce-gentle" style={{ animationDelay: '0.6s' }}>🚀</span>
                <span className="text-foreground leading-relaxed">Join the POPCAT revolution - to the moon! 🌙</span>
              </li>
            </ul>
          </div>
        </Card>

        {/* Community CTA with Neon Effect */}
        <Card className="p-0 overflow-hidden border-3 border-purple-400 popcat-neon hover-scale animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <div className="p-6 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
            <div className="text-center">
              <h3 className="font-popcat text-xl mb-3 text-white drop-shadow-lg">
                🌟 POPCAT REVOLUTION 🌟
              </h3>
              <p className="text-sm text-white/90 font-ui mb-4 leading-relaxed">
                Join the most legendary meme community on Solana! 
              </p>
              <div className="flex justify-center gap-3 text-3xl">
                <span className="animate-bounce-gentle filter drop-shadow-lg" style={{ animationDelay: '0s' }}>🐱</span>
                <span className="animate-bounce-gentle filter drop-shadow-lg" style={{ animationDelay: '0.2s' }}>💎</span>
                <span className="animate-bounce-gentle filter drop-shadow-lg" style={{ animationDelay: '0.4s' }}>🚀</span>
                <span className="animate-bounce-gentle filter drop-shadow-lg" style={{ animationDelay: '0.6s' }}>🌙</span>
              </div>
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