import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorDetails: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Extract more details about the error
    let errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      componentStack: errorInfo.componentStack
    };

    // Try to identify the specific issue
    if (error.message.includes('slice is not a function')) {
      errorDetails.type = 'SLICE_ERROR';
      errorDetails.suggestion = 'This is likely caused by trying to call .slice() on a non-array value. Check all .slice(), .charAt(), and .substring() calls.';
    } else if (error.message.includes('charAt is not a function')) {
      errorDetails.type = 'CHARAT_ERROR';
      errorDetails.suggestion = 'This is caused by trying to call .charAt() on a non-string value.';
    } else if (error.message.includes('substring is not a function')) {
      errorDetails.type = 'SUBSTRING_ERROR';
      errorDetails.suggestion = 'This is caused by trying to call .substring() on a non-string value.';
    }

    this.setState({
      error,
      errorInfo,
      errorDetails
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid #EF4444',
          borderRadius: '12px',
          background: '#FEF2F2',
          fontFamily: 'Poppins, sans-serif'
        }}>
          <h2 style={{ color: '#DC2626', marginBottom: '15px' }}>🚨 Something went wrong!</h2>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Error Details:</strong>
            <pre style={{
              background: '#FEE2E2',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '200px'
            }}>
              {this.state.error && `${this.state.error.name}: ${this.state.error.message}`}
            </pre>
          </div>

          {this.state.errorDetails && this.state.errorDetails.type && (
            <div style={{ marginBottom: '15px' }}>
              <strong>Error Type:</strong> {this.state.errorDetails.type}<br/>
              <strong>Suggestion:</strong> {this.state.errorDetails.suggestion}
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <strong>Error Stack:</strong>
            <pre style={{
              background: '#FEE2E2',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '10px',
              overflow: 'auto',
              maxHeight: '150px'
            }}>
              {this.state.error && this.state.error.stack}
            </pre>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <strong>Component Stack:</strong>
            <pre style={{
              background: '#FEE2E2',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '10px',
              overflow: 'auto',
              maxHeight: '150px'
            }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>

          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#DC2626',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
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