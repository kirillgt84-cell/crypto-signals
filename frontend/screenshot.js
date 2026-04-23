const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto('https://mirkaso.com', { waitUntil: 'networkidle' });
  await desktop.waitForTimeout(3000);
  await desktop.screenshot({ path: '/tmp/landing-fixed.png', fullPage: true });
  console.log('Done');
  await browser.close();
})();
