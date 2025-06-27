# TriPlace Mobile Testing Walkthrough

## Step 1: Get Your Deployment URL

After clicking Deploy in Replit, you'll get a URL like:
- `https://triplace.replit.app` 
- `https://your-project-name.replit.app`

Copy this URL - you'll need it for Step 4.

## Step 2: Install Expo CLI

Open your terminal and run:
```bash
npm install -g @expo/cli
```

Verify installation:
```bash
expo --version
```

## Step 3: Setup Mobile Dependencies

Navigate to the mobile folder:
```bash
cd mobile
npm install
```

This installs all React Native dependencies for the mobile wrapper.

## Step 4: Update WebView URL

Edit `mobile/App.js` line 17:

**Change this:**
```javascript
const replitUrl = 'https://your-replit-app.repl.co';
```

**To your actual deployment URL:**
```javascript
const replitUrl = 'https://triplace.replit.app'; // Your actual URL
```

## Step 5: Start Mobile Development Server

In the mobile folder, run:
```bash
npx expo start
```

You'll see:
- QR code in terminal
- Development server URL
- Options to press 'i' (iOS) or 'a' (Android)

## Step 6: Test on Your Phone

1. **Install Expo Go app:**
   - iOS: Download from App Store
   - Android: Download from Google Play

2. **Connect to your mobile app:**
   - Open Expo Go on your phone
   - Scan the QR code from your terminal
   - Or manually enter the development server URL

3. **Test the mobile experience:**
   - Your TriPlace web app loads in native wrapper
   - Native location permissions prompt
   - Touch-optimized mobile interface
   - All TriPlace features work in mobile shell

## Step 7: Production Build (When Ready)

For app store deployment:

**iOS:**
```bash
npx expo build:ios --type app-store
```

**Android:**
```bash
npx expo build:android --type app-bundle
```

## Troubleshooting

**QR Code not working?**
- Ensure phone and computer are on same WiFi
- Try typing the development URL manually in Expo Go

**App not loading?**
- Verify your deployment URL is correct in App.js
- Check that your Replit app is deployed and accessible

**Location not working?**
- Accept location permissions when prompted
- Mobile app uses native GPS instead of browser location