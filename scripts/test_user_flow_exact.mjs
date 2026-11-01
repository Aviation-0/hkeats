import puppeteer from 'puppeteer';
import path from 'node:path';

const extensionPath = path.resolve(process.cwd(), 'extension');

async function run() {
  console.log('Launching browser with extension...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--window-size=1600,900',
      '--lang=en-US',
    ],
  });

  // Find the background service worker target to intercept its console logs & network
  const targets = await browser.targets();
  const backgroundTarget = targets.find((t) => t.type() === 'service_worker');
  if (backgroundTarget) {
    const bg = await backgroundTarget.worker();
    bg.on('console', (msg) => console.log('SERVICE WORKER LOG:', msg.text()));
  }

  browser.on('targetcreated', async (target) => {
    if (target.type() === 'service_worker') {
      const bg = await target.worker();
      bg.on('console', (msg) => console.log('SERVICE WORKER LOG:', msg.text()));
    }
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });

  page.on('console', (msg) => {
    console.log('CONTENT SCRIPT LOG:', msg.text());
  });

  try {
    console.log('1. Navigating to Google Maps search for Sole Mio Italian Restaurant...');
    await page.goto('https://www.google.com/maps/search/Sole+Mio+Italian+Restaurant/@22.2818,114.1554,17z?hl=en', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 2000));

    // Handle consent
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const consentBtn = btns.find((b) => /accept all|agree/i.test(b.textContent));
      if (consentBtn) consentBtn.click();
    });
    await new Promise((r) => setTimeout(r, 3000));

    console.log('2. Now searching / clicking Samsen (Central)...');
    // Let's type Samsen in the search box
    await page.waitForSelector('input.searchboxinput, input#searchboxinput, input', { timeout: 10000 });
    const input = await page.$('input.searchboxinput, input#searchboxinput, input');
    await input.click({ clickCount: 3 });
    await input.type('Samsen (Central)\n');

    await new Promise((r) => setTimeout(r, 5000));

    // Check if place loaded or click first result
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
      if (links.length > 0) links[0].click();
    });

    await new Promise((r) => setTimeout(r, 5000));

    const check = await page.evaluate(() => {
      const widget = document.getElementById('eatsafe-hk-widget-root');
      const card = document.querySelector('.eatsafe-card');
      const headerBadge = document.querySelector('.eatsafe-header-badge')?.textContent || '';
      const restaurantName = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
      const notFound = document.querySelector('.eatsafe-not-found')?.textContent || '';
      const scoreBadge = document.querySelector('.eatsafe-score-title')?.textContent || '';
      return {
        widgetFound: !!widget,
        cardFound: !!card,
        headerBadge,
        restaurantName,
        notFound,
        scoreBadge,
        widgetDisplay: widget ? widget.style.display : null,
        widgetLeft: widget ? widget.style.left : null,
      };
    });

    console.log('CHECK RESULT FOR SAMSEN:', JSON.stringify(check, null, 2));
    await page.screenshot({ path: 'scripts/exact_samsen_test.png' });
    console.log('Saved screenshot to scripts/exact_samsen_test.png');
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
}

run();
