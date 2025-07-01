import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, MapPin, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: 'network' | 'auth' | 'location' | 'database' | 'unknown';
  retryCount: number;
}

class ErrorBoundaryClass extends Component<Props & { signOut: () => Promise<void> }, State> {
  constructor(props: Props & { signOut: () => Promise<void> }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Determine error type for appropriate handling
    let errorType: State['errorType'] = 'unknown';
    
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
      errorType = 'network';
    } else if (error.message.includes('auth') || error.message.includes('Firebase') || error.message.includes('token')) {
      errorType = 'auth';
    } else if (error.message.includes('location') || error.message.includes('geolocation')) {
      errorType = 'location';
    } else if (error.message.includes('database') || error.message.includes('SQL') || error.message.includes('storage')) {
      errorType = 'database';
    }

    return {
      hasError: true,
      error,
      errorType,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Log error to monitoring service (in production, this would be Sentry, LogRocket, etc.)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Report to analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  handleSignOut = async () => {
    try {
      await this.props.signOut();
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: 0,
      });
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  handleLocationRetry = () => {
    // Force location permission request
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
          });
          window.location.reload();
        },
        () => {
          // Location still denied, show manual location option
          this.setState({
            errorType: 'location',
          });
        }
      );
    }
  };

  renderErrorContent() {
    const { errorType, retryCount } = this.state;

    switch (errorType) {
      case 'network':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-orange-500 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Connection Issue
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              We're having trouble connecting to our servers. This might be due to a poor internet connection or temporary service issue.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRetry} className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
            {retryCount > 2 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Still having issues? Check your internet connection or try again later.
              </p>
            )}
          </div>
        );

      case 'auth':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Authentication Error
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Your session has expired or there was an authentication issue. Please sign in again.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleSignOut} className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4" />
                <span>Sign In Again</span>
              </Button>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Location Access Required
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              TriPlace needs your location to show relevant communities and events. Please enable location access in your browser settings.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleLocationRetry} className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Enable Location</span>
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/onboarding'}>
                Continue Without Location
              </Button>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <p>How to enable location:</p>
              <p>• Click the location icon in your browser's address bar</p>
              <p>• Select "Allow" for location access</p>
              <p>• Refresh the page</p>
            </div>
          </div>
        );

      case 'database':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <Users className="w-8 h-8 text-purple-500 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Service Temporarily Unavailable
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              We're experiencing technical difficulties. Our team has been notified and is working to resolve this issue.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRetry} className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              If this persists, please try again in a few minutes.
            </p>
          </div>
        );

      default:
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Something Went Wrong
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              An unexpected error occurred. We've been notified and are working to fix this issue.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRetry} className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left max-w-md mx-auto">
                <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        );
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full">
            {this.renderErrorContent()}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to provide auth context
export function ErrorBoundary({ children, fallback }: Props) {
  const { signOut } = useAuth();
  
  return (
    <ErrorBoundaryClass signOut={signOut} fallback={fallback}>
      {children}
    </ErrorBoundaryClass>
  );
} 