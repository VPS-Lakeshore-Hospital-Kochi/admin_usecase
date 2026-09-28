/* Lakeshore Admin Hub — demo toolkit. Load after shared/claude.js.
 *
 * Hub.kit.data(slug)                       → Promise<json> from data/<slug>.json
 * Hub.kit.state(slug, initial)             → { get(), set(patch), reset() } persisted per prototype
 * Hub.kit.role()                           → 'maker' | 'approver' (switch lives in the toolbar)
 * Hub.kit.toolbar(el, { slug, onReset, tour })  role switch · reset demo · guided tour · activity log
 * Hub.kit.log(slug, action, detail)        → append to the prototype's activity (audit) log
 * Hub.kit.tabs(el, tabs, onChange)         → tab strip; tabs = [{ id, label }]
 * Hub.kit.steps(el, labels, current)       → workflow progress chips
 * Hub.kit.table(el, { columns, rows, onRowClick, search, selectedKey, rowKey })
 * Hub.kit.review(el, { slug, item, text, onDecision })  maker edits → approver approves / returns, logged
 * Hub.kit.exportXlsx(rows, filename, sheet)
 * Hub.kit.tour(steps)                      → guided walkthrough; steps = [{ sel, title, text }]
 * Hub.chart.bar / hbar / line / stacked(el, opts)  — SVG charts with tooltip, legend, table view
 */
