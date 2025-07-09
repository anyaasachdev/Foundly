import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          backgroundColor: '#fef2f2',
          fontFamily: 'monospace',
          fontSize: '14px'
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: '10px' }}>
            🚨 Something went wrong!
          </h2>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Error Details:</strong>
            <pre style={{ 
              background: '#f3f4f6', 
              padding: '10px', 
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '200px'
            }}>
              {this.state.error && this.state.error.toString()}
            </pre>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <strong>Error Stack:</strong>
            <pre style={{ 
              background: '#f3f4f6', 
              padding: '10px', 
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: '12px'
            }}>
              {this.state.error && this.state.error.stack}
            </pre>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <strong>Component Stack:</strong>
            <pre style={{ 
              background: '#f3f4f6', 
              padding: '10px', 
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: '12px'
            }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 