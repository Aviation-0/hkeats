import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1600,900', '--lang=en-US'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });

  try {
    console.log('Navigating directly to Google Maps search URL...');
    await page.goto('https://www.google.com/maps/search/Restaurants/@22.2845,114.1481,16z', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await new Promise((r) => setTimeout(r, 4000));

    // Check if there is a consent button like "Accept all" or "Reject all"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const consentBtn = btns.find((b) => /accept all|agree|i agree|tout accepter/i.test(b.textContent));
      if (consentBtn) consentBtn.click();
    });

    await new Promise((r) => setTimeout(r, 3000));

    // Take screenshot of search results
    await page.screenshot({ path: 'scripts/maps_search_page.png' });
    console.log('Screenshot saved to scripts/maps_search_page.png');

    // Click on the first link with /maps/place/
    const clickedInfo = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
      if (links.length > 0) {
        const text = links[0].getAttribute('aria-label') || links[0].textContent;
        links[0].click();
        return { count: links.length, text };
      }
      return null;
    });

    console.log('Clicked place link:', clickedInfo);
    await new Promise((r) => setTimeout(r, 5000));

    await page.screenshot({ path: 'scripts/maps_two_tabs_page.png' });
    console.log('Screenshot after click saved to scripts/maps_two_tabs_page.png');

    const domReport = await page.evaluate(() => {
      // Find all visible headings
      const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map((h) => {
        const r = h.getBoundingClientRect();
        return {
          tag: h.tagName,
          text: h.textContent.trim().slice(0, 40),
          className: h.className,
          rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) },
          visible: h.offsetParent !== null,
        };
      }).filter(h => h.visible && h.rect.width > 0);

      // Find all elements that look like side panels (width 300-600, height > 300)
      const allDivs = Array.from(document.querySelectorAll('*'));
      const panels = allDivs
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width >= 320 && r.width <= 550 && r.height > 300 && r.top <= 120 && el.offsetParent !== null;
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            className: (el.className || '').toString().slice(0, 50),
            id: el.id,
            role: el.getAttribute('role'),
            ariaLabel: el.getAttribute('aria-label'),
            rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) },
          };
        });

      return { headings, panels, url: window.location.href };
    });

    console.log('DOM REPORT:', JSON.stringify(domReport, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

run();
