# Lakeshore Admin Hub

**Live:** https://vps-lakeshore-hospital-kochi.github.io/admin_usecase/ (served from the `gh-pages` branch, which `.github/workflows/sync-gh-pages.yml` keeps in step with `main` on every merge)

32 working prototypes across 13 departments showing how the non-clinical departments of VPS Lakeshore Hospital, Kochi can use Claude.
Static HTML — no build step, no server-side code.

| Department | Prototype | Page |
|---|---|---|
| Finance & Accounts | MIS commentary & variance memo | `apps/finance-mis.html` |
| Finance & Accounts | Capex request reviewer | `apps/capex-review.html` |
| Finance & Accounts | Audit query responder | `apps/audit-responder.html` |
| Revenue Cycle · TPA | Cashless pre-auth file builder | `apps/tpa-preauth.html` |
| Revenue Cycle · TPA | Denial & short-payment analyser | `apps/denial-analyser.html` |
| Revenue Cycle · TPA | Discharge bill checker | `apps/discharge-billing.html` |
| Revenue Cycle · TPA | Patient cost estimate | `apps/estimate-generator.html` |
| Purchase & Stores | Quote comparison & PC note | `apps/purchase-quotes.html` |
| Purchase & Stores | PO–GRN–invoice matcher | `apps/three-way-match.html` |
| Purchase & Stores | Vendor contract summariser | `apps/vendor-contracts.html` |
| Purchase & Stores | Reorder & expiry watch | `apps/stock-watch.html` |
| Human Resources | Resume screener & interview kit | `apps/hr-screener.html` |
| Human Resources | HR letter generator | `apps/hr-letters.html` |
| Human Resources | Staff policy Q&A | `apps/hr-policy-bot.html` |
| Human Resources | Licence & credential tracker | `apps/credential-tracker.html` |
| Human Resources | Exit interview analysis | `apps/exit-analysis.html` |
| Marketing & Comms | Content studio | `apps/marketing-studio.html` |
| Marketing & Comms | Online reputation monitor | `apps/reputation-monitor.html` |
| Marketing & Comms | Referral & camp tracker | `apps/referral-tracker.html` |
| Patient Experience | Feedback intelligence | `apps/patient-feedback.html` |
| Patient Experience | Call centre & WhatsApp agent | `apps/contact-centre.html` |
| International Patients | International patient desk assistant | `apps/intl-desk.html` |
| Quality & Accreditation | NABH readiness & policy Q&A | `apps/nabh-readiness.html` |
| Quality & Accreditation | Incident trend report | `apps/incident-trends.html` |
| Legal & Secretarial | Contract risk review | `apps/contract-review.html` |
| Legal & Secretarial | Board paper & minutes drafter | `apps/board-papers.html` |
| Legal & Secretarial | Approval turnaround tracker | `apps/docusign-tracker.html` |
| Legal & Secretarial | Statutory compliance calendar | `apps/compliance-calendar.html` |
| Facilities & Biomedical | Equipment utilisation & AMC analyser | `apps/equipment-utilisation.html` |
| Facilities & Biomedical | Maintenance ticket analyser | `apps/maintenance-tickets.html` |
| Management Office | CEO / Chairman copilot | `apps/ceo-copilot.html` |
| Management Office | Competitor & market scan | `apps/market-scan.html` |

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
