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
const replitUrl = 'https://your-actual-replit-url.repl.co';
```

3. Run the mobile app:
```bash
npx expo start
```

## Features

- Native mobile wrapper for TriPlace web app
- Integrated GPS location services
- Touch-optimized interface
- iOS and Android support
- Automatic removal of desktop-specific UI elements

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