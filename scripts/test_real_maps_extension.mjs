import puppeteer from 'puppeteer';
import path from 'node:path';

const extensionPath = path.resolve(process.cwd(), 'extension');

async function run() {
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

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });

  page.on('console', (msg) => {
    console.log('PAGE LOG:', msg.text());
  });

  try {
    console.log('Navigating to Google Maps search...');
    await page.goto('https://www.google.com/maps/search/Restaurants/@22.2845,114.1481,16z?hl=en', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await new Promise((r) => setTimeout(r, 4000));

    // Handle consent
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const consentBtn = btns.find((b) => /accept all|agree|i agree|tout accepter/i.test(b.textContent));
      if (consentBtn) consentBtn.click();
    });

    await new Promise((r) => setTimeout(r, 3000));

    // Click on the first link
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
      if (links.length > 0) links[0].click();
    });

    console.log('Waiting 5s for place panel and extension to render...');
    await new Promise((r) => setTimeout(r, 5000));

    const check = await page.evaluate(() => {
      const widget = document.getElementById('eatsafe-hk-widget-root');
      const card = document.querySelector('.eatsafe-card');
      const widgetRect = widget ? widget.getBoundingClientRect() : null;
      return {
        widgetFound: !!widget,
        cardFound: !!card,
        widgetDisplay: widget ? widget.style.display : null,
        widgetLeft: widget ? widget.style.left : null,
        widgetRect: widgetRect ? { left: widgetRect.left, right: widgetRect.right, top: widgetRect.top } : null,
      };
    });

    console.log('WIDGET CHECK:', JSON.stringify(check, null, 2));

    await page.screenshot({ path: 'scripts/real_maps_with_extension.png' });
    console.log('Saved screenshot to scripts/real_maps_with_extension.png');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

run();
