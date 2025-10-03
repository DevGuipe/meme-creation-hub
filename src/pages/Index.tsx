import { useMemo } from 'react';
import { PopcatMaker } from '@/components/PopcatMaker';
import { AdminTelegramTools } from '@/components/AdminTelegramTools';

const Index = () => {
  const showAdmin = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('admin') === '1';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {showAdmin && <AdminTelegramTools />}
      <PopcatMaker />
    </div>
  );
};

export default Index;
