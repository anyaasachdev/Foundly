#!/usr/bin/env node

console.log('🔍 Debug: Blank Page Issue\n');

// Check if React development server is running
const http = require('http');

function checkServer(url, name) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      console.log(`✅ ${name} is running (${res.statusCode})`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${name} is not running: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(3000, () => {
      console.log(`⏰ ${name} timeout`);
      req.destroy();
      resolve(false);
    });
  });
}

async function runChecks() {
  console.log('1. Checking servers...');
  
  const frontendRunning = await checkServer('http://localhost:3000', 'Frontend (React)');
  const backendRunning = await checkServer('http://localhost:3001/api/health', 'Backend (API)');
  
  console.log('\n2. Common causes of blank pages:');
  console.log('   - JavaScript errors in browser console');
  console.log('   - CSS conflicts hiding content');
  console.log('   - React app not mounting properly');
  console.log('   - Network errors preventing API calls');
  console.log('   - Authentication issues');
  
  console.log('\n3. Debugging steps:');
  console.log('   a) Open browser developer tools (F12)');
  console.log('   b) Check Console tab for JavaScript errors');
  console.log('   c) Check Network tab for failed requests');
  console.log('   d) Check Elements tab to see if React rendered');
  console.log('   e) Try visiting http://localhost:3000/test');
  
  console.log('\n4. Quick fixes to try:');
  console.log('   - Clear browser cache and localStorage');
  console.log('   - Try incognito/private browsing mode');
  console.log('   - Check if any browser extensions are interfering');
  console.log('   - Try a different browser');
  
  if (!frontendRunning) {
    console.log('\n❌ Frontend server not running. Start it with: npm start');
  }
  
  if (!backendRunning) {
    console.log('\n❌ Backend server not running. Start it with: cd backend && npm start');
  }
  
  if (frontendRunning && backendRunning) {
    console.log('\n✅ Both servers are running. The issue is likely in the browser.');
    console.log('   Check the browser console for errors.');
  }
}

runChecks().catch(console.error); 