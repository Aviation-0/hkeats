import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1600,900', '--lang=en-US'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });

  try {
    console.log('Navigating to Google Maps search...');
    await page.goto('https://www.google.com/maps/search/Restaurants/@22.2845,114.1481,16z?hl=en', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await new Promise((r) => setTimeout(r, 2000));

    // Look for first restaurant result in list and click it
    console.log('Looking for place items in results list...');
    const clicked = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
      if (links.length > 0) {
        links[0].click();
        return links[0].getAttribute('aria-label') || links[0].textContent;
      }
      return null;
    });

    console.log('Clicked place:', clicked);
    await new Promise((r) => setTimeout(r, 4000));

    // Now analyze the DOM layout
    const info = await page.evaluate(() => {
      // 1. Check title elements
      const titleSelectors = [
        'h1.DUwDvf',
        'h1.fontHeadlineLarge',
        'h1.ITQ08c',
        'h1.bJzME',
        'h1.Q41nfe',
        '.x352Kt h1',
        '.fpN89e h1',
        'div[role="main"] h1',
      ];
      const titles = [];
      for (const sel of titleSelectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const r = el.getBoundingClientRect();
          titles.push({
            sel,
            text: el.textContent.trim(),
            rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), top: Math.round(r.top) },
            visible: el.offsetParent !== null,
          });
        }
      }

      // 2. Check all elements with role="main" or role="region" or role="dialog"
      const roles = [];
      const roleEls = document.querySelectorAll('[role="main"], [role="region"], [role="dialog"], .widget-pane, .m6QErb');
      for (const el of roleEls) {
        const r = el.getBoundingClientRect();
        if (r.width > 200 && r.height > 200) {
          roles.push({
            role: el.getAttribute('role'),
            ariaLabel: el.getAttribute('aria-label'),
            className: el.className.toString().slice(0, 50),
            rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) },
          });
        }
      }

      // 3. Check toggle / collapse buttons
      const buttons = [];
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        const label = (b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent || '').trim();
        if (/collapse|expand|side panel|hide|show/i.test(label) || b.className.includes('toggle') || b.className.includes('collapse')) {
          const r = b.getBoundingClientRect();
          buttons.push({
            label,
            className: b.className.toString().slice(0, 40),
            rect: { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top) },
          });
        }
      }

      return { titles, roles, buttons };
    });

    console.log('TITLES:', JSON.stringify(info.titles, null, 2));
    console.log('ROLES/PANELS:', JSON.stringify(info.roles, null, 2));
    console.log('TOGGLE BUTTONS:', JSON.stringify(info.buttons, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

run();
