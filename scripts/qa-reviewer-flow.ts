import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const SCREENS_DIR = path.join(process.cwd(), 'screenshots');

async function run() {
  if (!fs.existsSync(SCREENS_DIR)) {
    fs.mkdirSync(SCREENS_DIR);
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  
  // Emulate iPhone 13 Pro
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1');

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
    }
  });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));

  try {
    console.log('Navigating to local server...');
    await page.goto('http://localhost:5005', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SCREENS_DIR, '01_landing.png') });

    console.log('Clicking Log In to go to /login...');
    const landingBtns = await page.$$('button');
    for (const btn of landingBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.toLowerCase().includes('log in')) {
        await btn.click();
        break;
      }
    }
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});

    console.log('Attempting login...');
    // Assuming the login page has email and password inputs
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'samevibe.review@gmail.com');
    await page.type('input[type="password"]', 'SameVibe2024!');
    
    // Find the login button and click it
    const buttons = await page.$$('button');
    let loginBtn;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.toLowerCase().includes('login')) {
        loginBtn = btn;
        break;
      }
    }
    if (loginBtn) {
      await loginBtn.click();
    } else {
      // Try form submit
      await page.keyboard.press('Enter');
    }

    console.log('Waiting for dashboard...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SCREENS_DIR, '02_dashboard.png') });

    console.log('Clicking a community card...');
    // In discover or dashboard, communities are usually rendered inside an element containing 'Discover' or similar
    // We'll click the first image or card that looks like a community.
    const cards = await page.$$('.rounded-3xl, .rounded-xl'); 
    if (cards.length > 0) {
       await cards[2].click().catch(() => {}); // Skip top nav elements
    }
    
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SCREENS_DIR, '03_community.png') });

    console.log('Attempting to join...');
    const actionBtns = await page.$$('button');
    for (const btn of actionBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.toLowerCase().includes('join community')) {
        await btn.click();
        break;
      }
    }
    
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SCREENS_DIR, '04_rotation_modal.png') });
    
    console.log('Checking for modal confirm...');
    const modalBtns = await page.$$('button');
    for (const btn of modalBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.toLowerCase().includes('replace and join')) {
        await btn.click();
        break;
      }
    }

    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(SCREENS_DIR, '05_after_join.png') });

    console.log('Navigating to profile...');
    const navs = await page.$$('button');
    for (const btn of navs) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Profile') || text.includes('Settings'))) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SCREENS_DIR, '06_profile.png') });

    console.log('Done.');

  } catch (err) {
    console.error('Error during flow:', err);
    await page.screenshot({ path: path.join(SCREENS_DIR, 'error_state.png') });
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
