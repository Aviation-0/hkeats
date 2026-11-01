import puppeteer from 'puppeteer';
import path from 'node:path';

const artifactDir = 'C:/Users/lucas/.gemini/antigravity/brain/46b572e6-99c7-4c83-810b-3bd570a26382';
const extensionPath = path.resolve(process.cwd(), 'extension');

async function run() {
  console.log('🚀 Launching Puppeteer with EatSafe HK extension from:', extensionPath);

  const browser = await puppeteer.launch({
    headless: false,
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
    console.log('BROWSER CONSOLE:', msg.text());
  });
  page.on('pageerror', (err) => {
    console.log('BROWSER PAGE ERROR:', err.message);
  });

  try {
    console.log('1. Navigating to mock-maps on Cloudflare Pages...');
    const mockMapsUrl = process.env.MOCK_URL || 'https://eatsafe-hk.pages.dev/mock-maps';
    await page.goto(mockMapsUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // TEST 1: Select Sing Heung Yuen (勝香園)
    console.log('\n2. Testing Sing Heung Yuen (勝香園)...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Sing Heung Yuen'));
      if (btn) btn.click();
    });

    console.log('Waiting for widget on Sing Heung Yuen...');
    await page.waitForFunction(
      () => {
        const title = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return title.toLowerCase().includes('sing heung');
      },
      { timeout: 10000 }
    );

    const shyName = await page.$eval('.eatsafe-restaurant-name', el => el.textContent.trim());
    const shyHeaderBadge = await page.$eval('.eatsafe-header-badge', el => el.textContent.trim());
    const shyScoreBadge = await page.$eval('.eatsafe-score-badge', el => el.textContent.trim());
    console.log(`✅ Sing Heung Yuen Rendered: "${shyName}"`);
    console.log(`   Header Badge: "${shyHeaderBadge}" | Score Badge: "${shyScoreBadge}"`);

    // Expand details to check licence number and portal link
    const toggleBtn1 = await page.$('#eatsafe-toggle-details');
    await toggleBtn1.click();
    await page.waitForSelector('#eatsafe-details-panel.open', { timeout: 3000 });

    const shyLicence = await page.$eval('.eatsafe-meta-item span', el => el.textContent.trim());
    const shyPortalLink = await page.$eval('.eatsafe-footer-link', el => el.getAttribute('href'));
    console.log(`   Licence: ${shyLicence} | Portal link: ${shyPortalLink}`);

    if (shyLicence.includes('2213018504') || shyLicence.includes('2218810020')) {
      throw new Error(`CRITICAL ERROR: Sing Heung Yuen still matched Wing Lok Yuen or Hang Heung: ${shyLicence}`);
    }
    if (!shyLicence.includes('HAWKER-FP-CW-02')) {
      throw new Error(`Expected Hawker licence HAWKER-FP-CW-02, got: ${shyLicence}`);
    }

    const shyScreenshot = path.join(artifactDir, 'screenshot_sing_heung_yuen_verified.png');
    await page.screenshot({ path: shyScreenshot });
    console.log(`📸 Screenshot saved: ${shyScreenshot}`);

    // TEST 2: Select Wing Lok Yuen Restaurant (永樂園餐廳)
    console.log('\n3. Testing Wing Lok Yuen Restaurant (永樂園餐廳)...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Wing Lok Yuen'));
      if (btn) btn.click();
    });

    console.log('Waiting for widget on Wing Lok Yuen...');
    await page.waitForFunction(
      () => {
        const title = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return title.toLowerCase().includes('wing lok');
      },
      { timeout: 10000 }
    );

    const wlyName = await page.$eval('.eatsafe-restaurant-name', el => el.textContent.trim());
    const wlyHeaderBadge = await page.$eval('.eatsafe-header-badge', el => el.textContent.trim());
    console.log(`✅ Wing Lok Yuen Rendered: "${wlyName}" | Header Badge: "${wlyHeaderBadge}"`);

    const toggleBtn2 = await page.$('#eatsafe-toggle-details');
    await toggleBtn2.click();
    await page.waitForSelector('#eatsafe-details-panel.open', { timeout: 3000 });

    const wlyLicence = await page.$eval('.eatsafe-meta-item span', el => el.textContent.trim());
    console.log(`   Licence: ${wlyLicence}`);
    if (!wlyLicence.includes('2213018504')) {
      throw new Error(`Wing Lok Yuen matched wrong licence: ${wlyLicence}`);
    }

    const wlyScreenshot = path.join(artifactDir, 'screenshot_wing_lok_yuen_verified.png');
    await page.screenshot({ path: wlyScreenshot });
    console.log(`📸 Screenshot saved: ${wlyScreenshot}`);

    // TEST 3: Select Kau Kee Restaurant (九記清湯牛腩)
    console.log('\n4. Testing Kau Kee Restaurant (九記清湯牛腩)...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Kau Kee'));
      if (btn) btn.click();
    });

    console.log('Waiting for widget on Kau Kee...');
    await page.waitForFunction(
      () => {
        const title = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return title.toLowerCase().includes('kau kee');
      },
      { timeout: 10000 }
    );

    const kauKeeName = await page.$eval('.eatsafe-restaurant-name', el => el.textContent.trim());
    const kauKeeHeaderBadge = await page.$eval('.eatsafe-header-badge', el => el.textContent.trim());
    console.log(`✅ Kau Kee Rendered: "${kauKeeName}" | Header Badge: "${kauKeeHeaderBadge}"`);

    const toggleBtn3 = await page.$('#eatsafe-toggle-details');
    await toggleBtn3.click();
    await page.waitForSelector('#eatsafe-details-panel.open', { timeout: 3000 });

    const kauKeeLicence = await page.$eval('.eatsafe-meta-item span', el => el.textContent.trim());
    console.log(`   Licence: ${kauKeeLicence}`);
    if (!kauKeeLicence.includes('2213072052')) {
      throw new Error(`Kau Kee matched wrong licence: ${kauKeeLicence}`);
    }

    const kauKeeScreenshot = path.join(artifactDir, 'screenshot_kau_kee_verified.png');
    await page.screenshot({ path: kauKeeScreenshot });
    console.log(`📸 Screenshot saved: ${kauKeeScreenshot}`);

    // TEST 4: Select Lan Fong Yuen (蘭芳園)
    console.log('\n5. Testing Lan Fong Yuen (蘭芳園)...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Lan Fong Yuen'));
      if (btn) btn.click();
    });

    console.log('Waiting for widget on Lan Fong Yuen...');
    await page.waitForFunction(
      () => {
        const title = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return title.toLowerCase().includes('lan fong');
      },
      { timeout: 10000 }
    );

    const lanFongName = await page.$eval('.eatsafe-restaurant-name', el => el.textContent.trim());
    const lanFongHeaderBadge = await page.$eval('.eatsafe-header-badge', el => el.textContent.trim());
    console.log(`✅ Lan Fong Yuen Rendered: "${lanFongName}" | Header Badge: "${lanFongHeaderBadge}"`);

    const toggleBtn4 = await page.$('#eatsafe-toggle-details');
    await toggleBtn4.click();
    await page.waitForSelector('#eatsafe-details-panel.open', { timeout: 3000 });

    const lanFongLicence = await page.$eval('.eatsafe-meta-item span', el => el.textContent.trim());
    console.log(`   Licence: ${lanFongLicence}`);
    if (!lanFongLicence.includes('3113068330')) {
      throw new Error(`Lan Fong Yuen matched wrong licence: ${lanFongLicence}`);
    }

    const lanFongScreenshot = path.join(artifactDir, 'screenshot_lan_fong_yuen_verified.png');
    await page.screenshot({ path: lanFongScreenshot });
    console.log(`📸 Screenshot saved: ${lanFongScreenshot}`);

    console.log('\n==================================================');
    console.log('🎉 ALL END-TO-END BROWSER TESTS PASSED PERFECTLY!');
    console.log('==================================================');
  } catch (err) {
    console.error('❌ E2E Test Error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
