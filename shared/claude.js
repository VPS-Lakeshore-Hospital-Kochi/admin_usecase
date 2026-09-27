/* Lakeshore Admin Hub — shared runtime.
 * Hub.mountHeader({ dept, title })   → renders the top bar
 * Hub.ask({ system, prompt, demo })  → Promise<string>: live Claude call if an API key is
 *                                      set, otherwise returns the pre-written `demo` text
 * Hub.run({ out, button, system, prompt, demo, manualMinutes }) → ask + render + time-saved strip
 * Hub.md(text)                        → minimal Markdown → HTML
 * Hub.inr(n)                          → Indian-format rupee string
 */
(function () {
  const KEY = 'lhub.apiKey', MODEL = 'lhub.model';
  const DEFAULT_MODEL = 'claude-sonnet-5';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} },
  };
  const isLive = () => !!store.get(KEY);
  const root = document.currentScript && document.currentScript.src.includes('/shared/')
    ? document.currentScript.src.replace(/shared\/claude\.js.*$/, '') : './';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  function md(text) {
    const lines = String(text).replace(/\r/g, '').split('\n');
    let html = '', list = null, i = 0;
    const close = () => { if (list) { html += `</${list}>`; list = null; } };
    while (i < lines.length) {
      const l = lines[i];
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[i + 1])) {
        close();
        const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const head = cells(l); i += 2;
        html += '<div class="table-wrap"><table><thead><tr>' + head.map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>';
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          html += '<tr>' + cells(lines[i]).map(c => `<td>${inline(c)}</td>`).join('') + '</tr>'; i++;
        }
        html += '</tbody></table></div>';
        continue;
      }
      let m;
      if ((m = l.match(/^(#{1,4})\s+(.*)/))) { close(); const n = Math.min(m[1].length + 1, 4); html += `<h${n}>${inline(m[2])}</h${n}>`; }
      else if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (list !== 'ul') { close(); html += '<ul>'; list = 'ul'; } html += `<li>${inline(m[1])}</li>`; }
      else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { close(); html += '<ol>'; list = 'ol'; } html += `<li>${inline(m[1])}</li>`; }
      else if (/^\s*---+\s*$/.test(l)) { close(); html += '<hr>'; }
      else if (l.trim() === '') { close(); }
      else { close(); html += `<p>${inline(l)}</p>`; }
      i++;
    }
    close();
    return html;
  }

  async function ask({ system, prompt, demo, maxTokens = 2000 }) {
    const key = store.get(KEY);
    if (!key) {
      await new Promise(r => setTimeout(r, 900 + Math.random() * 700));
      return typeof demo === 'function' ? demo() : (demo || '_No demo output provided._');
    }
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: store.get(MODEL) || DEFAULT_MODEL,
        max_tokens: maxTokens,
        system: (system || '') + '\n\nYou work for VPS Lakeshore Hospital, Kochi (LHRC). Reply in concise, well-structured Markdown. Use Indian number formatting (lakh/crore) for money.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  }

  async function run({ out, button, system, prompt, demo, manualMinutes, maxTokens }) {
    const el = typeof out === 'string' ? document.querySelector(out) : out;
    const btn = typeof button === 'string' ? document.querySelector(button) : button;
    if (btn) btn.disabled = true;
    el.innerHTML = `<p class="thinking">Claude is ${isLive() ? 'working' : 'working (demo mode)'}</p>`;
    const t0 = performance.now();
    try {
      const text = await ask({ system, prompt, demo, maxTokens });
      const secs = Math.max(1, Math.round((performance.now() - t0) / 1000));
      el.innerHTML = md(text) + (manualMinutes
        ? `<div class="saved"><span>Manual effort: <b>~${manualMinutes} min</b></span><span>With Claude: <b>${secs} s</b> + review</span></div>` : '');
      return text;
    } catch (e) {
      el.innerHTML = `<p class="tag bad">Error</p><p>${esc(e.message)}</p>`;
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function settings() {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal" role="dialog" aria-label="Claude settings">
      <h2>Claude connection</h2>
      <p class="small">Without a key the hub runs in <b>demo mode</b> with pre-written sample outputs.
      With a key, every prototype calls Claude live from your browser. The key is stored only in this browser.</p>
      <label for="hk">Anthropic API key</label><input id="hk" type="password" placeholder="sk-ant-..." value="${esc(store.get(KEY) || '')}">
      <label for="hm">Model</label><input id="hm" value="${esc(store.get(MODEL) || DEFAULT_MODEL)}">
      <div class="row" style="margin-top:14px;justify-content:flex-end">
        <button id="hclear">Clear key</button><button id="hcancel">Cancel</button><button class="primary" id="hsave">Save</button>
      </div></div>`;
    document.body.appendChild(bg);
    const done = () => { bg.remove(); location.reload(); };
    bg.querySelector('#hcancel').onclick = () => bg.remove();
    bg.querySelector('#hclear').onclick = () => { store.set(KEY, ''); done(); };
    bg.querySelector('#hsave').onclick = () => { store.set(KEY, bg.querySelector('#hk').value.trim()); store.set(MODEL, bg.querySelector('#hm').value.trim()); done(); };
  }

  function mountHeader({ dept, title } = {}) {
    const bar = document.createElement('header');
    bar.className = 'topbar';
    bar.innerHTML = `<a class="brand" href="${root}index.html">VPS Lakeshore <small>Admin Hub · powered by Claude</small></a>
      ${dept ? `<span class="pill dept">${esc(dept)}</span>` : ''}
      ${title ? `<span>${esc(title)}</span>` : ''}
      <span class="spacer"></span>
      <span class="pill ${isLive() ? 'live' : 'demo'}">${isLive() ? 'Live Claude' : 'Demo mode'}</span>
      <button type="button" id="hub-settings">Settings</button>`;
    document.body.prepend(bar);
    bar.querySelector('#hub-settings').onclick = settings;
  }

  function inr(n, digits = 0) {
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });
  }

  window.Hub = { ask, run, md, esc, inr, mountHeader, isLive, settings };
})();
