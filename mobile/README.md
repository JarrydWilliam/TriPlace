# TriPlace Mobile App

This is the native mobile wrapper for TriPlace using Expo and React Native WebView.

## Setup Instructions

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Update the Replit URL in `App.js`:
```javascript
const replitUrl = 'https://TriPlaceApp.replit.app';
```

3. Run the mobile app:
```bash
npx expo start
```

## Features

- Native mobile wrapper for TriPlace web app
- Integrated GPS location services with high accuracy
- Touch-optimized interface with 44px minimum touch targets
- iOS and Android support via Expo
- Automatic removal of desktop-specific UI elements
- Enhanced Firebase authentication for mobile devices
- Native location override for improved geolocation
- PWA install prompts hidden in native app context

## Firebase Configuration

The mobile app uses the same Firebase configuration as the web app. Make sure your Firebase project has:

1. iOS app configured (for iOS deployment)
2. Android app configured (for Android deployment)
3. Web app configured (current setup)

## Deployment

Use Expo Application Services (EAS) for building and deploying:

1. Install EAS CLI: `npm install -g @expo/eas-cli`
2. Configure: `eas build:configure`
3. Build: `eas build --platform all`
4. Submit: `eas submit --platform all`