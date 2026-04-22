const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto('https://mirkaso.com', { waitUntil: 'networkidle' });
  await desktop.waitForTimeout(3000);
  await desktop.screenshot({ path: '/tmp/landing-desktop-delayed.png', fullPage: true });
  console.log('Desktop done');
  
  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await mobile.goto('https://mirkaso.com', { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(3000);
  await mobile.screenshot({ path: '/tmp/landing-mobile-delayed.png', fullPage: true });
  console.log('Mobile done');
  
  await browser.close();
})();
