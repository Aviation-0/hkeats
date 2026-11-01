import puppeteer from 'puppeteer';
import path from 'node:path';

const artifactDir = 'C:/Users/lucas/.gemini/antigravity/brain/46b572e6-99c7-4c83-810b-3bd570a26382';
const extensionPath = path.resolve(process.cwd(), 'extension');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--window-size=1600,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });

  await page.goto('http://localhost:3000/mock-maps', { waitUntil: 'networkidle0' });

  const workerTarget = await browser.waitForTarget((t) => t.type() === 'service_worker');
  const serviceWorker = await workerTarget.worker();

  // Point to unreachable port to show offline UI
  await serviceWorker.evaluate(async () => {
    await chrome.storage.local.set({ serverUrl: 'http://localhost:59999' });
  });

  // Click place
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Samsen (Central)'));
    if (btn) btn.click();
  });

  await page.waitForFunction(
    () => {
      const card = document.getElementById('eatsafe-card');
      return card && card.classList.contains('eatsafe-card-offline');
    },
    { timeout: 10000 }
  );
  await sleep(400);

  await page.screenshot({ path: `${artifactDir}/screenshot_server_offline_friendly_card.png` });
  console.log('📸 Saved screenshot_server_offline_friendly_card.png');

  // Restore working port
  await serviceWorker.evaluate(async () => {
    await chrome.storage.local.set({ serverUrl: 'http://localhost:3000' });
  });

  await browser.close();
}

run();
