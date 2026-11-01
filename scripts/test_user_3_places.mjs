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
    console.log('BROWSER CONSOLE:', msg.text());
  });

  const testPlaces = [
    {
      name: 'Samsen (Central)',
      url: 'https://www.google.com/maps/place/Samsen+(Central)/@22.2818,114.1554,17z?hl=en',
    },
    {
      name: 'Amber',
      url: 'https://www.google.com/maps/place/Amber/@22.2810,114.1555,17z?hl=en',
    },
    {
      name: 'Krua Walaiphan',
      url: 'https://www.google.com/maps/place/Krua+Walaiphan/@22.2858,114.1415,17z?hl=en',
    },
  ];

  for (const p of testPlaces) {
    console.log(`\n========================================`);
    console.log(`Testing place: ${p.name}`);
    console.log(`========================================`);

    await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Handle consent if any
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const consentBtn = btns.find((b) => /accept all|agree/i.test(b.textContent));
      if (consentBtn) consentBtn.click();
    });

    await new Promise((r) => setTimeout(r, 4000));

    const result = await page.evaluate(() => {
      const widget = document.getElementById('eatsafe-hk-widget-root');
      const card = document.querySelector('.eatsafe-card');
      const headerBadge = document.querySelector('.eatsafe-header-badge')?.textContent || '';
      const restaurantName = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
      const notFoundBox = document.querySelector('.eatsafe-not-found');
      return {
        widgetFound: !!widget,
        cardFound: !!card,
        isNotFound: !!notFoundBox,
        headerBadge,
        restaurantName,
        widgetLeft: widget ? widget.style.left : null,
      };
    });

    console.log(`Result for ${p.name}:`, JSON.stringify(result, null, 2));
    await page.screenshot({ path: `scripts/test_${p.name.replace(/[^a-zA-Z]/g, '_')}.png` });
  }

  await browser.close();
}

run();
