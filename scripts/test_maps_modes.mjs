import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1600,900', '--lang=en-US'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });

  try {
    // 1. Single place view directly (1 Tab)
    console.log('Testing 1-Tab view (direct place URL)...');
    await page.goto('https://www.google.com/maps/place/Krua+Walaiphan/@22.2858,114.1415,17z?hl=en', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 4000));
    // Consent
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const consentBtn = btns.find((b) => /accept all|agree|i agree/i.test(b.textContent));
      if (consentBtn) consentBtn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    const oneTabReport = await page.evaluate(() => {
      const w6 = document.querySelector('.w6VYqd');
      const w6Rect = w6 ? w6.getBoundingClientRect() : null;

      const panels = Array.from(document.querySelectorAll('.noYW3, .m6QErb.WNBkOb, div[role="main"]'))
        .filter(el => el.offsetParent !== null)
        .map(el => {
          const r = el.getBoundingClientRect();
          return { tag: el.tagName, className: el.className.slice(0, 30), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
        });

      return {
        w6Right: w6Rect ? Math.round(w6Rect.right) : null,
        panels,
      };
    });
    console.log('1-TAB REPORT:', JSON.stringify(oneTabReport, null, 2));

    // 2. Search + Place view (2 Tabs)
    console.log('\nTesting 2-Tabs view (Search + Place click)...');
    await page.goto('https://www.google.com/maps/search/Restaurants/@22.2845,114.1481,16z?hl=en', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 3000));
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
      if (links.length > 0) links[0].click();
    });
    await new Promise((r) => setTimeout(r, 4000));

    const twoTabsReport = await page.evaluate(() => {
      const w6 = document.querySelector('.w6VYqd');
      const w6Rect = w6 ? w6.getBoundingClientRect() : null;

      const panels = Array.from(document.querySelectorAll('.noYW3, .m6QErb.WNBkOb, div[role="main"]'))
        .filter(el => el.offsetParent !== null)
        .map(el => {
          const r = el.getBoundingClientRect();
          return { tag: el.tagName, className: el.className.slice(0, 30), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
        });

      // Find the place title specifically (exclude Results, Sponsored)
      const generic = new Set(['results', 'sponsored', 'search results']);
      const placeH1 = Array.from(document.querySelectorAll('h1')).find(h => {
        const text = h.textContent.trim().toLowerCase();
        return h.offsetParent !== null && !generic.has(text);
      });
      const placeH1Rect = placeH1 ? placeH1.getBoundingClientRect() : null;

      return {
        w6Right: w6Rect ? Math.round(w6Rect.right) : null,
        placeH1Text: placeH1 ? placeH1.textContent.trim() : null,
        placeH1Right: placeH1Rect ? Math.round(placeH1Rect.right) : null,
        panels,
      };
    });
    console.log('2-TABS REPORT:', JSON.stringify(twoTabsReport, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

run();
