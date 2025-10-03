import { useMemo, useState, useEffect } from 'react';
import { PopcatMaker } from '@/components/PopcatMaker';
import { AdminTelegramTools } from '@/components/AdminTelegramTools';
import { AdminLogin } from '@/components/AdminLogin';

const Index = () => {
  const showAdmin = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('admin') === '1';
  }, []);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    if (showAdmin) {
      // Check if admin is already authenticated in this session
      const authToken = sessionStorage.getItem('admin_auth');
      if (authToken) {
        try {
          const decoded = JSON.parse(atob(authToken));
          // Token valid for 24 hours
          const isValid = (Date.now() - decoded.timestamp) < (24 * 60 * 60 * 1000);
          setIsAdminAuthenticated(isValid);
          if (!isValid) {
            sessionStorage.removeItem('admin_auth');
          }
        } catch {
          sessionStorage.removeItem('admin_auth');
        }
      }
    }
  }, [showAdmin]);

  // Show admin login if admin=1 but not authenticated
  if (showAdmin && !isAdminAuthenticated) {
    return <AdminLogin onAuthenticated={() => setIsAdminAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {showAdmin && isAdminAuthenticated && <AdminTelegramTools />}
      <PopcatMaker />
    </div>
  );
};

export default Index;
