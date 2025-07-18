import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('🚀 React index.js starting...');

const rootElement = document.getElementById('root');
console.log('🔍 Root element found:', !!rootElement);

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    console.log('✅ React root created successfully');
    
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('✅ React app rendered successfully');
  } catch (error) {
    console.error('❌ Error rendering React app:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: Arial, sans-serif;">
        <h1>React Error</h1>
        <p>Failed to render React app: ${error.message}</p>
        <pre>${error.stack}</pre>
      </div>
    `;
  }
} else {
  console.error('❌ Root element not found!');
  document.body.innerHTML = `
    <div style="padding: 20px; color: red; font-family: Arial, sans-serif;">
      <h1>React Error</h1>
      <p>Root element with id "root" not found!</p>
    </div>
  `;
}