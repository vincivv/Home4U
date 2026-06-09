import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__glow" aria-hidden="true" />
          <div className="error-boundary__card glass-depth">
            <div className="error-boundary__icon-wrap">
              <AlertTriangle className="error-boundary__icon" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <p className="error-boundary__eyebrow">Something interrupted the flow</p>
            <h1 className="error-boundary__title">We hit an unexpected snag</h1>
            <p className="error-boundary__body">
              The interface recovered by isolating this view. You can return to your dashboard or try
              reloading. If the API was unreachable, check your connection and try again.
            </p>
            <div className="error-boundary__actions">
              <button
                type="button"
                className="error-boundary__btn error-boundary__btn--primary"
                data-magnetic-button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/dashboard';
                }}
              >
                <Home size={18} aria-hidden="true" />
                Back to dashboard
              </button>
              <button
                type="button"
                className="error-boundary__btn error-boundary__btn--ghost"
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={18} aria-hidden="true" />
                Reload page
              </button>
            </div>
            {this.state.error && (
              <details className="error-boundary__details">
                <summary>Technical detail</summary>
                <pre>{this.state.error.toString()}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
