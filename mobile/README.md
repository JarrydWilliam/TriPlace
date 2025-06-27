# TriPlace Mobile App

This is the native mobile wrapper for TriPlace using React Native and Expo WebView.

## Setup Instructions

1. **Install Expo CLI globally:**
   ```bash
   npm install -g @expo/cli
   ```

2. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   ```

3. **Update the WebView URL:**
   Edit `App.js` and replace the `replitUrl` with your actual Replit deployment URL:
   ```javascript
   const replitUrl = 'https://your-actual-replit-url.repl.co';
   ```

4. **Start the development server:**
   ```bash
   npx expo start
   ```

5. **Run on device:**
   - Scan the QR code with Expo Go app (iOS/Android)
   - Or press 'i' for iOS simulator
   - Or press 'a' for Android emulator

## Features

- **Native Shell**: Wraps your web app in a native mobile container
- **Location Services**: Uses native GPS for accurate location detection
- **Touch Optimized**: Removes all desktop constraints and hover effects
- **Responsive Design**: Full viewport utilization for mobile devices
- **Firebase Integration**: Maintains existing authentication and backend
- **Offline Ready**: Caches web app for improved performance

## Building for Production

1. **Build the app:**
   ```bash
   npx expo build:android
   npx expo build:ios
   ```

2. **Create standalone app:**
   ```bash
   npx expo build:ios --type app-store
   npx expo build:android --type app-bundle
   ```

## Deployment

The app loads your TriPlace web application hosted on Replit inside a native WebView, providing:
- Native app store presence
- Better mobile performance
- Native location services
- Push notifications (can be added)
- Offline capabilities

Make sure your Replit web app is deployed and accessible before running the mobile app.