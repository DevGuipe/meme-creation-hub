import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Lightweight logging – avoid leaking sensitive data in production
    // eslint-disable-next-line no-console
    console.error('[AppErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="p-8 text-center bg-card border-border brutal-shadow max-w-md w-full">
            <h2 className="text-xl font-bold font-ui mb-2 text-foreground">Algo deu errado</h2>
            <p className="text-muted-foreground font-ui mb-4">
              O aplicativo encontrou um erro inesperado.
            </p>
            {this.state.error && (
              <pre className="text-xs text-destructive/90 bg-muted p-3 rounded mb-4 overflow-auto text-left">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={this.handleReload} className="bg-accent text-accent-foreground hover:bg-accent/90 font-ui">
              Recarregar
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default AppErrorBoundary;
