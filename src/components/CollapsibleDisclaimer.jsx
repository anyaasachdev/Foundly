import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const defaultDisclaimer = (
  <>
    <strong>Note:</strong> Foundly is a student hobby project created for organizational purposes only. 
    This is a one-person team working on this as a side project - I'm not a professional developer! 
    While I try my best, this app may have bugs or imperfections. By using Foundly, you acknowledge 
    that it's a student project and agree not to hold me liable for any issues or data loss. 
    This is meant for fun organizational use, not critical business operations. Thanks for understanding! 🎓
  </>
);

const CollapsibleDisclaimer = ({ title = 'Student Project Disclaimer', children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className="collapsible-disclaimer-fixed"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'rgba(255,255,255,0.97)',
        borderTop: '1px solid #e5e7eb',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.04)',
        padding: isOpen ? '18px 32px 18px 24px' : '8px 32px 8px 24px',
        minHeight: isOpen ? 60 : 36,
        display: 'flex',
        alignItems: isOpen ? 'flex-start' : 'center',
        justifyContent: 'center',
        transition: 'padding 0.2s, min-height 0.2s',
        fontFamily: 'Poppins, sans-serif',
        fontSize: 14,
        color: '#6b7280',
        width: '100%',
        maxWidth: '100vw',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center', width: '100%' }}>
        <AlertCircle size={18} style={{ color: '#f59e42', marginRight: 8, flexShrink: 0 }} />
        <span style={{ fontWeight: 600, color: '#1F2937', marginRight: 8 }}>{title}</span>
        {isOpen && (
          <span style={{ marginLeft: 8, color: '#6b7280', fontWeight: 400 }}>
            {children || defaultDisclaimer}
          </span>
        )}
      </div>
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Collapse disclaimer' : 'Expand disclaimer'}
        style={{
          position: 'absolute',
          top: 8,
          right: 16,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#6b7280',
          padding: 4,
          zIndex: 10000,
        }}
      >
        {isOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
      </button>
    </div>
  );
};

export default CollapsibleDisclaimer; 