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

  await page.goto('https://www.google.com/maps/search/Restaurants/@22.2845,114.1481,16z?hl=en', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 3000));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const consentBtn = btns.find((b) => /accept all|agree|i agree|tout accepter/i.test(b.textContent));
    if (consentBtn) consentBtn.click();
  });
  await new Promise((r) => setTimeout(r, 2000));
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
    if (links.length > 0) links[0].click();
  });
  await new Promise((r) => setTimeout(r, 4000));

  const debug = await page.evaluate(() => {
    const titleEl = document.querySelector(
      "h1.DUwDvf, h1.fontHeadlineLarge, h1.ITQ08c, h1.bJzME, h1.Q41nfe, .x352Kt h1, .fpN89e h1, div[role='main'] h1"
    );

    const steps = [];
    let bestRight = 0;
    let curr = titleEl;
    while (curr && curr !== document.body) {
      const rect = curr.getBoundingClientRect();
      steps.push({
        tag: curr.tagName,
        className: (curr.className || '').toString().slice(0, 50),
        id: curr.id,
        rect: { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), height: Math.round(rect.height) },
        matchesWidth: rect.width >= 260 && rect.width <= 700,
        matchesHeight: rect.height >= 200,
      });

      if (rect.width >= 260 && rect.width <= 700 && rect.height >= 200) {
        if (rect.right > bestRight && rect.right < window.innerWidth - 60) {
          bestRight = rect.right;
        }
      }
      curr = curr.parentElement;
    }

    return {
      titleElTag: titleEl ? titleEl.tagName : null,
      titleElText: titleEl ? titleEl.textContent : null,
      titleElRect: titleEl ? titleEl.getBoundingClientRect() : null,
      bestRight,
      steps,
    };
  });

  console.log('DEBUG TRACE:', JSON.stringify(debug, null, 2));
  await browser.close();
}

run();
