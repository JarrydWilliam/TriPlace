# Fix Expo Connection Error: "Could not connect to server"

## The Problem
Your phone shows `exp://127.0.0.1:8081` which is localhost - your phone can't reach this address.

## Quick Solutions (Try in Order)

### Solution 1: Use Tunnel Mode
```bash
cd mobile
npx expo start --tunnel
```
This creates a public URL that works from anywhere.

### Solution 2: Use LAN Mode  
```bash
cd mobile
npx expo start --lan
```
This uses your network IP instead of localhost.

### Solution 3: Manual IP Configuration
1. Find your computer's IP address:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`
2. Start Expo: `npx expo start --host YOUR_IP_ADDRESS`

### Solution 4: Use the Fixed Script
```bash
cd mobile
node expo-network-fix.js
```

## Network Requirements
- Phone and computer must be on same WiFi network
- Firewall should allow connections on port 8081
- Some corporate networks block these connections

## Alternative: Direct URL Entry
If QR code fails:
1. Open Expo Go app
2. Tap "Enter URL manually"
3. Enter the exp:// URL shown in terminal (but with correct IP)

## Testing Steps
1. Run one of the solutions above
2. Look for QR code and exp:// URL in terminal
3. Scan QR code with Expo Go app
4. App should load TriPlace in mobile wrapper