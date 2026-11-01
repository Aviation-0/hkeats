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
    // TEST 1: Central Restaurant (中央飯店)
    // ==========================================
    console.log('\n2. Testing Central Restaurant (中央飯店) in Sham Shui Po, Kowloon...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Central Restaurant'));
      if (btn) btn.click();
    });

    console.log('Waiting for widget on Central Restaurant...');
    await page.waitForFunction(
      () => {
        const title = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return title.toLowerCase().includes('central restaurant');
      },
      { timeout: 10000 }
    );

    const crName = await page.$eval('.eatsafe-restaurant-name', el => el.textContent.trim());
    const crSubtitle = await page.$eval('.eatsafe-restaurant-tc', el => el.textContent.trim());
    const crHeaderBadge = await page.$eval('.eatsafe-header-badge', el => el.textContent.trim());
    const crScoreBadge = await page.$eval('.eatsafe-score-badge', el => el.textContent.trim());
    const crAddress = await page.$eval('.eatsafe-address', el => el.textContent.trim());

    console.log(`✅ Name: "${crName}"`);
    console.log(`✅ Subtitle: "${crSubtitle}"`);
    console.log(`✅ Header Badge: "${crHeaderBadge}"`);
    console.log(`✅ Score Badge: "${crScoreBadge}"`);
    console.log(`✅ Address: "${crAddress}"`);

    // Check that "0 Demerits" is removed
    if (crScoreBadge.includes('0 Demerits')) {
      throw new Error('Unprovable claim "0 Demerits" is still present in score badge!');
    }
    if (!crScoreBadge.includes('No Active Suspensions on Record')) {
      throw new Error(`Expected "No Active Suspensions on Record", got: "${crScoreBadge}"`);
    }

    // Check registered name box
    const regNameBox = await page.$eval('.eatsafe-registered-name-box', el => el.textContent.trim());
    console.log(`✅ Registered Name Box: "${regNameBox}"`);
    if (!regNameBox.includes('中央')) {
      throw new Error(`Expected registered name to include 中央, got: "${regNameBox}"`);
    }

    // Expand details panel
    const toggleBtn = await page.$('#eatsafe-toggle-details');
    await toggleBtn.click();
    await page.waitForSelector('#eatsafe-details-panel.open', { timeout: 3000 });

    // Check metadata items
    const metaTexts = await page.$$eval('.eatsafe-meta-item', items =>
      items.map(it => ({
        label: it.querySelector('strong')?.textContent.trim() || '',
        val: it.querySelector('span')?.textContent.trim() || ''
      }))
    );
    console.log('✅ Metadata Grid:', JSON.stringify(metaTexts));

    const licenceItem = metaTexts.find(m => m.label.toUpperCase().includes('LICENCE NO'));
    const districtItem = metaTexts.find(m => m.label.toUpperCase().includes('DISTRICT'));
    const typeItem = metaTexts.find(m => m.label.toUpperCase().includes('LICENCE TYPE'));

    if (licenceItem?.val !== '2263067893') {
      throw new Error(`Expected licence 2263067893, got: ${licenceItem?.val}`);
    }
    if (districtItem?.val !== 'SHAM SHUI PO') {
      throw new Error(`Expected district SHAM SHUI PO, got: ${districtItem?.val}`);
    }
    if (!typeItem?.val.includes('General Restaurant Licence')) {
      throw new Error(`Expected General Restaurant Licence, got: ${typeItem?.val}`);
    }

    // Check violations box has NO leading newline/spaces
    const violationsRaw = await page.$eval('.eatsafe-violations-box', el => el.textContent);
    console.log('Violations box raw startsWith newline?:', violationsRaw.startsWith('\n'));
    if (violationsRaw.startsWith('\n')) {
      throw new Error('Violations box has leading newline!');
    }

    // Check portal link is REMOVED
    const portalLinkCount = await page.$$eval('.eatsafe-footer-link', links => links.length);
    console.log(`✅ Portal links count: ${portalLinkCount} (expected 0)`);
    if (portalLinkCount !== 0) {
      throw new Error(`Portal links should be removed, but found ${portalLinkCount}`);
    }

    // Take screenshot of Central Restaurant details
    const crScreenshot = path.join(artifactDir, 'screenshot_central_restaurant_verified.png');
    await page.screenshot({ path: crScreenshot });
    console.log(`📸 Screenshot saved: ${crScreenshot}`);

    // ==========================================
    // TEST 2: Fidelity-Style Licence Classification Guide '?' Button & Popover
    // ==========================================
    console.log('\n3. Testing Fidelity-style Licence Classification Guide popover...');
    const guideBtn = await page.$('#eatsafe-licence-guide-trigger');
    if (!guideBtn) {
      throw new Error('Licence guide "?" button #eatsafe-licence-guide-trigger not found!');
    }
    await guideBtn.click();
    await page.waitForSelector('#eatsafe-licence-popover.open', { timeout: 3000 });

    const isBtnActive = await page.$eval('#eatsafe-licence-guide-trigger', el => el.classList.contains('active'));
    console.log('✅ Guide button has active state:', isBtnActive);

    const popoverTitle = await page.$eval('.eatsafe-fidelity-title', el => el.textContent.trim());
    console.log('✅ Popover title:', popoverTitle);
    if (popoverTitle !== 'Licence Type') {
      throw new Error(`Expected popover title "Licence Type", got "${popoverTitle}"`);
    }

    // Wait for fade-in animation to complete
    await new Promise(r => setTimeout(r, 300));

    // Capture screenshot of common licence types
    const guideScreenshotCommon = path.join(artifactDir, 'screenshot_fidelity_licence_guide_common.png');
    await page.screenshot({ path: guideScreenshotCommon });
    console.log(`📸 Common types screenshot saved: ${guideScreenshotCommon}`);

    // Check common items
    const commonItems = await page.$$eval('#eatsafe-licence-popover > .eatsafe-fidelity-scroll > .eatsafe-fidelity-item', items =>
      items.map(it => ({
        name: it.querySelector('.eatsafe-fidelity-item-name')?.textContent.trim() || '',
        color: window.getComputedStyle(it.querySelector('.eatsafe-fidelity-item-name')).color,
        desc: it.querySelector('.eatsafe-fidelity-item-desc')?.textContent.trim() || ''
      }))
    );
    console.log(`✅ Loaded ${commonItems.length} common licence types:`);
    for (const it of commonItems) {
      console.log(`   - "${it.name}" (color: ${it.color})`);
    }
    if (commonItems.length < 6) {
      throw new Error(`Expected 6 common licence types, got ${commonItems.length}`);
    }

    // Verify all titles have the exact same color
    const referenceColor = commonItems[0].color;
    for (const it of commonItems) {
      if (it.color !== referenceColor) {
        throw new Error(`Color mismatch: "${it.name}" has color ${it.color}, expected ${referenceColor}`);
      }
    }
    console.log(`✅ Verified all common items share identical green color: ${referenceColor}`);

    // Click accordion to expand "Other licence types & permits"
    console.log('\nExpanding accordion for all other Hong Kong licence types & permits...');
    await page.click('#eatsafe-guide-accordion-btn');
    await page.waitForSelector('#eatsafe-guide-accordion-content.open', { timeout: 3000 });

    const otherItems = await page.$$eval('#eatsafe-guide-accordion-content .eatsafe-fidelity-item', items =>
      items.map(it => ({
        name: it.querySelector('.eatsafe-fidelity-item-name')?.textContent.trim() || '',
        color: window.getComputedStyle(it.querySelector('.eatsafe-fidelity-item-name')).color,
        desc: it.querySelector('.eatsafe-fidelity-item-desc')?.textContent.trim() || ''
      }))
    );
    console.log(`✅ Loaded ${otherItems.length} additional licence types & permits:`);
    for (const it of otherItems) {
      console.log(`   - "${it.name}" (color: ${it.color})`);
      if (it.color !== referenceColor) {
        throw new Error(`Color mismatch in other items: "${it.name}" has color ${it.color}, expected ${referenceColor}`);
      }
    }
    if (otherItems.length < 8) {
      throw new Error(`Expected at least 8 other licence types, got ${otherItems.length}`);
    }

    const totalTypes = commonItems.length + otherItems.length;
    console.log(`✅ Total Hong Kong licence types & permits in guide: ${totalTypes} (ALL same green color!)`);

    // Scroll down so the expanded licence types are visible in the screenshot
    await page.$eval('#eatsafe-guide-accordion-content', el => el.scrollIntoView({ block: 'nearest' }));
    await new Promise(r => setTimeout(r, 400));

    // Capture screenshot of expanded guide
    const guideScreenshotExpanded = path.join(artifactDir, 'screenshot_fidelity_licence_guide_expanded.png');
    await page.screenshot({ path: guideScreenshotExpanded });
    console.log(`📸 Expanded guide screenshot saved: ${guideScreenshotExpanded}`);

    // Close guide popover
    await page.$eval('#eatsafe-guide-close-btn', el => el.click());
    const isOpenAfterClose = await page.$eval('#eatsafe-licence-popover', el => el.classList.contains('open'));
    const isBtnActiveAfterClose = await page.$eval('#eatsafe-licence-guide-trigger', el => el.classList.contains('active'));
    console.log(`✅ Guide popover closed successfully: ${!isOpenAfterClose && !isBtnActiveAfterClose}`);

    // ==========================================
    // TEST 3: Kau Kee Restaurant (Day count & boxes)
    // ==========================================
    console.log('\n4. Testing Kau Kee Restaurant (Past suspension day count & boxes)...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Kau Kee Restaurant'));
      if (btn) btn.click();
    });

    await page.waitForFunction(
      () => {
        const title = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return title.toLowerCase().includes('kau kee');
      },
      { timeout: 10000 }
    );

    const kkScoreBadge = await page.$eval('.eatsafe-score-badge', el => el.textContent.trim());
    console.log(`✅ Kau Kee Score Badge: "${kkScoreBadge}"`);

    // Toggle details
    await page.$eval('#eatsafe-toggle-details', el => el.click());
    await page.waitForSelector('#eatsafe-details-panel.open', { timeout: 3000 });

    const boxesRaw = await page.$$eval('.eatsafe-violations-box', boxes =>
      boxes.map(b => ({
        startsWithNewline: b.textContent.startsWith('\n'),
        snippet: b.textContent.slice(0, 60).replace(/\s+/g, ' ')
      }))
    );
    console.log('✅ Violation boxes newline check:', JSON.stringify(boxesRaw));
    for (const b of boxesRaw) {
      if (b.startsWithNewline) {
        throw new Error(`Violation box starts with newline: "${b.snippet}"`);
      }
    }

    const kkScreenshot = path.join(artifactDir, 'screenshot_kau_kee_clean_boxes.png');
    await page.screenshot({ path: kkScreenshot });
    console.log(`📸 Screenshot saved: ${kkScreenshot}`);

    console.log('\n🎉 ALL BROWSER E2E TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
