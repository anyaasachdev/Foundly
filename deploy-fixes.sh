#!/bin/bash

echo "🚀 Deploying Foundly fixes to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "npm install -g vercel"
    exit 1
fi

# Deploy backend first
echo "📦 Deploying backend..."
cd backend
vercel --prod --yes

# Deploy frontend
echo "📦 Deploying frontend..."
cd ..
vercel --prod --yes

echo "✅ Deployment complete!"
echo ""
echo "🔧 To fix organization data issues, you can:"
echo "1. Visit the debug page in your app"
echo "2. Click 'Fix Organizations' button"
echo "3. Check the debug info to verify the fixes"
echo ""
echo "📊 The following issues have been fixed:"
echo "- Dashboard member count now shows correct number from organization members array"
echo "- Calendar events can now be saved properly with improved date/time handling"
echo "- Hours logging has better validation and error handling"
echo "- Analytics and stats endpoints now use correct member counting"
echo "- Added debug utilities to help troubleshoot data inconsistencies" 