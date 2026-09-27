// Unit tests for proxy/worker.js with a mocked upstream. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../proxy/worker.js';

const ORIGIN = 'https://vps-lakeshore-hospital-kochi.github.io';
const env = { ANTHROPIC_API_KEY: 'sk-test', HUB_PASSCODE: 'lakeshore-demo', ALLOWED_ORIGINS: ORIGIN };
let upstreamCalls = [];
globalThis.fetch = async (url, init) => {
  upstreamCalls.push({ url, init, body: JSON.parse(init.body) });
  return new Response('event: message_stop\ndata: {"type":"message_stop"}\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } });
};
const req = (body, headers = {}, method = 'POST', path = '/v1/messages') => new Request('https://gw.example' + path, {
  method, headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-hub-passcode': 'lakeshore-demo', ...headers },
  body: method === 'POST' ? JSON.stringify(body) : undefined,
});
const ok = { model: 'claude-opus-5', max_tokens: 1000, stream: true, messages: [{ role: 'user', content: 'hi' }] };

test('preflight returns CORS for allowed origin', async () => {
  const r = await worker.fetch(new Request('https://gw.example/v1/messages', { method: 'OPTIONS', headers: { origin: ORIGIN } }), env);
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN);
});

test('rejects wrong passcode, unknown origin, bad model, wrong path', async () => {
  assert.equal((await worker.fetch(req(ok, { 'x-hub-passcode': 'nope' }), env)).status, 401);
  assert.equal((await worker.fetch(req(ok, { origin: 'https://evil.example' }), env)).status, 403);
  assert.equal((await worker.fetch(req({ ...ok, model: 'claude-fable-5-1' }), env)).status, 400);
  assert.equal((await worker.fetch(req(ok, {}, 'POST', '/v1/files'), env)).status, 404);
});

test('forwards a clean request with the server-side key and streams back', async () => {
  upstreamCalls = [];
  const r = await worker.fetch(req({ ...ok, max_tokens: 999999, tools: [{ name: 'x' }], metadata: { a: 1 } }, { 'anthropic-beta': 'server-side-fallback-2026-07-01, some-other-beta' }), env);
  assert.equal(r.status, 200);
  assert.match(await r.text(), /message_stop/);
  const call = upstreamCalls[0];
  assert.equal(call.init.headers['x-api-key'], 'sk-test');
  assert.equal(call.init.headers['anthropic-beta'], 'server-side-fallback-2026-07-01');
  assert.equal(call.body.max_tokens, 32000, 'max_tokens capped');
  assert.ok(!('tools' in call.body) && !('metadata' in call.body), 'unlisted fields stripped');
});

test('enforces the daily limit when KV is bound', async () => {
  const kv = new Map();
  const usage = { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } };
  const e = { ...env, USAGE: usage, DAILY_LIMIT: '2' };
  assert.equal((await worker.fetch(req(ok), e)).status, 200);
  assert.equal((await worker.fetch(req(ok), e)).status, 200);
  assert.equal((await worker.fetch(req(ok), e)).status, 429);
});

test('refuses to run unconfigured', async () => {
  assert.equal((await worker.fetch(req(ok), { ALLOWED_ORIGINS: ORIGIN })).status, 500);
});
