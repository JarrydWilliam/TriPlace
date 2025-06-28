# TriPlace Mobile App Setup Guide

## Overview
This guide will help you create iOS and Android mobile apps using Expo and React Native WebView that wrap your deployed TriPlace web application.

## Prerequisites
1. Node.js (v16 or higher)
2. Expo CLI: `npm install -g @expo/cli`
3. EAS CLI: `npm install -g eas-cli`
4. Expo account (free): https://expo.dev/signup

## Quick Start

### 1. Initialize Mobile Project
```bash
# Create new directory for mobile app
mkdir triplace-mobile
cd triplace-mobile

# Copy the mobile app files from this project
cp ../app.json .
cp ../App.js .
cp ../babel.config.js .
cp ../eas.json .

# Initialize Expo project
expo init --template blank
npm install react-native-webview expo-constants expo-linking expo-splash-screen
```

### 2. Update Web App URL
Edit `App.js` and replace the placeholder URL with your deployed Replit app URL:
```javascript
const WEB_APP_URL = 'https://your-actual-replit-app-url.replit.app';
```

### 3. Development Testing
```bash
# Start development server
expo start

# Test on physical device with Expo Go app
# Scan QR code with your phone camera

# Test on simulator
expo start --ios    # iOS simulator
expo start --android # Android emulator
```

## Building for Distribution

### iOS App Store

1. **Apple Developer Account Required** ($99/year)
2. **Configure iOS settings** in `app.json`:
   ```json
   "ios": {
     "bundleIdentifier": "com.yourcompany.triplace",
     "buildNumber": "1"
   }
   ```

3. **Build and submit**:
   ```bash
   eas build --platform ios
   eas submit --platform ios
   ```

### Google Play Store

1. **Google Play Developer Account** ($25 one-time fee)
2. **Configure Android settings** in `app.json`:
   ```json
   "android": {
     "package": "com.yourcompany.triplace",
     "versionCode": 1
   }
   ```

3. **Build and submit**:
   ```bash
   eas build --platform android
   eas submit --platform android
   ```

## App Icons and Assets

Create these image files in an `assets` folder:
- `icon.png` (1024x1024px) - App icon
- `adaptive-icon.png` (1024x1024px) - Android adaptive icon
- `splash.png` (1242x2436px) - Splash screen
- `favicon.png` (48x48px) - Web favicon

You can use your existing TriPlace logo and brand colors.

## Features Included

✓ **Native wrapper** for your web app
✓ **Splash screen** with TriPlace branding
✓ **Hardware back button** support (Android)
✓ **Pull-to-refresh** functionality
✓ **Safe area** handling for notched devices
✓ **Error handling** with retry options
✓ **Mobile optimizations** injected via JavaScript

## App Store Listing

### App Name
"TriPlace - Digital Third Place"

### Description
Connect through shared experiences in your digital third place. TriPlace uses AI and location technology to help you discover meaningful communities, attend local events, and build lasting relationships.

### Keywords
community, social, events, local, AI matching, third place, connections

### Categories
- iOS: Social Networking
- Android: Social

## Distribution Timeline

1. **Development**: 1-2 days (setup and testing)
2. **App Store Review**: 1-7 days (iOS), 1-3 days (Android)
3. **Total Launch Time**: 2-10 days from start

## Cost Breakdown

- **Apple Developer**: $99/year
- **Google Play**: $25 one-time
- **Expo EAS**: Free tier available, $29/month for advanced features
- **Total**: $124-472/year depending on needs

## Next Steps

1. Get your web app deployed on Replit
2. Copy the deployment URL
3. Follow this guide to create mobile apps
4. Submit to app stores
5. Launch your mobile presence

Your users will be able to download TriPlace from both app stores and get the full native mobile experience while using your existing web application infrastructure.