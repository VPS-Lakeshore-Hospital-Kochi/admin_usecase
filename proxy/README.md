# Claude gateway for the Admin Hub

A small Cloudflare Worker that lets the public hub call Claude **without exposing the hospital's API key**. Presenters enter a shared passcode under **Settings → Hospital gateway**. The worker:

- holds the Anthropic API key as a secret; the browser never sees it
- accepts requests only from the hub's own web address (`ALLOWED_ORIGINS`) and only with the passcode
- allows only listed models (`claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5`), caps output length, strips any other request fields and limits request size
- optionally caps requests per day (`DAILY_LIMIT`, with a KV namespace)
- streams answers straight back, and logs metadata only (time, model, status, size), **never prompt or response text**

## One-time setup (IT, about 15 minutes)

You need a Cloudflare account (the free plan is enough) and an Anthropic API key from the hospital's Claude Console organisation. Set a monthly spend limit on that key in the Console.

```bash
cd proxy
npx wrangler login                               # opens a browser to authorise Cloudflare
npx wrangler secret put ANTHROPIC_API_KEY        # paste the hospital key
npx wrangler secret put HUB_PASSCODE             # choose the presenter passcode
# optional daily cap:
npx wrangler kv namespace create USAGE           # paste the id into wrangler.toml and uncomment the block
npx wrangler deploy                              # prints https://lakeshore-hub-gateway.<account>.workers.dev
```

Then give the hub the gateway address, using either option:
- **For everyone:** set `DEFAULT_GATEWAY` near the top of `shared/claude.js` to the printed URL and merge. Presenters then only type the passcode.
- **Per browser:** paste the URL into **Settings → Hospital gateway → Gateway URL**.

## Operating it

| Task | How |
|---|---|
| Rotate the passcode | `npx wrangler secret put HUB_PASSCODE`; tell presenters the new one |
| Rotate the API key | Create a new key in the Console, `npx wrangler secret put ANTHROPIC_API_KEY`, then revoke the old key |
| Change the daily cap | Edit `DAILY_LIMIT` in `wrangler.toml`, `npx wrangler deploy` |
| Watch usage | `npx wrangler tail` (metadata lines only), plus usage in the Claude Console |
| Switch it off | `npx wrangler delete`; the hub falls back to demo mode |

## Limits of this setup

This is right for **demos with synthetic data**. A shared passcode is not user authentication. Before staff use it with real hospital data, it needs single sign-on, per-user audit logging, a data processing agreement, and DPDP review. That is the production gateway described on the hub's governance page.

Tests: `node --test tests/worker.test.mjs` (mocked upstream, no key needed).
