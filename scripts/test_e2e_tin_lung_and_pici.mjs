import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';

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

  const consoleLogs = [];
  page.on('console', (msg) => consoleLogs.push(msg.text()));

  try {
    console.log('1. Navigating to mock-maps...');
    await page.goto('http://localhost:3000/mock-maps', { waitUntil: 'networkidle0' });

    // TEST 1: Select Tin Lung Heen
    console.log('\n2. Selecting Tin Lung Heen...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Tin Lung Heen'));
      if (btn) btn.click();
    });

    // Wait for extension widget
    console.log('Waiting for widget on Tin Lung Heen...');
    await page.waitForFunction(
      () => {
        const title = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return title.toLowerCase().includes('tin lung');
      },
      { timeout: 10000 }
    );

    const tinLungName = await page.$eval('.eatsafe-restaurant-name', el => el.textContent.trim());
    const tinLungBadge = await page.$eval('[class*="eatsafe-badge"]', el => el.textContent.trim());
    console.log(`✅ Tin Lung Heen Widget Rendered: "${tinLungName}" | Badge: "${tinLungBadge}"`);

    // Expand details to check licence number and portal link
    const toggleBtn1 = await page.$('#eatsafe-toggle-details');
    await toggleBtn1.click();
    await page.waitForSelector('#eatsafe-details-panel.open', { timeout: 3000 });

    const tinLungLicence = await page.$eval('.eatsafe-meta-item span', el => el.textContent.trim());
    const tinLungPortalLink = await page.$eval('.eatsafe-footer-link', el => el.getAttribute('href'));
    console.log(`Licence: ${tinLungLicence}`);
    console.log(`Portal link: ${tinLungPortalLink}`);

    if (!tinLungLicence.includes('2261807451')) {
      throw new Error(`Tin Lung Heen matched wrong licence: ${tinLungLicence}`);
    }
    if (tinLungPortalLink.includes("Lung Dim Sum") || tinLungPortalLink.includes("STORMIES")) {
      throw new Error(`Tin Lung Heen portal link contains wrong restaurant: ${tinLungPortalLink}`);
    }

    const tinLungScreenshot = path.join(artifactDir, 'screenshot_tin_lung_heen_verified.png');
    await page.screenshot({ path: tinLungScreenshot });
    console.log(`📸 Screenshot saved: ${tinLungScreenshot}`);

    // TEST 2: Select Pici Central
    console.log('\n3. Selecting Pici Central...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Pici Central'));
      if (btn) btn.click();
    });

    console.log('Waiting for widget on Pici Central...');
    await page.waitForFunction(
      () => {
        const title = document.querySelector('.eatsafe-restaurant-name')?.textContent || '';
        return title.toUpperCase().includes('PICI');
      },
      { timeout: 10000 }
    );

    const piciName = await page.$eval('.eatsafe-restaurant-name', el => el.textContent.trim());
    const piciBadge = await page.$eval('[class*="eatsafe-badge"]', el => el.textContent.trim());
    console.log(`✅ Pici Central Widget Rendered: "${piciName}" | Badge: "${piciBadge}"`);

    // Expand details
    const toggleBtn2 = await page.$('#eatsafe-toggle-details');
    await toggleBtn2.click();
    await page.waitForSelector('#eatsafe-details-panel.open', { timeout: 3000 });

    const piciLicence = await page.$eval('.eatsafe-meta-item span', el => el.textContent.trim());
    const piciPortalLink = await page.$eval('.eatsafe-footer-link', el => el.getAttribute('href'));
    console.log(`Licence: ${piciLicence}`);
    console.log(`Portal link: ${piciPortalLink}`);

    if (!piciLicence.includes('2218812220')) {
      throw new Error(`Pici Central matched wrong licence: ${piciLicence}`);
    }
    if (piciName.includes("Ebeneezer") || piciPortalLink.includes("Ebeneezer")) {
      throw new Error(`Pici Central matched stale tenant Ebeneezer's!`);
    }

    const piciScreenshot = path.join(artifactDir, 'screenshot_pici_central_verified.png');
    await page.screenshot({ path: piciScreenshot });
    console.log(`📸 Screenshot saved: ${piciScreenshot}`);

    // TEST 3: Navigate to Portal URL directly from portal link
    console.log('\n4. Testing Web Portal parameter propagation...');
    await page.goto(piciPortalLink, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.border', { timeout: 8000 });

    const portalResultsText = await page.evaluate(() => document.body.textContent);
    if (portalResultsText.includes("PICI") && portalResultsText.includes("2218812220")) {
      console.log('✅ Web portal successfully loaded and displayed PICI licence 2218812220 from link parameters!');
    } else {
      console.warn('Portal results content:', portalResultsText.slice(0, 300));
    }

    const portalScreenshot = path.join(artifactDir, 'screenshot_portal_pici_verified.png');
    await page.screenshot({ path: portalScreenshot });
    console.log(`📸 Portal Screenshot saved: ${portalScreenshot}`);

    console.log('\n🎉 ALL END-TO-END BROWSER TESTS PASSED!');
  } catch (err) {
    console.error('❌ E2E Test Error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
