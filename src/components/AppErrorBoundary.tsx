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
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Card className="p-8 text-center bg-white border-0 shadow-2xl max-w-md w-full" style={{ borderRadius: '20px' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>😿</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#333' }}>Oops! Something Broke</h2>
            <p className="text-gray-600 mb-4">
              The app encountered an unexpected error.
            </p>
            {this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
                  🔍 Technical Details
                </summary>
                <pre className="text-xs text-red-600 bg-gray-100 p-3 rounded overflow-auto max-h-40">
                  {this.state.error.message}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}
            <Button 
              onClick={this.handleReload} 
              className="w-full"
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                fontSize: '16px',
                fontWeight: 'bold',
                padding: '12px'
              }}
            >
              🔄 Reload App
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default AppErrorBoundary;
