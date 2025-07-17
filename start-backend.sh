#!/bin/bash

echo "🚀 Starting Foundly Backend Server..."

# Navigate to backend directory
cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found in backend directory"
    echo "Please create a .env file with the following variables:"
    echo "MONGODB_URI=your_mongodb_connection_string"
    echo "JWT_SECRET=your_jwt_secret"
    echo "JWT_REFRESH_SECRET=your_jwt_refresh_secret"
fi

# Start the server
echo "🌐 Starting server on http://localhost:3001"
npm start 