(function () {
  const H = window.Hub;
  if (!H) throw new Error('Load shared/claude.js before shared/kit.js');
  const esc = H.esc;
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const now = () => new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  /* ---------- data & state ---------- */
  const cache = {};
  function data(slug) {
    return cache[slug] || (cache[slug] = fetch(`${H.root}data/${slug}.json`).then(r => {
      if (!r.ok) throw new Error(`Could not load data/${slug}.json (${r.status})`);
      return r.json();
    }));
  }
  function state(slug, initial) {
    const key = 'lhub.state.' + slug;
    const clone = v => JSON.parse(JSON.stringify(v));
    let cur = ls.get(key, null) || clone(initial);
    return {
      get: () => cur,
      set(patch) { cur = Object.assign(cur, typeof patch === 'function' ? patch(cur) : patch); ls.set(key, cur); return cur; },
      reset() { cur = clone(initial); ls.del(key); ls.del('lhub.audit.' + slug); return cur; },
    };
  }

  /* ---------- roles & activity log ---------- */
  const role = () => ls.get('lhub.role', 'maker');
  const ROLE_LABEL = { maker: 'Maker', approver: 'Approver' };
  function log(slug, action, detail) {
    const k = 'lhub.audit.' + slug, list = ls.get(k, []);
    list.unshift({ at: now(), role: ROLE_LABEL[role()], action, detail: detail || '' });
    ls.set(k, list.slice(0, 200));
    document.dispatchEvent(new CustomEvent('kit:log', { detail: { slug } }));
  }
  function renderLog(el, slug) {
    const list = ls.get('lhub.audit.' + slug, []);
    el.innerHTML = list.length
      ? `<ol class="kit-audit">${list.map(e => `<li><b>${esc(e.at)}</b> · ${esc(e.role)} · ${esc(e.action)}${e.detail ? ' — ' + esc(e.detail) : ''}</li>`).join('')}</ol>`
      : '<p class="small">No activity yet. Actions you take in this demo are logged here.</p>';
  }

  function toolbar(el, { slug, onReset, tour } = {}) {
    el.className = 'kit-toolbar';
    const r = role();
    el.innerHTML = `
      <span class="small">Acting as</span>
      <span class="seg" role="group" aria-label="Demo role">
        <button type="button" data-role="maker" aria-pressed="${r === 'maker'}">Maker</button>
        <button type="button" data-role="approver" aria-pressed="${r === 'approver'}">Approver</button>
      </span>
      ${tour ? '<button type="button" data-act="tour">Guided tour</button>' : ''}
      <button type="button" data-act="log">Activity log</button>
      <button type="button" data-act="reset">Reset demo</button>`;
    el.querySelectorAll('[data-role]').forEach(b => b.onclick = () => {
      ls.set('lhub.role', b.dataset.role);
      el.querySelectorAll('[data-role]').forEach(x => x.setAttribute('aria-pressed', x === b));
      document.dispatchEvent(new CustomEvent('kit:role', { detail: { role: b.dataset.role } }));
    });
    el.querySelector('[data-act=reset]').onclick = () => {
      if (!confirm('Reset this demo to its starting data? Your changes and the activity log will be cleared.')) return;
      if (onReset) onReset();
    };
    el.querySelector('[data-act=log]').onclick = () => modal('Activity log', box => {
      renderLog(box, slug);
      const d = document.createElement('p');
      d.className = 'small';
      d.textContent = 'Kept in this browser only. In production this would be the gateway audit trail.';
      box.appendChild(d);
    });
    if (tour) el.querySelector('[data-act=tour]').onclick = () => startTour(tour);
  }

  function modal(title, fill) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal" role="dialog" aria-label="${esc(title)}" style="max-width:640px"><h2>${esc(title)}</h2><div class="kit-modal-body"></div><div class="row" style="justify-content:flex-end;margin-top:12px"><button type="button">Close</button></div></div>`;
    bg.onclick = e => { if (e.target === bg) bg.remove(); };
    bg.querySelector('.row button').onclick = () => bg.remove();
    document.body.appendChild(bg);
    fill(bg.querySelector('.kit-modal-body'));
    return bg;
  }

  /* ---------- layout pieces ---------- */
  function tabs(el, list, onChange, current) {
    el.className = 'kit-tabs';
    el.setAttribute('role', 'tablist');
    const sel = current || list[0].id;
    el.innerHTML = list.map(t => `<button type="button" role="tab" data-id="${esc(t.id)}" aria-selected="${t.id === sel}">${esc(t.label)}</button>`).join('');
    el.querySelectorAll('button').forEach(b => b.onclick = () => {
      el.querySelectorAll('button').forEach(x => x.setAttribute('aria-selected', x === b));
      onChange(b.dataset.id);
    });
    onChange(sel);
  }

  function steps(el, labels, current) {
    el.className = 'kit-steps';
    el.innerHTML = labels.map((l, i) => `<span class="${i < current ? 'done' : i === current ? 'now' : ''}">${i < current ? '✓ ' : ''}${esc(l)}</span>`).join('');
  }

  function table(el, { columns, rows, onRowClick, search, selectedKey, rowKey = 'id', pageSize = 25 }) {
    let sortKey = null, dir = 1, q = '', page = 0;
    const fmt = (c, r) => c.render ? c.render(r) : esc(c.format ? c.format(r[c.key], r) : r[c.key] ?? '');
    function draw() {
      let list = rows.filter(r => !q || columns.some(c => String(r[c.key] ?? '').toLowerCase().includes(q)));
      if (sortKey) list = list.slice().sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * dir);
      const pages = Math.max(1, Math.ceil(list.length / pageSize));
      page = Math.min(page, pages - 1);
      const shown = list.slice(page * pageSize, page * pageSize + pageSize);
      el.innerHTML = `${search ? `<div class="row" style="margin-bottom:8px"><input class="kit-search" type="search" placeholder="Search…" aria-label="Search table" value="${esc(q)}"><span class="small">${list.length} of ${rows.length}</span></div>` : ''}
        <div class="table-wrap"><table class="kit-table"><thead><tr>${columns.map(c => `<th class="sortable ${c.num ? 'num' : ''}" data-k="${esc(c.key)}">${esc(c.label)}${sortKey === c.key ? (dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
        <tbody>${shown.map(r => `<tr class="${onRowClick ? 'clickable' : ''} ${selectedKey != null && r[rowKey] === selectedKey ? 'sel' : ''}" data-key="${esc(r[rowKey])}">${columns.map(c => `<td class="${c.num ? 'num' : ''}">${fmt(c, r)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${columns.length}" class="small">No rows match.</td></tr>`}</tbody></table></div>
        ${pages > 1 ? `<div class="row" style="justify-content:flex-end;margin-top:6px"><button type="button" data-p="-1" ${page === 0 ? 'disabled' : ''}>Previous</button><span class="small">Page ${page + 1} of ${pages}</span><button type="button" data-p="1" ${page >= pages - 1 ? 'disabled' : ''}>Next</button></div>` : ''}`;
      const s = el.querySelector('.kit-search');
      if (s) s.oninput = () => { q = s.value.toLowerCase(); page = 0; draw(); const n = el.querySelector('.kit-search'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
      el.querySelectorAll('th.sortable').forEach(th => th.onclick = () => { dir = sortKey === th.dataset.k ? -dir : 1; sortKey = th.dataset.k; draw(); });
      el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { page += Number(b.dataset.p); draw(); });
      if (onRowClick) el.querySelectorAll('tbody tr[data-key]').forEach(tr => tr.onclick = () => {
        const r = rows.find(x => String(x[rowKey]) === tr.dataset.key);
        selectedKey = r && r[rowKey];
        draw();
        if (r) onRowClick(r);
      });
    }
    draw();
    return { update(newRows) { rows = newRows; draw(); }, select(k) { selectedKey = k; draw(); } };
  }

  /* ---------- maker → approver review ---------- */
  // item: { id, title }. Stores decisions in state under `reviews[item.id]`.
  function review(el, { slug, item, text, st, onDecision, docTitle }) {
    const rec = (st.get().reviews || {})[item.id] || { status: 'draft', text };
    function save(patch) {
      st.set(s => ({ reviews: { ...(s.reviews || {}), [item.id]: { ...rec, ...patch } } }));
      Object.assign(rec, patch);
    }
    function draw() {
      const r = role();
      const badge = { draft: '<span class="tag warn">Draft — with maker</span>', submitted: '<span class="tag warn">Awaiting approval</span>', approved: '<span class="tag ok">Approved</span>', returned: '<span class="tag bad">Returned to maker</span>' }[rec.status];
      el.className = 'kit-review';
      el.innerHTML = `<div class="row" style="justify-content:space-between"><h3 style="margin:0">${esc(item.title)}</h3>${badge}</div>
        ${rec.status === 'approved' ? `<div class="kit-approved">Approved ${esc(rec.at || '')}. Ready to send.</div><div class="claude-out">${H.md(rec.text)}</div>` : ''}
        ${rec.status === 'returned' && rec.note ? `<p class="small"><b>Approver's note:</b> ${esc(rec.note)}</p>` : ''}
        ${rec.status !== 'approved' ? `<label for="kit-rv-${esc(item.id)}">${r === 'maker' && (rec.status === 'draft' || rec.status === 'returned') ? 'Edit the Claude draft before submitting' : 'Draft (read-only for approver)'}</label>
          <textarea id="kit-rv-${esc(item.id)}" data-upload="off" ${r === 'maker' && rec.status !== 'submitted' ? '' : 'readonly'}>${esc(rec.text)}</textarea>` : ''}
        <div class="row" style="margin-top:8px">${actions(r)}</div>
        <p class="small" style="margin-top:6px">Claude drafts; a named person approves. Nothing is sent or posted to any hospital system from this demo.</p>`;
      const ta = el.querySelector('textarea');
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act(b.dataset.a, ta));
    }
    function actions(r) {
      if (rec.status === 'approved') return '<button type="button" data-a="word">Download Word (.docx)</button><button type="button" data-a="reopen">Reopen</button>';
      if (r === 'maker') return rec.status === 'submitted'
        ? '<span class="small">Submitted. Switch to <b>Approver</b> in the toolbar to review.</span>'
        : '<button type="button" data-a="submit">Submit for approval</button>';
      return rec.status === 'submitted'
        ? '<button type="button" data-a="approve">Approve</button><button type="button" data-a="return">Return with note</button>'
        : '<span class="small">Waiting for the maker to submit. Switch to <b>Maker</b> to edit and submit.</span>';
    }
    function act(a, ta) {
      if (ta && !ta.readOnly) rec.text = ta.value;
      if (a === 'submit') { save({ status: 'submitted', text: rec.text }); log(slug, 'Submitted for approval', item.title); }
      if (a === 'approve') { save({ status: 'approved', at: now() }); log(slug, 'Approved', item.title); }
      if (a === 'return') {
        const note = prompt('Note for the maker (what should change?)', '') || '';
        save({ status: 'returned', note }); log(slug, 'Returned to maker', `${item.title}${note ? ': ' + note : ''}`);
      }
      if (a === 'reopen') { save({ status: 'draft' }); log(slug, 'Reopened', item.title); }
      if (a === 'word') { H.wordDownload(rec.text, null, docTitle || item.title); log(slug, 'Downloaded Word', item.title); return; }
      draw();
      if (onDecision) onDecision(rec.status, rec);
    }
    const onRole = () => { if (el.isConnected) draw(); else document.removeEventListener('kit:role', onRole); };
    document.addEventListener('kit:role', onRole);
    draw();
    return { status: () => rec.status };
  }

  /* ---------- export ---------- */
  async function exportXlsx(rows, filename, sheet = 'Data') {
    const XLSX = await H.loadScript('xlsx.full.min.js', 'XLSX');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheet.slice(0, 31));
    XLSX.writeFile(wb, filename);
  }

  /* ---------- guided tour ---------- */
  function startTour(list) {
    let i = 0;
    const bg = document.createElement('div'); bg.className = 'kit-tour-bg';
    const hl = document.createElement('div'); hl.className = 'kit-tour-hl'; bg.appendChild(hl);
    const card = document.createElement('div'); card.className = 'kit-tour-card'; card.setAttribute('role', 'dialog');
    document.body.append(bg, card);
    const end = () => { bg.remove(); card.remove(); };
    function show() {
      const s = list[i], t = document.querySelector(s.sel);
      if (t) {
        t.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setTimeout(() => { const r = t.getBoundingClientRect(); Object.assign(hl.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' }); }, 250);
      }
      card.innerHTML = `<div class="small">Step ${i + 1} of ${list.length}</div><h3 style="margin:4px 0">${esc(s.title)}</h3><p style="margin:0 0 10px">${esc(s.text)}</p>
        <div class="row" style="justify-content:flex-end"><button type="button" data-t="end">End tour</button>${i ? '<button type="button" data-t="-1">Back</button>' : ''}<button type="button" data-t="1" class="btn">${i === list.length - 1 ? 'Finish' : 'Next'}</button></div>`;
      card.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
        if (b.dataset.t === 'end' || (b.dataset.t === '1' && i === list.length - 1)) return end();
        i += Number(b.dataset.t); show();
      });
    }
    show();
  }

  /* ---------- charts ---------- */
  const SERIES = n => `var(--series-${(n % 4) + 1})`; // brand chart ramp: navy → slate → light slate → grey (max 4 series)
  const niceMax = v => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); return Math.ceil(v / p / (v / p > 5 ? 2 : 1)) * p * (v / p > 5 ? 2 : 1); };
  const compact = v => Math.abs(v) >= 1e7 ? (v / 1e7).toFixed(1).replace(/\.0$/, '') + ' Cr' : Math.abs(v) >= 1e5 ? (v / 1e5).toFixed(1).replace(/\.0$/, '') + ' L' : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : String(Math.round(v * 10) / 10);

  function frame(el, { title, sub, legend, tableRows, tableCols }) {
    el.classList.add('kit-chart');
    el.innerHTML = `<div class="kit-chart-head"><div>${title ? `<h3>${esc(title)}</h3>` : ''}${sub ? `<div class="small">${esc(sub)}</div>` : ''}</div><button type="button" class="kit-linkbtn">Show table</button></div>
      <div class="kit-plot"></div>${legend && legend.length > 1 ? `<div class="kit-legend">${legend.map((l, i) => `<span><i style="background:${SERIES(i)}"></i>${esc(l)}</span>`).join('')}</div>` : ''}
      <div class="kit-tablev" hidden><div class="table-wrap"><table><thead><tr>${tableCols.map((c, i) => `<th class="${i ? 'num' : ''}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${tableRows.map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'num' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
      <div class="kit-tip" role="status"></div>`;
    const btn = el.querySelector('.kit-linkbtn'), tv = el.querySelector('.kit-tablev'), plot = el.querySelector('.kit-plot');
    btn.onclick = () => { tv.hidden = !tv.hidden; plot.hidden = !tv.hidden; btn.textContent = tv.hidden ? 'Show table' : 'Show chart'; };
    const tip = el.querySelector('.kit-tip');
    return {
      plot,
      tip(html, x, y) { tip.innerHTML = html; tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.style.display = 'block'; },
      hide() { tip.style.display = 'none'; },
    };
  }
  function bindTips(f, svg, el) {
    svg.querySelectorAll('[data-tip]').forEach(n => {
      const show = () => { const r = n.getBoundingClientRect(), p = el.getBoundingClientRect(); f.tip(n.dataset.tip, r.left - p.left + r.width / 2, r.top - p.top); };
      n.addEventListener('mouseenter', show); n.addEventListener('focus', show);
      n.addEventListener('mouseleave', () => f.hide()); n.addEventListener('blur', () => f.hide());
    });
  }
  const barPath = (x, y, w, h) => { const r = Math.min(4, w / 2, h); return h <= 0 ? '' : `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; };
  const hbarPath = (x, y, w, h) => { const r = Math.min(4, h / 2, w); return w <= 0 ? '' : `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`; };

  // data: [{ label, value }]
  function bar(el, { data: d, title, sub, format = compact, height = 220 }) {
    const f = frame(el, { title, sub, tableCols: ['', 'Value'], tableRows: d.map(r => [r.label, format(r.value)]) });
    const W = 600, H = height, L = 44, B = 36, T = 14, max = niceMax(Math.max(...d.map(r => r.value), 0));
    const bw = Math.min(24, (W - L) / d.length * 0.6), step = (W - L) / d.length;
    const y = v => T + (H - T - B) * (1 - v / max);
    const ticks = [0, .25, .5, .75, 1].map(t => t * max);
    f.plot.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title || 'Bar chart')}">
      ${ticks.map(t => `<line class="gridline" x1="${L}" x2="${W}" y1="${y(t)}" y2="${y(t)}"/><text class="lbl" x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${esc(format(t))}</text>`).join('')}
      ${d.map((r, i) => { const x = L + i * step + (step - bw) / 2; return `<path d="${barPath(x, y(r.value), bw, y(0) - y(r.value))}" fill="${SERIES(0)}"/><rect x="${L + i * step}" y="${T}" width="${step}" height="${H - T - B}" fill="transparent" tabindex="0" data-tip="<b>${esc(r.label)}</b><br>${esc(format(r.value))}"/><text class="lbl" x="${L + i * step + step / 2}" y="${H - B + 16}" text-anchor="middle">${esc(String(r.label).slice(0, 12))}</text>`; }).join('')}
    </svg>`;
    bindTips(f, f.plot.querySelector('svg'), el);
  }

  // data: [{ label, value }] — horizontal, sorted as given; good for rankings
  function hbar(el, { data: d, title, sub, format = compact }) {
    const f = frame(el, { title, sub, tableCols: ['', 'Value'], tableRows: d.map(r => [r.label, format(r.value)]) });
    const row = 30, W = 600, L = 150, R = 70, H = d.length * row + 8, max = niceMax(Math.max(...d.map(r => r.value), 0));
    const x = v => (W - L - R) * v / max;
    f.plot.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title || 'Bar chart')}">
      ${d.map((r, i) => { const yy = i * row + 6, bh = Math.min(18, row - 10); return `<text class="lbl" x="${L - 8}" y="${yy + bh / 2 + 4}" text-anchor="end">${esc(String(r.label).slice(0, 22))}</text><path d="${hbarPath(L, yy, x(r.value), bh)}" fill="${SERIES(0)}"/><text class="val" x="${L + x(r.value) + 6}" y="${yy + bh / 2 + 4}">${esc(format(r.value))}</text><rect x="0" y="${yy - 4}" width="${W}" height="${row}" fill="transparent" tabindex="0" data-tip="<b>${esc(r.label)}</b><br>${esc(format(r.value))}"/>`; }).join('')}
    </svg>`;
    bindTips(f, f.plot.querySelector('svg'), el);
  }

  // labels: [x labels]; series: [{ name, values }] — one y-axis only
  function line(el, { labels, series, title, sub, format = compact, height = 220 }) {
    const f = frame(el, { title, sub, legend: series.map(s => s.name), tableCols: ['', ...series.map(s => s.name)], tableRows: labels.map((l, i) => [l, ...series.map(s => format(s.values[i]))]) });
    const W = 600, H = height, L = 44, B = 30, T = 14, R = 12;
    const max = niceMax(Math.max(...series.flatMap(s => s.values), 0));
    const x = i => L + (W - L - R) * (labels.length === 1 ? 0.5 : i / (labels.length - 1));
    const y = v => T + (H - T - B) * (1 - v / max);
    const ticks = [0, .25, .5, .75, 1].map(t => t * max);
    const every = Math.ceil(labels.length / 8);
    f.plot.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title || 'Line chart')}">
      ${ticks.map(t => `<line class="gridline" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="lbl" x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${esc(format(t))}</text>`).join('')}
      ${labels.map((l, i) => i % every ? '' : `<text class="lbl" x="${x(i)}" y="${H - 10}" text-anchor="middle">${esc(l)}</text>`).join('')}
      ${series.map((s, si) => `<polyline fill="none" stroke="${SERIES(si)}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/><circle cx="${x(s.values.length - 1)}" cy="${y(s.values[s.values.length - 1])}" r="4" fill="${SERIES(si)}" stroke="var(--chart-surface)" stroke-width="2"/>`).join('')}
      ${labels.map((l, i) => `<rect x="${x(i) - (W - L) / labels.length / 2}" y="${T}" width="${(W - L) / labels.length}" height="${H - T - B}" fill="transparent" tabindex="0" data-tip="<b>${esc(l)}</b><br>${series.map((s, si) => `<span style='color:${SERIES(si)}'>●</span> ${esc(s.name)}: ${esc(format(s.values[i]))}`).join('<br>')}"/>`).join('')}
    </svg>`;
    bindTips(f, f.plot.querySelector('svg'), el);
  }

  // labels: [categories]; series: [{ name, values }] — stacked columns with 2px surface gaps
  function stacked(el, { labels, series, title, sub, format = compact, height = 240 }) {
    const f = frame(el, { title, sub, legend: series.map(s => s.name), tableCols: ['', ...series.map(s => s.name)], tableRows: labels.map((l, i) => [l, ...series.map(s => format(s.values[i]))]) });
    const W = 600, H = height, L = 44, B = 36, T = 14;
    const totals = labels.map((_, i) => series.reduce((a, s) => a + (s.values[i] || 0), 0));
    const max = niceMax(Math.max(...totals, 0)), step = (W - L) / labels.length, bw = Math.min(24, step * 0.6);
    const sy = v => (H - T - B) * v / max;
    const ticks = [0, .25, .5, .75, 1].map(t => t * max);
    f.plot.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title || 'Stacked chart')}">
      ${ticks.map(t => `<line class="gridline" x1="${L}" x2="${W}" y1="${H - B - sy(t)}" y2="${H - B - sy(t)}"/><text class="lbl" x="${L - 6}" y="${H - B - sy(t) + 4}" text-anchor="end">${esc(format(t))}</text>`).join('')}
      ${labels.map((l, i) => { let base = H - B; const x = L + i * step + (step - bw) / 2; const segs = series.map((s, si) => { const h = sy(s.values[i] || 0); if (h <= 0) return ''; base -= h; const top = si === series.length - 1 || series.slice(si + 1).every(n => !n.values[i]); return top ? `<path d="${barPath(x, base, bw, Math.max(0, h - (si ? 2 : 0)))}" fill="${SERIES(si)}"/>` : `<rect x="${x}" y="${base}" width="${bw}" height="${Math.max(0, h - 2)}" fill="${SERIES(si)}"/>`; }).join(''); return segs + `<rect x="${L + i * step}" y="${T}" width="${step}" height="${H - T - B}" fill="transparent" tabindex="0" data-tip="<b>${esc(l)}</b><br>${series.map((s, si) => `<span style='color:${SERIES(si)}'>●</span> ${esc(s.name)}: ${esc(format(s.values[i] || 0))}`).join('<br>')}<br>Total: ${esc(format(totals[i]))}"/><text class="lbl" x="${L + i * step + step / 2}" y="${H - B + 16}" text-anchor="middle">${esc(String(l).slice(0, 12))}</text>`; }).join('')}
    </svg>`;
    bindTips(f, f.plot.querySelector('svg'), el);
  }

  H.kit = { data, state, role, log, renderLog, toolbar, modal, tabs, steps, table, review, exportXlsx, tour: startTour };
  H.chart = { bar, hbar, line, stacked, compact };
})();
