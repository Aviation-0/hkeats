import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1600,900', '--lang=en-US'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });

  await page.goto('https://www.google.com/maps/search/Restaurants/@22.2845,114.1481,16z?hl=en', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const consentBtn = btns.find((b) => /accept all|agree/i.test(b.textContent));
    if (consentBtn) consentBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
    if (links.length > 0) links[0].click();
  });
  await new Promise(r => setTimeout(r, 4000));

  const result = await page.evaluate(() => {
    function getPlacePanelRightEdge() {
      const mockPanel = document.getElementById("mock-side-panel");
      if (mockPanel && mockPanel.offsetParent !== null && mockPanel.style.display !== "none") {
        const rect = mockPanel.getBoundingClientRect();
        if (rect.width > 50 && rect.right > 0) {
          return rect.right;
        }
      }

      const GENERIC_TITLES = new Set(["results", "sponsored", "restaurants", "search results", "dining"]);
      let placeTitleEl = null;
      const candidateTitles = document.querySelectorAll(
        "h1.DUwDvf, h1.fontHeadlineLarge, h1.ITQ08c, h1.bJzME, h1.Q41nfe, .x352Kt h1, .fpN89e h1, div[role='main'] h1, h1"
      );
      for (const el of candidateTitles) {
        if (el.offsetParent === null) continue;
        const text = (el.textContent || "").trim().toLowerCase();
        if (text && !GENERIC_TITLES.has(text) && !text.startsWith("sponsored")) {
          placeTitleEl = el;
          break;
        }
      }

      let bestRight = 0;

      if (placeTitleEl) {
        let curr = placeTitleEl;
        while (curr && curr !== document.body) {
          const rect = curr.getBoundingClientRect();
          if (rect.width >= 260 && rect.width <= 1100 && rect.height >= 200) {
            if (rect.right > bestRight && rect.right < window.innerWidth - 60) {
              bestRight = rect.right;
            }
          }
          curr = curr.parentElement;
        }
      }

      const masterContainer = document.querySelector(".w6VYqd, .XltNde");
      if (masterContainer && masterContainer.offsetParent !== null) {
        const mRect = masterContainer.getBoundingClientRect();
        if (mRect.width >= 300 && mRect.width <= 1200 && mRect.right > bestRight && mRect.right < window.innerWidth - 60) {
          bestRight = mRect.right;
        }
      }

      const panelTabs = document.querySelectorAll(".noYW3, .widget-pane, div[role='region']");
      for (const tab of panelTabs) {
        if (tab.offsetParent === null) continue;
        const tRect = tab.getBoundingClientRect();
        if (tRect.width >= 260 && tRect.width <= 600 && tRect.right > bestRight && tRect.right < window.innerWidth - 60) {
          bestRight = tRect.right;
        }
      }

      const toggleBtns = document.querySelectorAll(
        "button[aria-label*='Collapse'], button[aria-label*='collapse'], button[aria-label*='side panel'], .widget-pane-toggle-button"
      );
      for (const btn of toggleBtns) {
        if (btn.offsetParent === null) continue;
        const bRect = btn.getBoundingClientRect();
        if (bRect.width > 0 && bRect.left >= bestRight - 30 && bRect.right <= bestRight + 70) {
          bestRight = Math.max(bestRight, bRect.right);
        }
      }

      return {
        bestRight,
        targetLeft: Math.round(bestRight + 14),
        placeTitle: placeTitleEl ? placeTitleEl.textContent.trim() : null,
      };
    }

    return getPlacePanelRightEdge();
  });

  console.log('TEST RESULT:', JSON.stringify(result, null, 2));
  await browser.close();
}

run();
