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
    console.log('1. Navigating to mock-maps...');
    await page.goto('http://localhost:3000/mock-maps', { waitUntil: 'networkidle0' });

    // ==========================================
    // STEP 1: Select Central Restaurant and verify expanded
    // ==========================================
    console.log('\n2. Selecting Central Restaurant...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Central Restaurant'));
      if (btn) btn.click();
    });

    await page.waitForFunction(
      () => {
        const title = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return title.toLowerCase().includes('central restaurant');
      },
      { timeout: 10000 }
    );

    let isMin = await page.$eval('.eatsafe-card', el => el.classList.contains('minimized'));
    let minBtnText = await page.$eval('#eatsafe-min-btn', el => el.textContent.trim());
    console.log(`Initial state: minimized=${isMin}, buttonText="${minBtnText}"`);
    if (isMin) throw new Error('Expected initial state to be expanded!');
    if (minBtnText !== '–') throw new Error(`Expected button text "–", got "${minBtnText}"`);

    // ==========================================
    // STEP 2: Minimize the card
    // ==========================================
    console.log('\n3. Clicking minimize button (–)...');
    await page.click('#eatsafe-min-btn');

    isMin = await page.$eval('.eatsafe-card', el => el.classList.contains('minimized'));
    minBtnText = await page.$eval('#eatsafe-min-btn', el => el.textContent.trim());
    console.log(`After click: minimized=${isMin}, buttonText="${minBtnText}"`);
    if (!isMin) throw new Error('Card failed to minimize!');
    if (minBtnText !== '+') throw new Error(`Expected button text "+", got "${minBtnText}"`);

    // ==========================================
    // STEP 3: Simulate map move / zoom / pan
    // ==========================================
    console.log('\n4. Simulating map pan, drag, and camera coordinate changes...');
    
    // Simulate mouse drags on map canvas
    const canvas = await page.$('#mock-map-canvas');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 250, box.y + 250, { steps: 5 });
    await page.mouse.up();

    // Simulate mouse wheel zoom
    await page.mouse.wheel({ deltaY: -200 });
    await new Promise(r => setTimeout(r, 200));
    await page.mouse.wheel({ deltaY: 200 });

    // Simulate Google Maps updating camera coordinates in URL history
    await page.evaluate(() => {
      window.history.replaceState(null, '', '/mock-maps/place/Central%20Restaurant/@22.3350,114.1720,18z');
      // Trigger mutation on body
      const dummy = document.createElement('div');
      dummy.id = 'map-drag-dummy';
      document.body.appendChild(dummy);
      setTimeout(() => dummy.remove(), 100);
    });

    // Wait 1.5 seconds to let any observer/polling cycles run
    await new Promise(r => setTimeout(r, 1500));

    // Assert it is STILL minimized
    isMin = await page.$eval('.eatsafe-card', el => el.classList.contains('minimized'));
    minBtnText = await page.$eval('#eatsafe-min-btn', el => el.textContent.trim());
    console.log(`After map pan/zoom: minimized=${isMin}, buttonText="${minBtnText}"`);
    if (!isMin) throw new Error('CRITICAL BUG: Card un-minimized itself after map pan/zoom!');
    if (minBtnText !== '+') throw new Error(`Expected button text "+", got "${minBtnText}"`);

    const panScreenshot = path.join(artifactDir, 'screenshot_minimized_after_map_pan_zoom.png');
    await page.screenshot({ path: panScreenshot });
    console.log(`📸 Saved screenshot: ${panScreenshot}`);

    // ==========================================
    // STEP 4: Click a NEW location (Australia Dairy Company) while minimized
    // ==========================================
    console.log('\n5. Clicking a NEW location (Australia Dairy Company) while minimized...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Australia Dairy Company'));
      if (btn) btn.click();
    });

    // Wait for the place to update in the DOM
    await page.waitForFunction(
      () => {
        const title = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return title.toLowerCase().includes('australia dairy company');
      },
      { timeout: 10000 }
    );

    // Assert that on the new location, the card is STILL MINIMIZED!
    isMin = await page.$eval('.eatsafe-card', el => el.classList.contains('minimized'));
    minBtnText = await page.$eval('#eatsafe-min-btn', el => el.textContent.trim());
    const headerBadge = await page.$eval('.eatsafe-header-badge', el => el.textContent.trim());
    console.log(`New location (Australia Dairy): minimized=${isMin}, buttonText="${minBtnText}", headerBadge="${headerBadge}"`);
    if (!isMin) throw new Error('CRITICAL BUG: Card un-minimized itself when switching to a new location!');
    if (minBtnText !== '+') throw new Error(`Expected button text "+", got "${minBtnText}"`);
    if (!headerBadge.includes('Verified Licence')) {
      throw new Error(`Expected Verified Licence badge, got "${headerBadge}"`);
    }

    const newLocScreenshot = path.join(artifactDir, 'screenshot_minimized_on_new_location.png');
    await page.screenshot({ path: newLocScreenshot });
    console.log(`📸 Saved screenshot: ${newLocScreenshot}`);

    // ==========================================
    // STEP 5: Click expand (+) to un-minimize
    // ==========================================
    console.log('\n6. Clicking expand (+) button...');
    await page.click('#eatsafe-min-btn');

    isMin = await page.$eval('.eatsafe-card', el => el.classList.contains('minimized'));
    minBtnText = await page.$eval('#eatsafe-min-btn', el => el.textContent.trim());
    const adcName = await page.$eval('.eatsafe-restaurant-name', el => el.textContent.trim());
    console.log(`After expand: minimized=${isMin}, buttonText="${minBtnText}", name="${adcName}"`);
    if (isMin) throw new Error('Card failed to expand when user clicked +!');
    if (minBtnText !== '–') throw new Error(`Expected button text "–", got "${minBtnText}"`);
    if (!adcName.toLowerCase().includes('australia dairy company')) {
      throw new Error(`Expected Australia Dairy Company, got "${adcName}"`);
    }

    const expandedScreenshot = path.join(artifactDir, 'screenshot_expanded_after_user_expand.png');
    await page.screenshot({ path: expandedScreenshot });
    console.log(`📸 Saved screenshot: ${expandedScreenshot}`);

    // ==========================================
    // STEP 6: Click another location (Monster BBQ) while expanded -> should stay expanded
    // ==========================================
    console.log('\n7. Clicking Monster BBQ Restaurant while expanded...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Monster BBQ Restaurant'));
      if (btn) btn.click();
    });

    await page.waitForFunction(
      () => {
        const title = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return title.toLowerCase().includes('monster bbq');
      },
      { timeout: 10000 }
    );

    isMin = await page.$eval('.eatsafe-card', el => el.classList.contains('minimized'));
    minBtnText = await page.$eval('#eatsafe-min-btn', el => el.textContent.trim());
    console.log(`Monster BBQ while expanded: minimized=${isMin}, buttonText="${minBtnText}"`);
    if (isMin) throw new Error('Card unexpectedly minimized when user had it expanded!');
    if (minBtnText !== '–') throw new Error(`Expected button text "–", got "${minBtnText}"`);

    console.log('\n🎉 ALL MINIMIZATION AND MAP MOVE TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
