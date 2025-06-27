# Quick Start Guide - TriPlace Mobile App

## What This Is
The `/mobile` folder contains a standalone React Native app that wraps your web app in a native mobile shell with enhanced features.

## How It Works
- **Web App**: Runs at TriPlaceApp.replit.app (your current web interface)
- **Mobile App**: Native app that loads the web app inside a WebView with additional mobile features

## Getting Started

### 1. Install Expo CLI
```bash
npm install -g expo-cli
```

### 2. Navigate to Mobile Folder
```bash
cd mobile
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Development Server
```bash
npx expo start
```

### 5. Test on Device
- **iOS**: Press `i` to open iOS simulator or scan QR code with Expo Go app
- **Android**: Press `a` to open Android emulator or scan QR code with Expo Go app
- **Physical Device**: Install Expo Go from app store and scan QR code

## What You'll See
- Your exact web app but in a native mobile wrapper
- Enhanced GPS location services
- Push notifications capability
- Native mobile gestures and navigation
- Optimized touch interface

## Architecture
```
Web App (TriPlaceApp.replit.app)
    ↓
Mobile App (React Native WebView)
    ↓
iOS/Android Native Features
```

The mobile app connects to your existing web backend - no separate mobile backend needed.

## Current Status
- Mobile app is ready to run
- Web app continues working normally
- Both share the same backend and database
- No redeployment needed for web app

## Next Steps
1. Run `cd mobile && npx expo start` to test
2. Add app icons to `/mobile/assets/`
3. Build for app stores when ready