/* Lakeshore Admin Hub — Claude gateway (Cloudflare Worker).
 *
 * Holds the hospital's Anthropic API key so the public hub never sees it. The browser sends
 * a Messages API request plus an access passcode; the worker checks the passcode, the origin,
 * the model and the size, then streams Anthropic's response straight back.
 *
 * Secrets / vars (see proxy/README.md):
 *   ANTHROPIC_API_KEY  secret  the hospital's key
 *   HUB_PASSCODE       secret  shared access passcode for presenters
 *   ALLOWED_ORIGINS    var     comma-separated, e.g. "https://vps-lakeshore-hospital-kochi.github.io"
 *   DAILY_LIMIT        var     optional max requests per UTC day (needs the USAGE KV binding)
 *   USAGE              KV      optional, for the daily counter
 */
const UPSTREAM = 'https://api.anthropic.com/v1/messages';
const MODELS = new Set(['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5']);
const BETAS = new Set(['server-side-fallback-2026-07-01']);
const FIELDS = ['model', 'max_tokens', 'system', 'messages', 'stream', 'fallbacks', 'thinking', 'output_config', 'stop_sequences'];
const MAX_TOKENS = 32000;
const MAX_BODY = 400_000; // bytes — generous for pasted spreadsheets, blocks abuse

function cors(origin, allowed) {
  const ok = allowed.includes(origin);
  return {
    'access-control-allow-origin': ok ? origin : allowed[0] || 'null',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, anthropic-version, anthropic-beta, x-hub-passcode',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function json(status, message, headers) {
  return new Response(JSON.stringify({ type: 'error', error: { type: 'gateway_error', message } }), {
    status, headers: { ...headers, 'content-type': 'application/json' },
  });
}

async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([a, b].map(v => crypto.subtle.digest('SHA-256', enc.encode(String(v)))));
  const ua = new Uint8Array(x), ub = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

export default {
  async fetch(request, env) {
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const origin = request.headers.get('origin') || '';
    const h = cors(origin, allowed);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (url.pathname !== '/v1/messages' || request.method !== 'POST') return json(404, 'Not found', h);
    if (!allowed.includes(origin)) return json(403, 'Origin not allowed', h);
    if (!env.ANTHROPIC_API_KEY || !env.HUB_PASSCODE) return json(500, 'Gateway not configured', h);
    if (!(await safeEqual(request.headers.get('x-hub-passcode') || '', env.HUB_PASSCODE))) return json(401, 'Invalid passcode', h);

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json(413, 'Request too large', h);
    let body;
    try { body = JSON.parse(raw); } catch { return json(400, 'Invalid JSON', h); }
    if (!MODELS.has(body.model)) return json(400, `Model not allowed: ${body.model}`, h);
    const clean = {};
    for (const k of FIELDS) if (k in body) clean[k] = body[k];
    clean.max_tokens = Math.min(Number(clean.max_tokens) || 4000, MAX_TOKENS);

    if (env.USAGE && env.DAILY_LIMIT) {
      const day = new Date().toISOString().slice(0, 10), k = 'count:' + day;
      const n = Number((await env.USAGE.get(k)) || 0);
      if (n >= Number(env.DAILY_LIMIT)) return json(429, 'Daily limit reached', h);
      await env.USAGE.put(k, String(n + 1), { expirationTtl: 60 * 60 * 48 });
    }

    const beta = (request.headers.get('anthropic-beta') || '').split(',').map(s => s.trim()).filter(b => BETAS.has(b));
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        ...(beta.length ? { 'anthropic-beta': beta.join(',') } : {}),
      },
      body: JSON.stringify(clean),
    });
    // Metadata only — never log prompt or response content.
    console.log(JSON.stringify({ at: new Date().toISOString(), model: clean.model, status: upstream.status, max_tokens: clean.max_tokens, bytes: raw.length }));
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...h, 'content-type': upstream.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' },
    });
  },
};
