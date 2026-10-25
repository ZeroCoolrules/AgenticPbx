import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.toString());
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('Page Title:', await page.title());

  // Check CommandCenter GlobalFilterBar elements
  const dateSelect = await page.locator('select[aria-label="Filter by date range"]').first();
  const agentSelect = await page.locator('select[aria-label="Filter by specific agent"]').first();
  const statusSelect = await page.locator('select[aria-label="Filter by lead status"]').first();

  console.log('Date filter present:', await dateSelect.isVisible());
  console.log('Agent filter present:', await agentSelect.isVisible());
  console.log('Status filter present:', await statusSelect.isVisible());

  // Test selecting Agent Marcus (Ext 102)
  await agentSelect.selectOption('agent-sdr-marcus');
  await page.waitForTimeout(600);

  // Check active filter badge
  const activeBadge = page.locator('text=1 Active');
  console.log('Active badge visible:', await activeBadge.isVisible());

  // Check filtered call count
  const callsCountText = await page.locator('text=/\\d+ of \\d+ calls/').first().innerText();
  console.log('CommandCenter Call count display:', callsCountText);

  // Test Reset Filters
  const resetBtn = page.getByRole('button', { name: /Reset/i }).first();
  await resetBtn.click();
  await page.waitForTimeout(400);
  console.log('Filters reset. Active count should be 0:', !(await activeBadge.isVisible()));

  // Navigate to CRM tab
  const crmTab = page.locator('button:has-text("CRM & Leads")').first();
  await crmTab.click();
  await page.waitForTimeout(800);

  // Check CRM GlobalFilterBar
  const crmStatusSelect = page.locator('select[aria-label="Filter by lead status"]').first();
  console.log('CRM Status filter present:', await crmStatusSelect.isVisible());

  // Filter CRM leads by 'demo_booked'
  await crmStatusSelect.selectOption('demo_booked');
  await page.waitForTimeout(600);

  const crmDirText = await page.locator('text=/Prospect Directory/').first().innerText();
  console.log('CRM Prospect Directory display:', crmDirText);

  console.log('Console Errors caught:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
  }

  await browser.close();
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
