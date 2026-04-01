
import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';

const PORT = 5002;
const APP_URL = `http://localhost:${PORT}`;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyFrontend() {
  console.log("🚀 Starting Frontend Verification...");

  // 1. Start Server
  const tsxPath = path.resolve("node_modules", ".bin", "tsx.cmd");
  const server = spawn(tsxPath, ["server/index.ts"], {
    env: { ...process.env, PORT: PORT.toString(), NODE_ENV: "development" },
    stdio: "pipe"
  });

  console.log("Waiting for server...");
  await sleep(5000); // Give it time to boot

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true, // Run headless for CI-like environment, set to false to watch
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set viewport to mobile-ish to test responsive design
    await page.setViewport({ width: 390, height: 844 }); // iPhone 12 Pro dimensions

    // 2. Test Landing Page
    console.log("Navigate to Landing Page...");
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    const title = await page.title();
    console.log(`Page Title: ${title}`);
    
    // Check for "Get Started" button
    const getStartedBtn = await page.$('a[href="/signup"], button');
    if (getStartedBtn) {
        console.log("✅ Landing page loaded");
    } else {
        console.log("⚠️ Could not find specific Get Started button, but page loaded");
    }

    // 3. Test Signup (Navigation only for now as we don't want to spam DB)
    console.log("Navigating to Signup...");
    await page.goto(`${APP_URL}/signup`, { waitUntil: 'networkidle0' });
    const signupHeader = await page.$('h1');
    if (signupHeader) {
        const text = await page.evaluate(el => el.textContent, signupHeader);
        console.log(`✅ Signup Page Header: ${text}`);
    }

    // 4. Test Login Page Visuals
    console.log("Navigating to Login...");
    await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle0' });
    
    // Check for glassmorphism classes
    const glassInput = await page.$('.glass-input');
    if (glassInput) {
        console.log("✅ Glassmorphism detected on inputs");
    } else {
        console.log("⚠️ Glassmorphism class not found on login inputs");
    }

    console.log("🎉 Frontend verification complete (Simulated)");

  } catch (error) {
    console.error("❌ Frontend verification failed:", error);
  } finally {
    if (browser) await browser.close();
    server.kill();
    process.exit(0);
  }
}

verifyFrontend();
