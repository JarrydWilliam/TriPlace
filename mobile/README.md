# TriPlace Mobile App

## Overview
Native React Native app using Expo WebView to provide full TriPlace functionality with enhanced mobile features.

## Features
- 100% web app functionality via WebView
- Native location services with high accuracy GPS
- Push notifications for community updates and events
- Secure storage for authentication data
- Deep linking support (triplace://)
- Enhanced mobile UI with touch optimizations
- PWA prompt removal for native app experience

## Prerequisites
- Node.js 16+ 
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator or Android Emulator
- Physical device for testing location services

## Installation

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Start development server:
```bash
npx expo start
```

3. Run on device:
- iOS: Press `i` or scan QR code with Expo Go
- Android: Press `a` or scan QR code with Expo Go

## Building for Production

### Android
```bash
npx expo build:android
```

### iOS
```bash
npx expo build:ios
```

## Configuration

### Firebase Setup
1. Add iOS/Android apps in Firebase Console
2. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
3. Place files in project root

### Environment Variables
The app connects to: `https://TriPlaceApp.replit.app`

## App Store Deployment

### iOS App Store
1. Build IPA: `npx expo build:ios`
2. Upload to TestFlight via Xcode or Application Loader
3. Submit for App Store review

### Google Play Store
1. Build APK/AAB: `npx expo build:android`
2. Upload to Google Play Console
3. Complete store listing and submit for review

## Features Integration

### Location Services
- Automatic location detection
- Fallback to web geolocation API
- Permission handling with user prompts

### Push Notifications
- Expo push notifications
- Community activity alerts
- Event reminders
- Custom notification channels

### Deep Linking
- `triplace://community/[id]` - Open specific community
- `triplace://event/[id]` - Open specific event
- `triplace://profile/[id]` - Open user profile

### Secure Storage
- Encrypted storage for sensitive data
- Authentication tokens
- User preferences

## Performance
- WebView caching enabled
- Optimized for 60fps scrolling
- Native navigation gestures
- Touch target optimization (44px minimum)

## Debugging
```bash
npx expo start --tunnel  # For testing on physical devices
npx expo doctor         # Check for common issues
```

## Permissions
- Location (foreground/background)
- Camera (profile photos)
- Photo library (image selection)
- Notifications (push alerts)
- Internet access