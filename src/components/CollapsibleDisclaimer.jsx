import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

const CollapsibleDisclaimer = ({ position = 'bottom' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const disclaimerText = (
    <>
      <strong>Note:</strong> Foundly is a student hobby project created for organizational purposes only. 
      This is a one-person team working on this as a side project - I'm not a professional developer! 
      While I try my best, this app may have bugs or imperfections. By using Foundly, you acknowledge 
      that it's a student project and agree not to hold me liable for any issues or data loss. 
      This is meant for fun organizational use, not critical business operations. Thanks for understanding! 🎓
    </>
  );

  if (position === 'inline') {
    return (
      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: 'rgba(249, 250, 251, 0.8)',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#6b7280',
            fontSize: '11px',
            fontWeight: '600',
            fontFamily: 'Poppins, sans-serif',
            width: '100%',
            justifyContent: 'center',
            padding: '0'
          }}
        >
          <Info size={12} />
          Student Project Disclaimer
          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        
        {isOpen && (
          <p style={{
            fontSize: '11px',
            color: '#6b7280',
            lineHeight: '1.4',
            fontFamily: 'Poppins, sans-serif',
            margin: '10px 0 0 0',
            textAlign: 'center'
          }}>
            {disclaimerText}
          </p>
        )}
      </div>
    );
  }

  // Fixed bottom position
  return (
    <div style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderTop: '1px solid #e5e7eb',
      padding: '10px 20px',
      textAlign: 'center',
      zIndex: 100
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#6b7280',
          fontSize: '11px',
          fontWeight: '600',
          fontFamily: 'Poppins, sans-serif',
          margin: '0 auto',
          padding: '5px 10px',
          borderRadius: '6px',
          transition: 'background-color 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
        }}
      >
        <Info size={12} />
        Student Project Disclaimer
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      
      {isOpen && (
        <p style={{
          fontSize: '11px',
          color: '#6b7280',
          lineHeight: '1.4',
          fontFamily: 'Poppins, sans-serif',
          margin: '10px auto 0',
          maxWidth: '600px'
        }}>
          {disclaimerText}
        </p>
      )}
    </div>
  );
};

export default CollapsibleDisclaimer; 