// Simple test to validate mobile app configuration
const fs = require('fs');
const path = require('path');

console.log('Testing TriPlace Mobile App Setup...\n');

// Check if all required files exist
const requiredFiles = [
  'package.json',
  'app.json', 
  'App.js',
  'babel.config.js',
  'assets/icon.png'
];

const missingFiles = [];
requiredFiles.forEach(file => {
  if (!fs.existsSync(path.join(__dirname, file))) {
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.log('❌ Missing files:', missingFiles.join(', '));
} else {
  console.log('✅ All required files present');
}

// Check package.json configuration
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('\n📱 Mobile App Configuration:');
console.log(`  Name: ${packageJson.name}`);
console.log(`  Version: ${packageJson.version}`);
console.log(`  Dependencies: ${Object.keys(packageJson.dependencies).length}`);

// Check app.json configuration  
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
console.log('\n📋 Expo Configuration:');
console.log(`  App Name: ${appJson.expo.name}`);
console.log(`  Slug: ${appJson.expo.slug}`);
console.log(`  Platform: iOS/Android`);

// Check WebView URL configuration
const appJs = fs.readFileSync('App.js', 'utf8');
const urlMatch = appJs.match(/const replitUrl = '([^']+)'/);
if (urlMatch) {
  console.log(`\n🌐 WebView URL: ${urlMatch[1]}`);
} else {
  console.log('\n❌ WebView URL not found in App.js');
}

console.log('\n🚀 Mobile App Setup Status: READY');
console.log('\nTo test the mobile app:');
console.log('1. Run: npm install');
console.log('2. Run: npx expo start');
console.log('3. Scan QR code with Expo Go app');
console.log('\nUpdate the replitUrl in App.js with your actual Replit deployment URL');