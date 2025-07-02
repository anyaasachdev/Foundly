import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';

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
    <div className="collapsible-disclaimer" style={{ margin: '0 auto', maxWidth: 700 }}>
      <button 
        className="disclaimer-header"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 16, color: '#1F2937', margin: '0 auto', padding: 0
        }}
      >
        <AlertCircle size={18} style={{ color: '#f59e42' }} />
        <span>{title}</span>
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {isOpen && (
        <div className="disclaimer-content" style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          marginTop: 10,
          padding: 16,
          color: '#6b7280',
          fontSize: 14,
          fontFamily: 'Poppins, sans-serif',
          textAlign: 'left'
        }}>
          {children || defaultDisclaimer}
        </div>
      )}
    </div>
  );
};

export default CollapsibleDisclaimer; 