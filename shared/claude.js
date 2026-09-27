/* Lakeshore Admin Hub — shared runtime.
 * Hub.mountHeader({ dept, title })   → renders the top bar
 * Hub.ask({ system, prompt, demo })  → Promise<string>: live Claude call if an API key is
 *                                      set, otherwise returns the pre-written `demo` text
 * Hub.run({ out, button, system, prompt, demo, manualMinutes }) → ask + render + time-saved strip
 * Hub.md(text)                        → minimal Markdown → HTML
 * Hub.inr(n)                          → Indian-format rupee string
 * Hub.wordDownload(markdown)          → download a VPS Lakeshore-branded .docx of the text
 * Every textarea inside a .card gets an "Upload file" control (txt/csv/md/json/xlsx/docx/pdf),
 * read entirely in the browser. Libraries in shared/vendor/ load only when first needed.
 */
(function () {
  const KEY = 'lhub.apiKey', MODEL = 'lhub.model', MODE = 'lhub.mode', GW = 'lhub.gateway', PASS = 'lhub.passcode';
  const DEFAULT_MODEL = 'claude-opus-5';
  // Set this to the deployed proxy URL (see proxy/README.md) so presenters only need the passcode.
  const DEFAULT_GATEWAY = '';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} },
  };
  const gatewayUrl = () => (store.get(GW) || DEFAULT_GATEWAY).replace(/\/+$/, '');
  // 'demo' | 'gateway' (hospital proxy + passcode) | 'key' (own API key, direct from browser)
  function mode() {
    const m = store.get(MODE);
    if (m === 'gateway' && gatewayUrl() && store.get(PASS)) return 'gateway';
    if (m === 'key' && store.get(KEY)) return 'key';
    if (!m && store.get(KEY)) return 'key'; // keys saved before modes existed
    return 'demo';
  }
  const isLive = () => mode() !== 'demo';
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

  const HOUSE_STYLE = '\n\nYou work for VPS Lakeshore Hospital, Kochi (LHRC). Reply in concise, well-structured Markdown. Use Indian number formatting (lakh/crore) for money. All data you are given is synthetic demo data.';

  // Streams a Messages API response, calling onText(fullTextSoFar) as text arrives.
  async function ask({ system, prompt, messages, demo, maxTokens = 16000, onText }) {
    const m = mode();
    if (m === 'demo') {
      const text = typeof demo === 'function' ? demo() : (demo || '_No demo output provided._');
      await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
      if (onText) { // replay the demo as a stream so demo mode feels like live mode
        const parts = text.split(/(?<=\s)/);
        let acc = '';
        for (let i = 0; i < parts.length; i += 6) {
          acc += parts.slice(i, i + 6).join('');
          onText(acc);
          await new Promise(r => setTimeout(r, 12));
        }
      }
      return text;
    }
    const headers = { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'anthropic-beta': 'server-side-fallback-2026-07-01' };
    let url;
    if (m === 'gateway') { url = gatewayUrl() + '/v1/messages'; headers['x-hub-passcode'] = store.get(PASS); }
    else { url = 'https://api.anthropic.com/v1/messages'; headers['x-api-key'] = store.get(KEY); headers['anthropic-dangerous-direct-browser-access'] = 'true'; }
    const res = await fetch(url, {
      method: 'POST', headers,
      body: JSON.stringify({
        model: store.get(MODEL) || DEFAULT_MODEL,
        max_tokens: maxTokens,
        stream: true,
        fallbacks: 'default',
        system: (system || '') + HOUSE_STYLE,
        messages: messages || [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      if (res.status === 401 && m === 'gateway') throw new Error('The hospital gateway rejected the passcode. Check it under Settings.');
      if (res.status === 429) throw new Error('Usage limit reached for now. Try again shortly, or switch to demo mode under Settings.');
      throw new Error(`Claude API ${res.status}: ${body}`);
    }
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = '', text = '', stop = null;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
        const data = chunk.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
        if (!data) continue;
        let ev; try { ev = JSON.parse(data); } catch (e) { continue; }
        if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') { text += ev.delta.text; if (onText) onText(text); }
        else if (ev.type === 'message_delta' && ev.delta) stop = ev.delta.stop_reason || stop;
        else if (ev.type === 'error') throw new Error((ev.error && ev.error.message) || 'Stream error');
      }
    }
    if (stop === 'refusal') throw new Error('Claude declined this request. Rephrase the input, or use demo mode to see the sample output.');
    if (stop === 'max_tokens') text += '\n\n_(Output was cut off at the length limit.)_';
    return text;
  }

  async function run({ out, button, system, prompt, demo, manualMinutes, maxTokens }) {
    const el = typeof out === 'string' ? document.querySelector(out) : out;
    const btn = typeof button === 'string' ? document.querySelector(button) : button;
    if (btn) btn.disabled = true;
    el.innerHTML = `<p class="thinking">Claude is ${isLive() ? 'working' : 'working (demo mode)'}</p>`;
    const t0 = performance.now();
    let frame = 0;
    const onText = partial => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { el.innerHTML = md(partial) + '<p class="thinking">Writing</p>'; }); };
    try {
      const text = await ask({ system, prompt, demo, maxTokens, onText });
      cancelAnimationFrame(frame);
      const secs = Math.max(1, Math.round((performance.now() - t0) / 1000));
      el.innerHTML = md(text) + (manualMinutes
        ? `<div class="saved"><span>Manual effort: <b>~${manualMinutes} min</b></span><span>With Claude: <b>${secs} s</b> + review</span></div>` : '');
      const bar = document.createElement('div');
      bar.className = 'row';
      bar.style.marginTop = '10px';
      bar.innerHTML = '<button type="button" class="hub-docx">Download Word (.docx)</button><span class="small">VPS Lakeshore format · review before circulating</span>';
      bar.querySelector('button').onclick = e => wordDownload(text, e.currentTarget);
      el.appendChild(bar);
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
    const m = mode(), cur = store.get(MODE) || (store.get(KEY) ? 'key' : 'demo');
    const opt = (v, label) => `<label style="display:flex;gap:8px;align-items:flex-start;color:var(--text);font-weight:400"><input type="radio" name="hmode" value="${v}" style="width:auto;margin-top:4px" ${cur === v ? 'checked' : ''}>${label}</label>`;
    bg.innerHTML = `<div class="modal" role="dialog" aria-label="Claude settings">
      <h2>Claude connection</h2>
      <p class="small">Currently: <b>${m === 'demo' ? 'Demo mode' : m === 'gateway' ? 'Hospital gateway' : 'Own API key'}</b></p>
      ${opt('demo', '<span><b>Demo mode</b> — pre-written sample outputs. Works offline; Claude does not read your input.</span>')}
      ${opt('gateway', '<span><b>Hospital gateway</b> — live Claude through the hospital proxy. Needs the access passcode from IT.</span>')}
      <div id="hgw" style="margin-left:24px">
        <label for="hurl">Gateway URL</label><input id="hurl" placeholder="https://lakeshore-hub.example.workers.dev" value="${esc(store.get(GW) || DEFAULT_GATEWAY)}">
        <label for="hpass">Passcode</label><input id="hpass" type="password" value="${esc(store.get(PASS) || '')}">
      </div>
      ${opt('key', '<span><b>Own API key</b> — live Claude directly from this browser (developers only). Key stays in this browser.</span>')}
      <div id="hkey" style="margin-left:24px"><label for="hk">Anthropic API key</label><input id="hk" type="password" placeholder="sk-ant-..." value="${esc(store.get(KEY) || '')}"></div>
      <label for="hm">Model</label><input id="hm" value="${esc(store.get(MODEL) || DEFAULT_MODEL)}">
      <div class="row" style="margin-top:14px;justify-content:flex-end">
        <button id="hclear">Forget credentials</button><button id="hcancel">Cancel</button><button class="primary" id="hsave">Save</button>
      </div></div>`;
    document.body.appendChild(bg);
    const done = () => { bg.remove(); location.reload(); };
    bg.querySelector('#hcancel').onclick = () => bg.remove();
    bg.querySelector('#hclear').onclick = () => { [KEY, PASS, MODE].forEach(k => store.set(k, '')); done(); };
    bg.querySelector('#hsave').onclick = () => {
      const v = (bg.querySelector('input[name=hmode]:checked') || {}).value || 'demo';
      store.set(MODE, v);
      store.set(GW, bg.querySelector('#hurl').value.trim());
      store.set(PASS, bg.querySelector('#hpass').value.trim());
      store.set(KEY, bg.querySelector('#hk').value.trim());
      const model = bg.querySelector('#hm').value.trim();
      store.set(MODEL, model && model !== DEFAULT_MODEL ? model : '');
      done();
    };
  }

  const pageMeta = {};
  function mountHeader({ dept, title } = {}) {
    Object.assign(pageMeta, { dept, title });
    const bar = document.createElement('header');
    bar.className = 'topbar';
    bar.innerHTML = `<a class="brand" href="${root}index.html">VPS Lakeshore <small>Admin Hub · powered by Claude</small></a>
      ${dept ? `<span class="pill dept">${esc(dept)}</span>` : ''}
      ${title ? `<span>${esc(title)}</span>` : ''}
      <span class="spacer"></span>
      <span class="pill ${isLive() ? 'live' : 'demo'}">${mode() === 'gateway' ? 'Live · hospital gateway' : isLive() ? 'Live Claude' : 'Demo mode'}</span>
      <button type="button" id="hub-settings">Settings</button>`;
    document.body.prepend(bar);
    bar.querySelector('#hub-settings').onclick = settings;
  }


  /* ---------- vendor loading ---------- */
  const VENDOR = root + 'shared/vendor/';
  const loaded = {};
  function loadScript(file, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    return loaded[file] || (loaded[file] = new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = VENDOR + file;
      sc.onload = () => window[globalName] ? res(window[globalName]) : rej(new Error(file + ' did not load'));
      sc.onerror = () => rej(new Error('Could not load ' + file));
      document.head.appendChild(sc);
    }));
  }

  /* ---------- file upload → text ---------- */
  const MAX_MB = 10;
  async function fileToText(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (file.size > MAX_MB * 1024 * 1024) throw new Error(`File is over ${MAX_MB} MB`);
    if (['xlsx', 'xls', 'xlsm', 'ods'].includes(ext)) {
      const XLSX = await loadScript('xlsx.full.min.js', 'XLSX');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      return wb.SheetNames.map(n => {
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[n], { FS: ' | ', blankrows: false }).trim();
        return wb.SheetNames.length > 1 ? `## Sheet: ${n}\n${csv}` : csv;
      }).join('\n\n');
    }
    if (ext === 'docx') {
      const mammoth = await loadScript('mammoth.browser.min.js', 'mammoth');
      return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value.trim();
    }
    if (ext === 'pdf') {
      const pdfjs = await loadScript('pdf.min.js', 'pdfjsLib');
      pdfjs.GlobalWorkerOptions.workerSrc = VENDOR + 'pdf.worker.min.js';
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const pages = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const tc = await (await doc.getPage(i)).getTextContent();
        let line = '', out = [];
        tc.items.forEach(it => { line += it.str; if (it.hasEOL) { out.push(line); line = ''; } else line += ' '; });
        if (line.trim()) out.push(line);
        pages.push(out.map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n'));
      }
      const text = pages.join('\n\n').trim();
      if (!text) throw new Error('No text found — the PDF may be a scanned image');
      return text;
    }
    if (['txt', 'csv', 'tsv', 'md', 'json', 'log'].includes(ext) || file.type.startsWith('text/')) return (await file.text()).trim();
    throw new Error('Unsupported file type .' + ext + ' — use txt, csv, xlsx, docx or pdf');
  }

  function wireUploads() {
    document.querySelectorAll('.card textarea').forEach((ta, i) => {
      if (ta.dataset.upload === 'off' || ta.previousElementSibling?.classList.contains('hub-upload')) return;
      const row = document.createElement('div');
      row.className = 'row hub-upload';
      row.style.margin = '4px 0';
      const id = 'hub-file-' + i;
      row.innerHTML = `<label class="btn" for="${id}" style="margin:0;color:var(--text);font-size:13px;padding:4px 10px;cursor:pointer">Upload file</label>
        <input id="${id}" type="file" accept=".txt,.csv,.tsv,.md,.json,.xlsx,.xls,.xlsm,.ods,.docx,.pdf" style="display:none">
        <span class="small">txt, csv, xlsx, docx or pdf — read in your browser, not uploaded anywhere</span>`;
      ta.parentNode.insertBefore(row, ta);
      const input = row.querySelector('input'), note = row.querySelector('.small');
      input.onchange = async () => {
        const f = input.files[0]; if (!f) return;
        note.textContent = `Reading ${f.name}…`;
        try {
          ta.value = await fileToText(f);
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          ta.dispatchEvent(new Event('change', { bubbles: true }));
          note.textContent = `Loaded ${f.name} (${ta.value.length.toLocaleString('en-IN')} characters). Check it before running.`;
        } catch (e) { note.textContent = e.message; }
        input.value = '';
      };
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireUploads); else setTimeout(wireUploads);

  /* ---------- branded Word export ---------- */
  const NAVY = '001E5F', MAGENTA = 'D81054', CREAM = 'FDFAE7', GREY = 'D9DDE8', INK = '162A54', SLATE = '5C6480', FONT = 'DM Sans';

  function mdBlocks(text) {
    const lines = String(text).replace(/\r/g, '').split('\n'), out = [];
    const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]; let m;
      if (/^\s*\|.*\|\s*$/.test(l) && /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[i + 1] || '')) {
        const rows = [cells(l)]; i += 2;
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
        i--; out.push({ t: 'table', rows });
      } else if ((m = l.match(/^(#{1,4})\s+(.*)/))) out.push({ t: 'h', level: m[1].length, text: m[2] });
      else if ((m = l.match(/^(\s*)[-*•]\s+(.*)/))) out.push({ t: 'ul', level: Math.min(2, Math.floor(m[1].length / 2)), text: m[2] });
      else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) out.push({ t: 'ol', text: m[1] });
      else if (/^\s*---+\s*$/.test(l)) out.push({ t: 'hr' });
      else if (l.trim()) out.push({ t: 'p', text: l.trim() });
      else out.push({ t: 'gap' });
    }
    return out;
  }

  function runs(D, text, base = {}) {
    const parts = [], re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parts.push(new D.TextRun({ text: text.slice(last, m.index), ...base }));
      const t = m[0];
      if (t.startsWith('**')) parts.push(new D.TextRun({ text: t.slice(2, -2), ...base, font: 'DM Sans SemiBold' })); // brand: SemiBold, never Bold
      else if (t.startsWith('`')) parts.push(new D.TextRun({ text: t.slice(1, -1), font: 'Consolas', ...base }));
      else parts.push(new D.TextRun({ text: t.slice(1, -1), italics: true, ...base }));
      last = m.index + t.length;
    }
    if (last < text.length) parts.push(new D.TextRun({ text: text.slice(last), ...base }));
    return parts.length ? parts : [new D.TextRun({ text: '', ...base })];
  }

  function docTable(D, rows) {
    const width = Math.max(...rows.map(r => r.length));
    const border = { style: D.BorderStyle.SINGLE, size: 4, color: GREY };
    const borders = { top: border, bottom: border, left: border, right: border };
    return new D.Table({
      width: { size: 100, type: D.WidthType.PERCENTAGE },
      rows: rows.map((r, ri) => new D.TableRow({
        tableHeader: ri === 0,
        children: Array.from({ length: width }, (_, ci) => {
          const txt = r[ci] || '', num = ri > 0 && /^[₹\-–+]?\s?[\d,.]+\s?(%|L|lakh|Cr|cr|crore)?$/.test(txt.replace(/\*/g, ''));
          return new D.TableCell({
            borders,
            shading: ri === 0 ? { type: D.ShadingType.CLEAR, color: 'auto', fill: NAVY } : undefined,
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new D.Paragraph({
              alignment: num ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT,
              children: runs(D, txt, ri === 0 ? { color: 'FFFFFF', size: 18 } : { size: 18 }),
            })],
          });
        }),
      })),
    });
  }

  async function wordDownload(text, btn, titleOverride) {
    const label = btn && btn.textContent;
    if (btn) { btn.disabled = true; btn.textContent = 'Preparing…'; }
    try {
      const D = await loadScript('docx.iife.js', 'docx');
      const title = titleOverride || pageMeta.title || (document.querySelector('h1') || {}).textContent || document.title;
      const dept = pageMeta.dept || 'VPS Lakeshore';
      const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const body = [
        new D.Paragraph({ spacing: { after: 60 }, children: [
          new D.TextRun({ text: `${dept.toUpperCase()}  ·  DRAFT  ·  ${today.toUpperCase()}`, color: '003462', size: 16, characterSpacing: 20 })] }),
        new D.Paragraph({ heading: D.HeadingLevel.TITLE, spacing: { after: 120 },
          border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: NAVY, space: 6 } },
          children: [new D.TextRun({ text: title, color: NAVY, size: 44 })] }),
      ];
      for (const b of mdBlocks(text)) {
        if (b.t === 'h') body.push(new D.Paragraph({ heading: [D.HeadingLevel.HEADING_1, D.HeadingLevel.HEADING_1, D.HeadingLevel.HEADING_2, D.HeadingLevel.HEADING_3][b.level - 1], spacing: { before: 240, after: 80 }, children: runs(D, b.text, { color: NAVY }) }));
        else if (b.t === 'ul') body.push(new D.Paragraph({ bullet: { level: b.level }, children: runs(D, b.text) }));
        else if (b.t === 'ol') body.push(new D.Paragraph({ numbering: { reference: 'hub-num', level: 0 }, children: runs(D, b.text) }));
        else if (b.t === 'table') { body.push(docTable(D, b.rows)); body.push(new D.Paragraph({ children: [] })); }
        else if (b.t === 'hr') body.push(new D.Paragraph({ border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: GREY, space: 4 } }, children: [] }));
        else if (b.t === 'p') body.push(new D.Paragraph({ spacing: { after: 120 }, children: runs(D, b.text) }));
      }
      body.push(new D.Paragraph({
        spacing: { before: 240 }, shading: { type: D.ShadingType.CLEAR, color: 'auto', fill: CREAM },
        border: { left: { style: D.BorderStyle.SINGLE, size: 12, color: NAVY, space: 8 } },
        children: [new D.TextRun({ text: 'Review before use. ', italics: true, color: NAVY }),
          new D.TextRun({ text: 'Drafted with Claude from the inputs on screen. Check figures, names and dates, and have the owner approve before circulating.' })],
      }));
      const doc = new D.Document({
        creator: 'VPS Lakeshore Admin Hub', title, description: 'Draft generated with Claude',
        styles: {
          default: { document: { run: { font: FONT, size: 20, color: INK }, paragraph: { spacing: { line: 276 } } } },
          paragraphStyles: [
            { id: 'Title', name: 'Title', basedOn: 'Normal', run: { font: FONT, color: NAVY } },
            { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: 30, color: NAVY } },
            { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: 25, color: NAVY } },
            { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: 22, color: NAVY } },
          ],
        },
        numbering: { config: [{ reference: 'hub-num', levels: [{ level: 0, format: D.LevelFormat.DECIMAL, text: '%1.', alignment: D.AlignmentType.START, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] }] },
        sections: [{
          properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1200, left: 1200, right: 1200 } } },
          headers: { default: new D.Header({ children: [new D.Paragraph({
            border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: MAGENTA, space: 4 } },
            tabStops: [{ type: D.TabStopType.RIGHT, position: 9500 }],
            children: [new D.TextRun({ text: 'VPS Lakeshore', color: NAVY, size: 22 }),
              new D.TextRun({ text: '  In good hands', italics: true, color: MAGENTA, size: 16 }),
              new D.TextRun({ text: '\t' + dept, color: SLATE, size: 16 })] })] }) },
          footers: { default: new D.Footer({ children: [new D.Paragraph({
            shading: { type: D.ShadingType.CLEAR, color: 'auto', fill: CREAM },
            tabStops: [{ type: D.TabStopType.RIGHT, position: 9500 }],
            children: [new D.TextRun({ text: 'Lakeshore Hospital & Research Centre Ltd · Kochi · Internal draft', size: 14, color: SLATE }),
              new D.TextRun({ children: ['\tPage ', D.PageNumber.CURRENT, ' of ', D.PageNumber.TOTAL_PAGES], size: 14, color: SLATE })] })] }) },
          children: body,
        }],
      });
      const blob = await D.Packer.toBlob(doc);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${(title || 'draft').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) {
      alert('Could not create the Word file: ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = label; }
    }
  }

  function inr(n, digits = 0) {
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });
  }

  window.Hub = { ask, run, md, esc, inr, mountHeader, isLive, mode, settings, wordDownload, fileToText, loadScript, root, store };
})();
