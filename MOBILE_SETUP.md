# TriPlace Mobile App Setup Guide

## Quick Start - React Native WebView Wrapper

### Prerequisites
- Node.js 18+ installed
- Expo CLI: `npm install -g @expo/cli`
- For iOS: Xcode (Mac only)
- For Android: Android Studio

### Setup Instructions

1. **Navigate to the mobile directory:**
```bash
cd mobile
```

2. **Install dependencies:**
```bash
npm install
```

3. **Update the app URL:**
Edit `mobile/App.tsx` and replace `'https://your-replit-url.repl.co'` with your actual Replit deployment URL.

4. **Start the development server:**
```bash
npx expo start
```

5. **Run on device/simulator:**
- For iOS: Press `i` in the terminal or scan QR code with Camera app
- For Android: Press `a` in the terminal or scan QR code with Expo Go app
- For web preview: Press `w` in the terminal

### Building for Production

#### iOS App Store
```bash
npx expo build:ios --type app-store
```

#### Google Play Store
```bash
npx expo build:android --type app-bundle
```

### Features Included
- Native shell wrapper around TriPlace web app
- Mobile-optimized touch interactions
- Proper viewport scaling and touch targets
- Enhanced scrolling performance
- Native status bar integration
- Offline error handling
- Deep linking support (triplace://)

### Configuration Files
- `app.json` - Expo app configuration
- `App.tsx` - Main React Native component with WebView
- `package.json` - Dependencies and scripts
- `babel.config.js` - Babel configuration for Expo

### Bundle Identifiers
- iOS: `com.triplace.app`
- Android: `com.triplace.app`

Update these in `app.json` if you need different bundle IDs for your organization.

### Next Steps
1. Test the app thoroughly on both iOS and Android
2. Update app icons and splash screens in the `assets` folder
3. Configure push notifications if needed
4. Submit to app stores following their guidelines

## Alternative: Full React Native Conversion

For a fully native experience, consider rebuilding key components:
- Authentication screens
- Community listing
- Event calendar
- Messaging interface
- Profile management

This approach provides better performance but requires significantly more development time.