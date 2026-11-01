import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';

const artifactDir = 'C:/Users/lucas/.gemini/antigravity/brain/46b572e6-99c7-4c83-810b-3bd570a26382';
const extensionPath = path.resolve(process.cwd(), 'extension');
const storeAssetsDir = path.resolve(process.cwd(), 'store-assets');
if (!fs.existsSync(storeAssetsDir)) {
  fs.mkdirSync(storeAssetsDir, { recursive: true });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('🚀 Starting EatSafe HK Full Release-Ready E2E Suite...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1600,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[EatSafe HK]')) console.log('  [EXT LOG]', text);
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: Krua Walaiphan (Clean Verified Licence) & Hong Lin (Past Suspension)
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Clean Licence & True Suspension Verification ---');
    await page.goto('https://eatsafe-hk.pages.dev/mock-maps', { waitUntil: 'networkidle0' });

    // Click Krua Walaiphan (Innocent restaurant: must be Clean, NOT false-positive suspended)
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Krua Walaiphan'));
      if (btn) btn.click();
    });

    await page.waitForFunction(
      () => {
        const name = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return name.toLowerCase().includes('krua walaiphan');
      },
      { timeout: 8000 }
    );
    await sleep(400);

    const kruaData = await page.evaluate(() => {
      const badge = document.querySelector('.eatsafe-header-badge')?.textContent || '';
      const scoreBadge = document.querySelector('.eatsafe-score-badge')?.textContent || '';
      const widget = document.getElementById('eatsafe-hk-widget-root');
      const widgetLeft = widget ? parseFloat(widget.style.left) : null;
      return { badge, scoreBadge, widgetLeft };
    });
    console.log('Krua Walaiphan Card (Clean):', kruaData);
    if (!kruaData.badge.includes('Verified Licence') || !kruaData.scoreBadge.includes('No Active Suspensions on Record')) {
      throw new Error(`Expected Krua Walaiphan to show verified clean record, got: ${JSON.stringify(kruaData)}`);
    }
    console.log('✅ TEST 1A PASSED: Krua Walaiphan verified clean record displayed (no false suspension).');

    // Click Hong Lin Restaurant (Legitimate FEHD suspension notice)
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Hong Lin Restaurant'));
      if (btn) btn.click();
    });

    await page.waitForFunction(
      () => {
        const name = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return name.toLowerCase().includes('hong lin');
      },
      { timeout: 8000 }
    );
    await sleep(400);

    const hongLinData = await page.evaluate(() => {
      const badge = document.querySelector('.eatsafe-header-badge')?.textContent || '';
      const scoreBadge = document.querySelector('.eatsafe-score-badge')?.textContent || '';
      return { badge, scoreBadge };
    });
    console.log('Hong Lin Restaurant Card (Suspended):', hongLinData);
    if (!hongLinData.scoreBadge.includes('Previously Suspended') && !hongLinData.badge.includes('Past Suspension')) {
      throw new Error(`Expected Hong Lin Restaurant to show past suspension badge, got: ${JSON.stringify(hongLinData)}`);
    }
    console.log('✅ TEST 1B PASSED: Hong Lin Restaurant correctly displays true statutory suspension order.');

    // -------------------------------------------------------------
    // TEST 2: Samsen (Central) - The venue from user screenshot 1
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Samsen (Central) - Live Verification ---');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Samsen (Central)'));
      if (btn) btn.click();
    });

    await page.waitForFunction(
      () => {
        const name = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return name.toLowerCase().includes('samsen');
      },
      { timeout: 8000 }
    );
    await sleep(400);

    const samsenData = await page.evaluate(() => {
      const badge = document.querySelector('.eatsafe-header-badge')?.textContent || '';
      const scoreBadge = document.querySelector('.eatsafe-score-badge')?.textContent || '';
      const addr = document.querySelector('.eatsafe-address')?.textContent || '';
      return { badge, scoreBadge, addr };
    });
    console.log('Samsen (Central) Card:', samsenData);
    if (!samsenData.badge.includes('Verified Licence') || !samsenData.addr.includes('ON LAN STREET')) {
      throw new Error(`Samsen match failed: ${JSON.stringify(samsenData)}`);
    }
    console.log('✅ TEST 2 PASSED: Samsen (Central) correctly matched to 18 On Lan Street licence.');

    // -------------------------------------------------------------
    // TEST 3: Amber - Concession Master Licence (user screenshot 2)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Amber - Concession Master Licence ---');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Amber') && !b.textContent.includes('Mandarin'));
      if (btn) btn.click();
    });

    await page.waitForFunction(
      () => {
        const name = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return name.trim().includes('Amber');
      },
      { timeout: 8000 }
    );
    await sleep(400);

    const amberData = await page.evaluate(() => {
      const badge = document.querySelector('.eatsafe-header-badge')?.textContent || '';
      const scoreBadge = document.querySelector('.eatsafe-score-badge')?.textContent || '';
      const notice = document.querySelector('.eatsafe-discrepancy-box')?.textContent || '';
      return { badge, scoreBadge, notice };
    });
    console.log('Amber Card:', amberData);
    if (!amberData.badge.includes('Master Licence') || !amberData.notice.includes('Landmark Mandarin Oriental')) {
      throw new Error(`Amber master licence resolution failed: ${JSON.stringify(amberData)}`);
    }
    console.log('✅ TEST 3 PASSED: Amber correctly resolved under Landmark Mandarin Oriental Master Licence.');

    // -------------------------------------------------------------
    // TEST 4: Fidelity-Style Licence Guide (? Popover)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Fidelity-Style Licence Guide Popover ---');
    // Open details dropdown first
    await page.click('#eatsafe-toggle-details');
    await sleep(300);

    // Click the '?' help button
    await page.click('#eatsafe-licence-guide-trigger');
    await sleep(300);

    const guideOpen = await page.evaluate(() => {
      const popover = document.getElementById('eatsafe-licence-popover');
      const isVisible = popover && popover.classList.contains('open');
      const title = popover ? popover.querySelector('.eatsafe-fidelity-title')?.textContent : '';
      const commonCount = popover ? popover.querySelectorAll('.eatsafe-fidelity-item').length : 0;
      return { isVisible, title, commonCount };
    });
    console.log('Guide Popover State:', guideOpen);
    if (!guideOpen.isVisible || guideOpen.title !== 'Licence Type') {
      throw new Error(`Guide popover failed to open: ${JSON.stringify(guideOpen)}`);
    }

    // Expand accordion for other licences
    await page.click('#eatsafe-guide-accordion-btn');
    await sleep(300);
    const totalItems = await page.evaluate(() => {
      return document.querySelectorAll('#eatsafe-licence-popover .eatsafe-fidelity-item').length;
    });
    console.log(`Guide contains ${totalItems} licence definitions.`);
    if (totalItems < 10) {
      throw new Error(`Expected at least 10 licence definitions, found ${totalItems}`);
    }

    // Close guide
    await page.click('#eatsafe-guide-close-btn');
    await sleep(200);
    console.log('✅ TEST 4 PASSED: Licence guide popover opened, expanded, and closed properly.');

    // -------------------------------------------------------------
    // TEST 5: Minimization Persistence Across Navigation
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Minimization Persistence Across Navigation ---');
    // Minimize the widget
    await page.click('#eatsafe-min-btn');
    await sleep(200);

    const isMin1 = await page.evaluate(() => {
      const card = document.getElementById('eatsafe-card');
      const btn = document.getElementById('eatsafe-min-btn');
      return card?.classList.contains('minimized') && btn?.textContent === '+';
    });
    if (!isMin1) throw new Error('Widget did not enter minimized state.');

    // Switch places to Yat Lok while minimized
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Yat Lok'));
      if (btn) btn.click();
    });

    await page.waitForFunction(
      () => {
        const name = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return name.toLowerCase().includes('yat lok');
      },
      { timeout: 8000 }
    );
    await sleep(400);

    // Verify card STILL minimized!
    const isStillMin = await page.evaluate(() => {
      const card = document.getElementById('eatsafe-card');
      const btn = document.getElementById('eatsafe-min-btn');
      const bodyVisible = document.querySelector('.eatsafe-body')?.offsetParent !== null;
      return card?.classList.contains('minimized') && btn?.textContent === '+' && !bodyVisible;
    });
    if (!isStillMin) throw new Error('Widget un-minimized itself on place switch!');
    console.log('✅ TEST 5 PASSED: Widget stayed minimized across place change without popping open.');

    // Un-minimize widget for subsequent tests
    await page.click('#eatsafe-min-btn');
    await sleep(200);

    // -------------------------------------------------------------
    // TEST 6: Side Tab Positioning (1-tab vs 2-tabs) & Disappearance
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Side Tab Alignment (1-tab vs 2-tabs) & Disappearance ---');
    // In 1-tab mode:
    const pos1 = await page.evaluate(() => {
      const sidePanel = document.getElementById('mock-side-panel');
      const widget = document.getElementById('eatsafe-hk-widget-root');
      return {
        panelRight: sidePanel?.getBoundingClientRect().right || 0,
        widgetLeft: widget?.getBoundingClientRect().left || 0,
      };
    });
    console.log('1-Tab Left:', pos1.widgetLeft, 'Panel Right:', pos1.panelRight);
    if (Math.abs(pos1.widgetLeft - (pos1.panelRight + 14)) > 5) {
      throw new Error(`1-tab alignment off: widget left=${pos1.widgetLeft}, panel right=${pos1.panelRight}`);
    }

    // Toggle 2-tabs mode:
    await page.click('#toggle-tabs-mode-btn');
    await sleep(500);

    const pos2 = await page.evaluate(() => {
      const sidePanel = document.getElementById('mock-side-panel');
      const widget = document.getElementById('eatsafe-hk-widget-root');
      return {
        panelRight: sidePanel?.getBoundingClientRect().right || 0,
        widgetLeft: widget?.getBoundingClientRect().left || 0,
      };
    });
    console.log('2-Tabs Left:', pos2.widgetLeft, 'Panel Right:', pos2.panelRight);
    if (pos2.widgetLeft <= pos1.widgetLeft + 200) {
      throw new Error(`Widget did not shift further right for 2 tabs: pos1=${pos1.widgetLeft}, pos2=${pos2.widgetLeft}`);
    }
    console.log(`✅ TEST 6A PASSED: Widget shifted right from ${pos1.widgetLeft}px to ${pos2.widgetLeft}px for 2-tabs.`);

    // Test Disappearance when place is closed
    await page.click('button[aria-label="Close"]');
    await sleep(300);

    const isHidden = await page.evaluate(() => {
      const widget = document.getElementById('eatsafe-hk-widget-root');
      return !widget || widget.style.display === 'none';
    });
    if (!isHidden) throw new Error('Widget did not disappear when place was closed!');
    console.log('✅ TEST 6B PASSED: Widget disappeared when restaurant panel was closed.');

    // -------------------------------------------------------------
    // TEST 7: Offline Server Status Handling & Retry Button
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Offline State Handling (Friendly Banner, Not "No Record") ---');
    // Reopen Yat Lok
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Yat Lok'));
      if (btn) btn.click();
    });
    await sleep(500);

    const workerTarget = await browser.waitForTarget((t) => t.type() === 'service_worker');
    const serviceWorker = await workerTarget.worker();

    // Set serverUrl in chrome.storage to OFFLINE_SIMULATION to simulate server offline
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({ serverUrl: 'OFFLINE_SIMULATION' });
    });
    await sleep(500);

    // Re-check place to Kam's Roast to trigger lookup against unreachable server
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Kam\'s Roast'));
      if (btn) btn.click();
    });

    // Wait for the offline card to render once the unreachable fetch call completes
    await page.waitForFunction(
      () => {
        const card = document.getElementById('eatsafe-card');
        return card && card.classList.contains('eatsafe-card-offline');
      },
      { timeout: 10000 }
    );
    await sleep(300);

    const offlineState = await page.evaluate(() => {
      const card = document.getElementById('eatsafe-card');
      const badge = document.querySelector('.eatsafe-header-badge')?.textContent || '';
      const notFound = document.querySelector('.eatsafe-not-found');
      const retryBtn = document.getElementById('eatsafe-retry-btn');
      return {
        isOfflineCard: card?.classList.contains('eatsafe-card-offline'),
        badge,
        hasNotFoundMessage: !!notFound,
        hasRetryBtn: !!retryBtn,
      };
    });
    console.log('Offline State Evaluation:', offlineState);
    if (!offlineState.isOfflineCard || !offlineState.hasRetryBtn || offlineState.hasNotFoundMessage) {
      throw new Error(`Offline handling failed: ${JSON.stringify(offlineState)}`);
    }
    console.log('✅ TEST 7A PASSED: Offline server state rendered amber card with retry button instead of false "No Record".');

    // Restore working serverUrl and click Retry
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({ serverUrl: 'https://eatsafe-hk.pages.dev' });
    });
    await page.click('#eatsafe-retry-btn');
    await sleep(1500);

    const recovered = await page.evaluate(() => {
      const badge = document.querySelector('.eatsafe-header-badge')?.textContent || '';
      const scoreBadge = document.querySelector('.eatsafe-score-badge')?.textContent || '';
      return { badge, scoreBadge };
    });
    console.log('Recovered State:', recovered);
    if (!recovered.badge.includes('Verified')) {
      throw new Error(`Retry connection did not recover verified licence: ${JSON.stringify(recovered)}`);
    }
    console.log('✅ TEST 7B PASSED: Retry button immediately restored live verified licence connection!');

    // Generate official Chrome Web Store 1280x800 screenshots & 440x280 promo tile
    await page.click('#toggle-tabs-mode-btn'); // Switch back to 1-tab mode for clean 1280x800 screenshots
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    await sleep(300);
    await page.screenshot({ path: path.join(storeAssetsDir, 'screenshot-1-verified-licence-1280x800.png') });

    await page.evaluate(() => document.getElementById('eatsafe-toggle-details')?.click());
    await sleep(300);
    await page.evaluate(() => document.getElementById('eatsafe-licence-guide-trigger')?.click());
    await sleep(300);
    await page.screenshot({ path: path.join(storeAssetsDir, 'screenshot-2-licence-guide-1280x800.png') });
    await page.evaluate(() => document.getElementById('eatsafe-guide-close-btn')?.click());
    await sleep(200);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Amber'));
      if (btn) btn.click();
    });
    await page.waitForFunction(
      () => (document.querySelector('.eatsafe-restaurant-name')?.textContent || '').includes('Amber'),
      { timeout: 8000 }
    );
    await sleep(300);
    await page.screenshot({ path: path.join(storeAssetsDir, 'screenshot-3-master-licence-1280x800.png') });

    // Generate 440x280 Small Promo Tile
    const promoPage = await browser.newPage();
    await promoPage.setViewport({ width: 440, height: 280, deviceScaleFactor: 1 });
    await promoPage.setContent(`
      <!DOCTYPE html>
      <html>
      <body style="margin:0; width:440px; height:280px; background:linear-gradient(135deg, #006837 0%, #064e3b 100%); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#fff; display:flex; flex-direction:column; justify-content:center; padding:28px 32px; box-sizing:border-box; border-bottom:6px solid #ffcc00;">
        <div style="display:inline-block; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3); color:#a7f3d0; font-size:11px; font-weight:700; padding:4px 10px; border-radius:999px; width:fit-content; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.6px;">
          🇭🇰 Hong Kong FEHD Open Data
        </div>
        <div style="font-size:32px; font-weight:800; letter-spacing:-0.5px; margin-bottom:6px;">EatSafe HK</div>
        <div style="font-size:14px; color:#ecfdf5; line-height:1.45; margin-bottom:16px;">
          Instant FEHD restaurant licence verification, hygiene records &amp; suspension alerts directly on Google Maps.
        </div>
        <div style="display:flex; gap:8px; font-size:11px; font-weight:700;">
          <span style="background:#ecfdf5; color:#065f46; padding:4px 10px; border-radius:6px;">✓ 42,800+ Premises</span>
          <span style="background:#fef3c7; color:#92400e; padding:4px 10px; border-radius:6px;">✓ 18 HK Districts</span>
        </div>
      </body>
      </html>
    `);
    await promoPage.screenshot({ path: path.join(storeAssetsDir, 'promo-tile-small-440x280.png') });
    await promoPage.close();
    console.log('🖼️ Generated 1280x800 CWS screenshots & 440x280 promo tile in store-assets/');

    // Take final snapshot
    await page.setViewport({ width: 1600, height: 900 });
    await page.screenshot({ path: `${artifactDir}/screenshot_full_suite_passed.png` });
    console.log(`📸 Saved screenshot_full_suite_passed.png`);

    console.log('\n🎉 ALL 7 E2E TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('❌ E2E TEST FAILED:', err);
    await page.screenshot({ path: `${artifactDir}/screenshot_test_failure.png` });
    throw err;
  } finally {
    await browser.close();
  }
}

run();
