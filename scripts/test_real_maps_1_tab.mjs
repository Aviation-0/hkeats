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

  try {
    console.log('Navigating to Google Maps search for Krua Walaiphan...');
    await page.goto('https://www.google.com/maps/search/Krua+Walaiphan/@22.2858,114.1415,17z?hl=en', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 3000));
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const consentBtn = btns.find((b) => /accept all|agree/i.test(b.textContent));
      if (consentBtn) consentBtn.click();
    });
    await new Promise((r) => setTimeout(r, 4000));

    // Wait for widget
    await page.waitForFunction(
      () => {
        const widget = document.getElementById('eatsafe-hk-widget-root');
        return widget && widget.style.display !== 'none';
      },
      { timeout: 15000 }
    );

    const check1 = await page.evaluate(() => {
      const widget = document.getElementById('eatsafe-hk-widget-root');
      const widgetRect = widget ? widget.getBoundingClientRect() : null;
      const duw = document.querySelector('h1.DUwDvf');
      return {
        duwText: duw ? duw.textContent.trim() : null,
        widgetDisplay: widget ? widget.style.display : null,
        widgetLeft: widget ? widget.style.left : null,
        widgetRect: widgetRect ? { left: Math.round(widgetRect.left), right: Math.round(widgetRect.right), top: Math.round(widgetRect.top) } : null,
      };
    });

    console.log('1-TAB WIDGET CHECK:', JSON.stringify(check1, null, 2));
    await page.screenshot({ path: 'scripts/real_maps_1_tab_with_extension.png' });
    console.log('Saved screenshot to scripts/real_maps_1_tab_with_extension.png');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

run();
