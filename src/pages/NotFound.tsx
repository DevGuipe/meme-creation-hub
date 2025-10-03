import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { logger } from '@/lib/logger';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.error('404 Error: User attempted to access non-existent route', new Error(`Route not found: ${location.pathname}`));
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold font-popcat text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground font-ui">Oops! Page not found</p>
        <Link to="/" className="text-accent underline hover:text-accent/80 font-ui">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;