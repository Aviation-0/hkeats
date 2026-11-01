import puppeteer from 'puppeteer';
import path from 'node:path';

const artifactDir = 'C:/Users/lucas/.gemini/antigravity/brain/46b572e6-99c7-4c83-810b-3bd570a26382';
const extensionPath = path.resolve(process.cwd(), 'extension');

async function run() {
  console.log('🚀 Launching Puppeteer with EatSafe HK extension from:', extensionPath);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1400,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[EatSafe HK]')) console.log('BROWSER CONSOLE:', text);
  });

  try {
    console.log('\n--- TEST 1: Single Tab View (Matching Picture 1 - Krua Walaiphan) ---');
    await page.goto('http://localhost:3000/mock-maps', { waitUntil: 'networkidle0' });

    // Wait for widget to render Krua Walaiphan
    await page.waitForFunction(
      () => {
        const title = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return title.toLowerCase().includes('krua walaiphan');
      },
      { timeout: 10000 }
    );

    // Check positioning next to the single tab
    const pos1 = await page.evaluate(() => {
      const panel = document.getElementById('mock-side-panel');
      const widget = document.getElementById('eatsafe-hk-widget-root');
      const card = document.querySelector('.eatsafe-card');
      const panelRect = panel ? panel.getBoundingClientRect() : null;
      const widgetRect = widget ? widget.getBoundingClientRect() : null;
      const badgeText = document.querySelector('.eatsafe-header-badge')?.textContent || '';
      const scoreBadge = document.querySelector('.eatsafe-score-title')?.textContent || '';
      return {
        panelRight: panelRect ? panelRect.right : 0,
        widgetLeft: widgetRect ? widgetRect.left : 0,
        widgetTop: widgetRect ? widgetRect.top : 0,
        widgetDisplay: widget ? widget.style.display : '',
        badgeText,
        scoreBadge,
      };
    });

    console.log('1-Tab Positioning:', pos1);
    const expectedLeft1 = Math.round(pos1.panelRight + 14);
    if (Math.abs(pos1.widgetLeft - expectedLeft1) > 5) {
      throw new Error(`Expected widget left around ${expectedLeft1}px, got ${pos1.widgetLeft}px`);
    }
    console.log(`✅ TEST 1 PASSED: Docked at left=${pos1.widgetLeft}px next to single panel (panel.right=${pos1.panelRight}px)`);

    await page.screenshot({ path: `${artifactDir}/screenshot_1_tab_docked.png` });
    console.log(`📸 Saved screenshot_1_tab_docked.png`);

    // ==========================================
    // TEST 2: Two Tabs View (Matching Picture 2 - Resbyne Restaurant)
    // ==========================================
    console.log('\n--- TEST 2: Two Tabs View (Matching Picture 2 - Resbyne Restaurant) ---');
    // Toggle 2-tabs mode
    await page.click('#toggle-tabs-mode-btn');
    await new Promise((r) => setTimeout(r, 400));

    // Select RESBYNE
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent.includes('RESBYNE'));
      if (btn) btn.click();
    });

    // Wait for widget to render RESBYNE
    await page.waitForFunction(
      () => {
        const title = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return title.toUpperCase().includes('RESBYNE');
      },
      { timeout: 10000 }
    );

    // Wait for smooth glide transition to complete (0.22s transition)
    await new Promise((r) => setTimeout(r, 600));

    const pos2 = await page.evaluate(() => {
      const searchPanel = document.getElementById('mock-search-panel');
      const sidePanel = document.getElementById('mock-side-panel');
      const widget = document.getElementById('eatsafe-hk-widget-root');
      const searchRect = searchPanel ? searchPanel.getBoundingClientRect() : null;
      const sideRect = sidePanel ? sidePanel.getBoundingClientRect() : null;
      const widgetRect = widget ? widget.getBoundingClientRect() : null;
      const badgeText = document.querySelector('.eatsafe-header-badge')?.textContent || '';
      const scoreBadge = document.querySelector('.eatsafe-score-title')?.textContent || '';
      return {
        searchRight: searchRect ? searchRect.right : 0,
        sideRight: sideRect ? sideRect.right : 0,
        widgetLeft: widgetRect ? widgetRect.left : 0,
        widgetTop: widgetRect ? widgetRect.top : 0,
        badgeText,
        scoreBadge,
      };
    });

    console.log('2-Tabs Positioning:', pos2);
    const expectedLeft2 = Math.round(pos2.sideRight + 14);
    if (Math.abs(pos2.widgetLeft - expectedLeft2) > 5) {
      throw new Error(`Expected widget left around ${expectedLeft2}px, got ${pos2.widgetLeft}px`);
    }
    console.log(`✅ TEST 2 PASSED: Dynamic glide to left=${pos2.widgetLeft}px next to 2nd panel (side.right=${pos2.sideRight}px)`);

    await page.screenshot({ path: `${artifactDir}/screenshot_2_tabs_docked.png` });
    console.log(`📸 Saved screenshot_2_tabs_docked.png`);

    // ==========================================
    // TEST 3: Disappear when Place Panel is Closed (✕ Button)
    // ==========================================
    console.log('\n--- TEST 3: Disappearance when Place Panel is closed (✕) ---');
    await page.click('button[aria-label="Close"]');
    await new Promise((r) => setTimeout(r, 600));

    const stateAfterClose = await page.evaluate(() => {
      const widget = document.getElementById('eatsafe-hk-widget-root');
      const panel = document.getElementById('mock-side-panel');
      return {
        widgetDisplay: widget ? widget.style.display : 'none',
        hasPlacePanel: !!panel,
      };
    });

    console.log('State after closing restaurant panel:', stateAfterClose);
    if (stateAfterClose.widgetDisplay !== 'none') {
      throw new Error(`Expected widget to disappear (display: none), got display="${stateAfterClose.widgetDisplay}"`);
    }
    console.log('✅ TEST 3 PASSED: EatSafe HK widget completely disappeared when restaurant panel closed!');

    await page.screenshot({ path: `${artifactDir}/screenshot_no_restaurant_disappeared.png` });
    console.log(`📸 Saved screenshot_no_restaurant_disappeared.png`);

    // ==========================================
    // TEST 4: Re-open Restaurant from Results List
    // ==========================================
    console.log('\n--- TEST 4: Re-open Restaurant from Results List ---');
    await page.evaluate(() => {
      const searchPanel = document.getElementById('mock-search-panel');
      if (searchPanel) {
        const itemBtn = searchPanel.querySelector('button');
        if (itemBtn) itemBtn.click();
      }
    });

    await page.waitForFunction(
      () => {
        const widget = document.getElementById('eatsafe-hk-widget-root');
        return widget && widget.style.display !== 'none';
      },
      { timeout: 8000 }
    );

    // Wait for smooth glide transition
    await new Promise((r) => setTimeout(r, 600));

    const stateAfterReopen = await page.evaluate(() => {
      const widget = document.getElementById('eatsafe-hk-widget-root');
      const sidePanel = document.getElementById('mock-side-panel');
      const sideRect = sidePanel ? sidePanel.getBoundingClientRect() : null;
      const widgetRect = widget ? widget.getBoundingClientRect() : null;
      return {
        widgetDisplay: widget ? widget.style.display : '',
        sideRight: sideRect ? sideRect.right : 0,
        widgetLeft: widgetRect ? widgetRect.left : 0,
      };
    });

    console.log('State after reopening:', stateAfterReopen);
    const expectedReopenLeft = Math.round(stateAfterReopen.sideRight + 14);
    if (Math.abs(stateAfterReopen.widgetLeft - expectedReopenLeft) > 5) {
      throw new Error(`Expected widget left around ${expectedReopenLeft}px, got ${stateAfterReopen.widgetLeft}px`);
    }
    console.log('✅ TEST 4 PASSED: EatSafe HK widget reappeared cleanly docked to side tabs!');

    await page.screenshot({ path: `${artifactDir}/screenshot_reopened_restored.png` });
    console.log(`📸 Saved screenshot_reopened_restored.png`);

    // ==========================================
    // TEST 5: Click Map Canvas Background (Simulate clicking off on Google Maps)
    // ==========================================
    console.log('\n--- TEST 5: Click Map Canvas Background (Dismiss Restaurant) ---');
    // Click in the middle of canvas
    const canvas = await page.$('#mock-map-canvas');
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    await new Promise((r) => setTimeout(r, 600));

    const stateAfterCanvasClick = await page.evaluate(() => {
      const widget = document.getElementById('eatsafe-hk-widget-root');
      return {
        widgetDisplay: widget ? widget.style.display : 'none',
      };
    });

    console.log('State after clicking map canvas:', stateAfterCanvasClick);
    if (stateAfterCanvasClick.widgetDisplay !== 'none') {
      throw new Error(`Expected widget to disappear after map click, got display="${stateAfterCanvasClick.widgetDisplay}"`);
    }
    console.log('✅ TEST 5 PASSED: Clicking map dismissed restaurant and hid widget!');

    await page.screenshot({ path: `${artifactDir}/screenshot_map_click_disappeared.png` });
    console.log(`📸 Saved screenshot_map_click_disappeared.png`);

    console.log('\n🎉 ALL 5 TESTS PASSED SUCCESSFULLY! Flawlessly verified both user pictures and disappearance requirements!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
