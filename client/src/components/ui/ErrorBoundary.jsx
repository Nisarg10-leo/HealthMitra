import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', maxWidth: '560px', margin: '60px auto' }}>
          <div className="glass-matrix" style={{ padding: '32px 28px', textAlign: 'center' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>⚠️</span>
            <h2 style={{ color: '#ffffff', fontSize: '1.5rem', margin: '0 0 8px' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 20px' }}>
              {this.state.error?.message || 'An unexpected error occurred while loading this view.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-cyber"
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                Reload HealthMitra
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
