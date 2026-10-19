import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[CouncilConnect] render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: "'Inter', sans-serif",
            background: '#f5f7fa',
          }}
        >
          <div style={{ maxWidth: 560, textAlign: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'linear-gradient(135deg,#2266ED,#3b7af8)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Fraunces', serif",
                fontWeight: 900,
                fontSize: 18,
                margin: '0 auto 16px',
              }}
            >
              CC
            </div>
            <h1 style={{ fontFamily: "'Fraunces', serif", color: '#34363A', fontSize: '1.4rem', marginBottom: 8 }}>
              Something went wrong
            </h1>
            <p style={{ color: '#6b6f78', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 16 }}>
              A runtime error stopped the page from rendering. Check the browser console
              (Cmd+Option+J) for details, or try refreshing.
            </p>
            <pre
              style={{
                background: '#0f111a',
                color: '#90b7ff',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: '11px',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: 16,
              }}
            >
              {String(this.state.error.message || this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg,#2266ED,#3b7af8)',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                padding: '12px 28px',
                fontFamily: "'Fraunces', serif",
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 24px rgba(34,102,237,.38)',
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
