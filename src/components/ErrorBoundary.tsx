import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: 32, background: '#0a0a0a', color: '#fff', textAlign: 'center',
        }}>
          <h1 style={{ fontSize: 24, marginBottom: 12, color: '#ff4444' }}>Something went wrong</h1>
          <p style={{ color: '#999', marginBottom: 24, maxWidth: 480 }}>
            An unexpected error occurred. You can try reloading the page.
          </p>
          {this.state.error && (
            <pre style={{
              background: '#1a1a1a', padding: 16, borderRadius: 8, fontSize: 12,
              maxWidth: '90vw', overflow: 'auto', marginBottom: 24, color: '#ff6b6b',
              textAlign: 'left',
            }}>
              {this.state.error.message}
            </pre>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: '#39FF14', color: '#000', fontWeight: 700, fontSize: 14,
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px', borderRadius: 8, border: '1px solid #333', cursor: 'pointer',
                background: 'transparent', color: '#fff', fontWeight: 600, fontSize: 14,
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
