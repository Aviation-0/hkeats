import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--window-size=1600,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  await page.goto('https://www.google.com/maps/search/Restaurants/@22.2845,114.1481,16z?hl=en', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const consentBtn = btns.find((b) => /accept all|agree/i.test(b.textContent));
    if (consentBtn) consentBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
    if (links.length > 0) links[0].click();
  });
  await new Promise(r => setTimeout(r, 4000));

  const info = await page.evaluate(() => {
    // Check place title specifically
    const duw = document.querySelector('h1.DUwDvf');
    const duwRect = duw ? duw.getBoundingClientRect() : null;

    // Check containers of duw!
    const duwParents = [];
    let c = duw;
    while (c && c !== document.body) {
      const r = c.getBoundingClientRect();
      duwParents.push({
        tag: c.tagName,
        className: (c.className || '').toString().slice(0, 50),
        id: c.id,
        rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) }
      });
      c = c.parentElement;
    }

    // Check toggle button
    const toggleBtn = Array.from(document.querySelectorAll('button')).find(b => {
      const label = (b.getAttribute('aria-label') || '').toLowerCase();
      return label.includes('collapse') || label.includes('hide');
    });
    const toggleRect = toggleBtn ? toggleBtn.getBoundingClientRect() : null;

    return {
      duwText: duw ? duw.textContent.trim() : null,
      duwRect: duwRect ? { left: Math.round(duwRect.left), right: Math.round(duwRect.right) } : null,
      duwParents,
      toggleBtnLabel: toggleBtn ? toggleBtn.getAttribute('aria-label') : null,
      toggleRect: toggleRect ? { left: Math.round(toggleRect.left), right: Math.round(toggleRect.right) } : null,
    };
  });

  console.log('PLACE AND PARENTS:', JSON.stringify(info, null, 2));
  await browser.close();
}

run();
