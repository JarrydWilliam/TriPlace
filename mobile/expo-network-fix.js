#!/usr/bin/env node

const { execSync } = require('child_process');
const os = require('os');

console.log('Fixing Expo Network Connection Issue...\n');

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
console.log(`Local IP detected: ${localIP}`);

console.log('\nStarting Expo with proper network configuration...');
console.log('This will make the server accessible to your phone.\n');

console.log('Connection options for your phone:');
console.log('1. Scan the QR code (recommended)');
console.log('2. Use tunnel mode for public access');
console.log('3. Ensure phone and computer are on same WiFi network\n');

try {
  // Start with LAN mode first, fallback to tunnel if needed
  execSync('npx expo start --lan', { 
    stdio: 'inherit', 
    cwd: __dirname,
    env: { ...process.env, EXPO_DEVTOOLS_LISTEN_ADDRESS: '0.0.0.0' }
  });
} catch (error) {
  console.log('\nLAN mode failed, trying tunnel mode...');
  try {
    execSync('npx expo start --tunnel', { stdio: 'inherit', cwd: __dirname });
  } catch (tunnelError) {
    console.log('\nBoth connection modes failed. Troubleshooting:');
    console.log('1. Ensure you are connected to WiFi');
    console.log('2. Try: npx expo start --localhost');
    console.log('3. Check firewall settings');
  }
}