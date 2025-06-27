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

### Core TriPlace Functionality
- Complete web app feature parity via native WebView wrapper
- AI-powered community matching and recommendations
- Real-time messaging with community chat features
- Event discovery and attendance tracking
- Location-aware community and event filtering
- User onboarding with comprehensive 15-question quiz
- Dynamic community membership with activity-based rotation
- Kudos system and weekly challenges
- Profile management and settings

### Native Mobile Enhancements  
- High-accuracy GPS location services with background updates
- Push notifications for community updates and event reminders
- Secure storage for sensitive user data
- Deep linking support for community and event sharing
- Native sharing capabilities
- Touch-optimized interface (44px minimum touch targets)
- Automatic desktop parameter removal and mobile CSS injection
- Enhanced Firebase authentication with mobile-specific error handling
- App state management with foreground/background detection
- Native camera and photo library integration ready
- Contact access for friend discovery (when permissions granted)

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