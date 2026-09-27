# Lakeshore Admin Hub

Working prototypes showing how the non-clinical departments of VPS Lakeshore Hospital, Kochi can use Claude.
Static HTML — no build step, no server-side code.

| Department | Prototype | Page |
|---|---|---|
| Finance & Accounts | MIS commentary & variance memo | `apps/finance-mis.html` |
| Revenue Cycle · TPA | Cashless pre-auth file builder | `apps/tpa-preauth.html` |
| Purchase & Stores | Quote comparison & Purchase Committee note | `apps/purchase-quotes.html` |
| Human Resources | Resume screener & interview kit | `apps/hr-screener.html` |
| Marketing & Comms | Content studio (EN / ML / AR / DV) | `apps/marketing-studio.html` |
| Patient Experience | Feedback intelligence & service recovery | `apps/patient-feedback.html` |
| Quality & Accreditation | NABH readiness & policy Q&A | `apps/nabh-readiness.html` |
| Management Office | CEO / Chairman copilot | `apps/ceo-copilot.html` |

## Running

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Or publish the folder to GitHub Pages.

## Demo vs live mode

- **Demo mode** (default): each prototype returns a pre-written sample output, so the hub can be shown with no API key and no network.
- **Live mode**: click **Settings**, paste an Anthropic API key. Prototypes then call the Claude Messages API directly from the browser with the on-screen input. The key is stored only in that browser's `localStorage`. This is fine for internal demos; a production rollout should route calls through a hospital-controlled backend (key custody, audit logging, PHI/DPDP controls).

## Structure

- `shared/hub.css` — design system (VPS Lakeshore "In good hands" palette, light/dark)
- `shared/claude.js` — `Hub.mountHeader`, `Hub.run`, `Hub.ask`, Markdown renderer, settings modal
- `apps/*.html` — one self-contained prototype per department
- `tests/smoke.mjs` — Playwright smoke test (loads every page, runs each demo, checks for JS errors)

All data is synthetic. No patient-identifiable information.
