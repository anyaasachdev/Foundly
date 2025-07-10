#!/usr/bin/env node

// Verification script for Vercel Analytics setup
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Vercel Analytics Setup\n');

// 1. Check if package is installed
console.log('1. Checking package installation...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const analyticsVersion = packageJson.dependencies['@vercel/analytics'];
  
  if (analyticsVersion) {
    console.log('✅ @vercel/analytics installed:', analyticsVersion);
  } else {
    console.log('❌ @vercel/analytics not found in dependencies');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
  process.exit(1);
}

// 2. Check if Analytics is imported in App.jsx
console.log('\n2. Checking App.jsx import...');
try {
  const appContent = fs.readFileSync('src/App.jsx', 'utf8');
  
  if (appContent.includes("import { Analytics } from '@vercel/analytics/react'")) {
    console.log('✅ Analytics imported correctly in App.jsx');
  } else {
    console.log('❌ Analytics import not found in App.jsx');
    process.exit(1);
  }
  
  // 3. Check if Analytics component is used
  console.log('\n3. Checking Analytics component usage...');
  if (appContent.includes('<Analytics />')) {
    console.log('✅ Analytics component is used in App.jsx');
  } else {
    console.log('❌ Analytics component not found in App.jsx');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error reading App.jsx:', error.message);
  process.exit(1);
}

// 4. Check if build folder exists (indicates successful build)
console.log('\n4. Checking build status...');
if (fs.existsSync('build')) {
  console.log('✅ Build folder exists - app builds successfully');
} else {
  console.log('⚠️  Build folder not found - run "npm run build" to test');
}

console.log('\n🎉 Vercel Analytics Setup Verification Complete!\n');

console.log('📊 What happens next:');
console.log('1. Deploy your app to Vercel');
console.log('2. Visit your deployed site');
console.log('3. Check Vercel dashboard > Analytics tab');
console.log('4. Data should appear within 30 seconds');

console.log('\n💡 Tips:');
console.log('- Analytics only works on deployed sites (not localhost)');
console.log('- Navigate between pages to generate more data');
console.log('- Check for ad blockers if data doesn\'t appear');
console.log('- Analytics respects user privacy preferences');

console.log('\n🔗 Useful links:');
console.log('- Vercel Analytics Docs: https://vercel.com/docs/analytics');
console.log('- Your Vercel Dashboard: https://vercel.com/dashboard');
console.log('- Analytics Privacy: https://vercel.com/docs/analytics/privacy-policy');
