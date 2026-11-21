#!/bin/bash

echo "🚀 Starting deployment process for Paisa-Bharo..."

# Check if we are in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Pull latest changes from GitHub
echo "🔄 Pulling latest changes from GitHub..."
git fetch origin
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci || npm install

# Build the project
echo "🏗️  Building the project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."
firebase deploy --only hosting,functions

# Check deployment status
if [ $? -eq 0 ]; then
    echo "🎉 Deployment successful!"
    echo "✅ Your changes are now live on Firebase Hosting!"
else
    echo "❌ Firebase deployment failed!"
    exit 1
fi

echo "🏁 Deployment process completed!"
