// Smoke test: load hub + every app, click the primary Run button(s), check output and JS errors.
// Usage: node tests/smoke.mjs   (serves the repo on :8765 itself)
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile, readdir } from 'fs/promises';
import { extname, join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(8765);

const APPS = (await readdir(join(ROOT, 'apps'))).filter(f => f.endsWith('.html')).map(f => f.replace(/\.html$/, ''));
// ONLY=slug[,slug] limits the run to those prototypes (hub and governance are skipped)
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
let failed = 0;

const PAGES = ONLY.length ? ONLY.flatMap(a => [[`apps/${a}.html`, 1280], [`apps/${a}.html`, 375]])
  : [['index.html', 1280], ['governance.html', 1280], ['governance.html', 375], ...APPS.flatMap(a => [[`apps/${a}.html`, 1280], [`apps/${a}.html`, 375]])];
for (const [path, width] of PAGES) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith('http://localhost') && !r.url().endsWith('favicon.ico')) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(`http://localhost:8765/${path}`);
  let note = '';
  if (path === 'index.html') {
    const hrefs = await page.$$eval('a.tile', as => as.map(a => a.getAttribute('href')));
    for (const h of hrefs) if (!APPS.includes(h.replace(/^apps\/|\.html$/g, ''))) errors.push(`broken tile link ${h}`);
    note = `${hrefs.length} tiles`;
  } else if (path === 'governance.html') {
    const links = await page.locator('a[href^="apps/"]').count();
    note = `${links} app links`;
    if (links !== APPS.length) errors.push(`governance links ${links} of ${APPS.length} apps`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) errors.push(`horizontal overflow at ${width}px`);
  } else {
    const btn = page.locator('button.primary:visible').first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForFunction(() => [...document.querySelectorAll('.claude-out')].some(e => e.textContent.length > 200 && !e.querySelector('.thinking')), null, { timeout: 8000 })
        .then(() => note = 'output ok').catch(() => { note = 'NO OUTPUT'; errors.push('no output'); });
      if (!(await page.locator('.hub-docx').count())) errors.push('no Word download button');
      const tas = await page.locator('.card textarea:not([data-upload=off])').count(), ups = await page.locator('.hub-upload').count();
      if (ups < tas) errors.push(`upload controls ${ups} of ${tas} textareas`);
    } else { errors.push('no primary button'); }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) errors.push(`horizontal overflow at ${width}px`);
  }
  if (errors.length) failed++;
  console.log(`${errors.length ? 'FAIL' : 'PASS'} ${path} @${width} ${note} ${errors.join(' | ')}`);
  await page.close();
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
