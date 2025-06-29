import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

const ToastNotification = () => {
  const { toasts, removeToast } = useNotifications();

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getToastColors = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: '#10B981',
          border: '#059669',
          icon: '#FFFFFF'
        };
      case 'error':
        return {
          bg: '#EF4444',
          border: '#DC2626',
          icon: '#FFFFFF'
        };
      case 'warning':
        return {
          bg: '#F59E0B',
          border: '#D97706',
          icon: '#FFFFFF'
        };
      case 'info':
      default:
        return {
          bg: '#3B82F6',
          border: '#2563EB',
          icon: '#FFFFFF'
        };
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '400px'
    }}>
      {toasts.map((toast) => {
        const colors = getToastColors(toast.type);
        
        return (
          <div
            key={toast.id}
            style={{
              background: 'white',
              borderLeft: `4px solid ${colors.bg}`,
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              animation: 'slideInRight 0.3s ease-out',
              border: '1px solid #E5E7EB'
            }}
          >
            <div style={{ color: colors.bg, marginTop: '2px' }}>
              {getToastIcon(toast.type)}
            </div>
            
            <div style={{ flex: 1 }}>
              <h4 style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1F2937',
                marginBottom: '4px'
              }}>
                {toast.title}
              </h4>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280',
                lineHeight: '1.4',
                margin: 0
              }}>
                {toast.message}
              </p>
            </div>
            
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9CA3AF',
                padding: '2px'
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ToastNotification;