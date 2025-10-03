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
    <div className="min-h-screen bg-transparent p-4 sm:p-6 animate-fade-in">
      <div className="max-w-lg mx-auto pt-6 sm:pt-10 space-y-8">
        {/* Enhanced Header with Floating Animation */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="text-6xl sm:text-7xl animate-bounce-gentle filter drop-shadow-2xl">🐱</span>
            <div className="relative">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-popcat gradient-text tracking-wider">
                POPCAT
                <span className="block text-3xl sm:text-4xl md:text-5xl mt-2 gradient-text-sunset">MEMER</span>
              </h1>
            </div>
            <span className="text-6xl sm:text-7xl animate-pulse filter drop-shadow-2xl">🚀</span>
          </div>
          {user && (
            <div className="glass-effect rounded-3xl p-6 border-3 border-white/40 hover-lift backdrop-blur-strong">
              <p className="text-xl sm:text-2xl font-bold font-popcat gradient-text mb-2">
                Yo {user.first_name || user.username || 'Popcat'}! Ready to POP? 🐱
              </p>
              <p className="text-sm sm:text-base text-muted-foreground font-ui leading-relaxed">
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
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Card className="p-0 overflow-hidden border-3 border-primary hover-lift shadow-xl hover:shadow-2xl bg-gradient-to-br from-white via-orange-50/30 to-orange-100/50">
            <div className="p-8 bg-gradient-to-r from-primary/5 to-accent/5">
              <Button 
                onClick={() => setView('editor')}
                variant="popcat"
                className="w-full h-16 sm:h-18 text-xl sm:text-2xl font-popcat gap-4"
                size="xl"
              >
                <Plus className="w-8 h-8" />
                Create Meme 🎨
              </Button>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden border-3 border-purple-400 hover-lift shadow-xl hover:shadow-2xl bg-gradient-to-br from-white via-purple-50/30 to-purple-100/50">
            <div className="p-8 bg-gradient-to-r from-purple-100/30 to-pink-100/30">
              <Button 
                onClick={() => setView('gallery')}
                variant="gradient"
                className="w-full h-16 sm:h-18 text-xl sm:text-2xl font-popcat gap-4"
                size="xl"
              >
                <FolderOpen className="w-8 h-8" />
                My Memes 📁
              </Button>
            </div>
          </Card>
        </div>

        {/* Tips with Modern Glass Effect */}
        <Card className="glass-effect border-3 border-white/40 hover-lift animate-scale-in backdrop-blur-strong" style={{ animationDelay: '0.2s' }}>
          <div className="p-8">
            <h3 className="font-popcat text-xl sm:text-2xl mb-6 flex items-center gap-3 gradient-text">
              🐱 POPCAT Pro Tips
              <span className="text-3xl animate-bounce-gentle">💡</span>
            </h3>
            <ul className="space-y-4 font-ui text-sm sm:text-base">
              <li className="flex items-start gap-4 p-3 rounded-2xl hover:bg-white/60 transition-all duration-300 hover-scale">
                <span className="text-3xl flex-shrink-0 animate-float" style={{ animationDelay: '0s' }}>🎭</span>
                <span className="text-foreground leading-relaxed">Upload your face or any image to make it POP!</span>
              </li>
              <li className="flex items-start gap-4 p-3 rounded-2xl hover:bg-white/60 transition-all duration-300 hover-scale">
                <span className="text-3xl flex-shrink-0 animate-float" style={{ animationDelay: '0.3s' }}>💥</span>
                <span className="text-foreground leading-relaxed">Keep text short and punchy - let the meme speak!</span>
              </li>
              <li className="flex items-start gap-4 p-3 rounded-2xl hover:bg-white/60 transition-all duration-300 hover-scale">
                <span className="text-3xl flex-shrink-0 animate-float" style={{ animationDelay: '0.6s' }}>🏆</span>
                <span className="text-foreground leading-relaxed">Share your memes in groups to earn POPS!</span>
              </li>
              <li className="flex items-start gap-4 p-3 rounded-2xl hover:bg-white/60 transition-all duration-300 hover-scale">
                <span className="text-3xl flex-shrink-0 animate-float" style={{ animationDelay: '0.9s' }}>🚀</span>
                <span className="text-foreground leading-relaxed">Join the POPCAT revolution - to the moon! 🌙</span>
              </li>
            </ul>
          </div>
        </Card>

        {/* Community CTA with Neon Effect */}
        <Card className="p-0 overflow-hidden border-3 border-purple-400 hover-scale animate-scale-in popcat-neon" style={{ animationDelay: '0.3s' }}>
          <div className="p-8 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
            <div className="text-center">
              <h3 className="font-popcat text-2xl sm:text-3xl mb-4 text-white drop-shadow-2xl">
                🌟 POPCAT REVOLUTION 🌟
              </h3>
              <p className="text-base sm:text-lg text-white/95 font-ui mb-6 leading-relaxed">
                Join the most legendary meme community on Solana! 
              </p>
              <div className="flex justify-center gap-4 sm:gap-6 text-4xl sm:text-5xl">
                <span className="animate-float filter drop-shadow-2xl" style={{ animationDelay: '0s' }}>🐱</span>
                <span className="animate-float filter drop-shadow-2xl" style={{ animationDelay: '0.3s' }}>💎</span>
                <span className="animate-float filter drop-shadow-2xl" style={{ animationDelay: '0.6s' }}>🚀</span>
                <span className="animate-float filter drop-shadow-2xl" style={{ animationDelay: '0.9s' }}>🌙</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Bottom Spacing */}
        <div className="h-8"></div>
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