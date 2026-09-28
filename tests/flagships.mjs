// Stress test for fleshed-out demos: start a Claude step, hop through every tab while it streams,
// run each tab's main action, then reset. Fails on any page error. Covers every page with .kit-tabs.
// Usage: node tests/flagships.mjs   (PORT, CHROMIUM, ONLY=slug,slug optional)
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile, readdir } from 'fs/promises';
import { extname, join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = Number(process.env.PORT) || 8766;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(PORT);

const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const all = (await readdir(join(ROOT, 'apps'))).filter(f => f.endsWith('.html')).map(f => f.replace(/\.html$/, ''));
const pages = [];
for (const s of all) if ((await readFile(join(ROOT, 'apps', s + '.html'), 'utf8')).includes('Hub.kit.tabs')) pages.push(s);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
let failed = 0;
for (const s of ONLY.length ? ONLY : pages) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept('ok'));
  await page.goto(`http://localhost:${PORT}/apps/${s}.html`);
  await page.waitForTimeout(800);
  const tabs = await page.locator('.kit-tabs button').count();
  await page.locator('button.primary:visible').first().click();
  for (let i = 0; i < tabs; i++) { await page.locator('.kit-tabs button').nth(i).click(); await page.waitForTimeout(150); }
  await page.waitForTimeout(3000);
  for (let i = 0; i < tabs; i++) {
    await page.locator('.kit-tabs button').nth(i).click();
    await page.waitForTimeout(300);
    const pr = page.locator('button.primary:visible');
    if (await pr.count()) { await pr.first().click(); await page.waitForTimeout(150); }
  }
  await page.waitForTimeout(3000);
  await page.locator('[data-act=reset]').click();
  await page.waitForTimeout(600);
  if (errors.length) failed++;
  console.log(`${errors.length ? 'FAIL' : 'PASS'} ${s} (${tabs} tabs) ${[...new Set(errors)].join(' | ')}`);
  await ctx.close();
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
