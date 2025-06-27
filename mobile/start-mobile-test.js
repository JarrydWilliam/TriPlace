#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('TriPlace Mobile App Testing Setup');
console.log('=================================\n');

// Step 1: Check if Expo CLI is installed
console.log('1. Checking Expo CLI installation...');
try {
  const version = execSync('expo --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Expo CLI found: ${version}`);
} catch (error) {
  console.log('❌ Expo CLI not found. Installing...');
  try {
    execSync('npm install -g @expo/cli', { stdio: 'inherit' });
    console.log('✅ Expo CLI installed successfully');
  } catch (installError) {
    console.log('❌ Failed to install Expo CLI. Please run: npm install -g @expo/cli');
    process.exit(1);
  }
}

// Step 2: Install dependencies
console.log('\n2. Installing mobile app dependencies...');
try {
  execSync('npm install', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.log('❌ Failed to install dependencies');
  process.exit(1);
}

// Step 3: Ask for deployment URL
rl.question('\n3. Enter your deployed Replit URL (e.g., https://triplace.replit.app): ', (url) => {
  if (!url || !url.startsWith('https://')) {
    console.log('❌ Please provide a valid HTTPS URL');
    rl.close();
    process.exit(1);
  }

  // Step 4: Update App.js with the URL
  console.log('\n4. Updating mobile app configuration...');
  const appJsPath = './App.js';
  let appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  // Replace the placeholder URL
  appJsContent = appJsContent.replace(
    /const replitUrl = '[^']*';/,
    `const replitUrl = '${url}';`
  );
  
  fs.writeFileSync(appJsPath, appJsContent);
  console.log(`✅ Mobile app configured with URL: ${url}`);

  // Step 5: Start Expo development server
  console.log('\n5. Starting Expo development server...');
  console.log('\nInstructions:');
  console.log('- Install "Expo Go" app on your phone');
  console.log('- Scan the QR code that appears');
  console.log('- Your TriPlace app will load in native mobile wrapper');
  console.log('\nPress Ctrl+C to stop the server\n');

  rl.close();
  
  try {
    execSync('npx expo start --tunnel', { stdio: 'inherit', cwd: __dirname });
  } catch (error) {
    console.log('\n❌ Expo server stopped');
  }
});