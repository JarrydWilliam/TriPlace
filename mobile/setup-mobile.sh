#!/bin/bash

echo "Setting up TriPlace Mobile App..."

# Install Expo CLI if not already installed
if ! command -v expo &> /dev/null; then
    echo "Installing Expo CLI..."
    npm install -g @expo/cli
fi

# Install dependencies
echo "Installing mobile app dependencies..."
npm install

# Start the Expo development server
echo "Starting Expo development server..."
echo "Scan the QR code with Expo Go app to test on your device"
npx expo start

# Instructions
echo ""
echo "Mobile App Setup Complete!"
echo ""
echo "To test the mobile app:"
echo "1. Install 'Expo Go' app on your iOS/Android device"
echo "2. Scan the QR code that appears"
echo "3. The app will load TriPlace in a native mobile wrapper"
echo ""
echo "For production builds:"
echo "- iOS: npx expo build:ios --type app-store"
echo "- Android: npx expo build:android --type app-bundle"