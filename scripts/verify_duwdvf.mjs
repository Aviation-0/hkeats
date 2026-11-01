import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1600,900', '--lang=en-US'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });

  // Case 1: Search only (no place clicked)
  console.log('Case 1: Search only...');
  await page.goto('https://www.google.com/maps/search/Restaurants/@22.2845,114.1481,16z?hl=en', {
    waitUntil: 'domcontentloaded',
  });
  await new Promise(r => setTimeout(r, 4000));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const consentBtn = btns.find((b) => /accept all|agree/i.test(b.textContent));
    if (consentBtn) consentBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const case1 = await page.evaluate(() => {
    const duw = document.querySelector('h1.DUwDvf');
    return {
      hasDUwDvf: !!duw,
      duwText: duw ? duw.textContent : null,
      w6Right: document.querySelector('.w6VYqd')?.getBoundingClientRect().right || null,
    };
  });
  console.log('Case 1 (Search Only):', case1);

  // Case 2: Click a place (2 tabs open)
  console.log('Case 2: Click a place...');
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
    if (links.length > 0) links[0].click();
  });
  await new Promise(r => setTimeout(r, 4000));

  const case2 = await page.evaluate(() => {
    const duw = document.querySelector('h1.DUwDvf');
    return {
      hasDUwDvf: !!duw,
      duwText: duw ? duw.textContent : null,
      duwRight: duw ? duw.getBoundingClientRect().right : null,
      w6Right: document.querySelector('.w6VYqd')?.getBoundingClientRect().right || null,
    };
  });
  console.log('Case 2 (Place Clicked - 2 Tabs):', case2);

  // Case 3: Close place panel (click close button on place panel)
  console.log('Case 3: Close place panel...');
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[aria-label*="Close"], button[aria-label*="close"]');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const case3 = await page.evaluate(() => {
    const duw = document.querySelector('h1.DUwDvf');
    return {
      hasDUwDvf: !!duw,
      duwText: duw ? duw.textContent : null,
      w6Right: document.querySelector('.w6VYqd')?.getBoundingClientRect().right || null,
    };
  });
  console.log('Case 3 (Closed Place):', case3);

  await browser.close();
}

run();
