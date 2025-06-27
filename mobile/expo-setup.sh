#!/bin/bash

echo "TriPlace Mobile App Setup"
echo "========================"

# Check if Node.js is available
if ! command -v npm &> /dev/null; then
    echo "❌ Node.js/npm not found. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install Expo CLI globally
echo "Installing Expo CLI..."
npm install -g @expo/cli

# Check if installation was successful
if command -v expo &> /dev/null; then
    echo "✅ Expo CLI installed: $(expo --version)"
else
    echo "❌ Expo CLI installation failed"
    exit 1
fi

# Install project dependencies
echo "Installing mobile app dependencies..."
npm install

# Verify dependencies
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Dependency installation failed"
    exit 1
fi

echo ""
echo "🚀 Mobile app setup complete!"
echo ""
echo "Next steps:"
echo "1. Update the URL in App.js with your deployed Replit URL"
echo "2. Run: npx expo start"
echo "3. Install 'Expo Go' app on your phone"
echo "4. Scan the QR code to test the mobile app"