# Lakeshore Admin Hub

**Live:** https://vps-lakeshore-hospital-kochi.github.io/admin_usecase/ (served from the `gh-pages` branch, which `.github/workflows/sync-gh-pages.yml` keeps in step with `main` on every merge)

49 working prototypes across 18 departments showing how the non-clinical departments of VPS Lakeshore Hospital, Kochi can use Claude.
Static HTML — no build step, no server-side code.

| Department | Prototype | Page |
|---|---|---|
| Finance & Accounts | MIS commentary & variance memo ★ | `apps/finance-mis.html` |
| Finance & Accounts | Capex request reviewer ★ | `apps/capex-review.html` |
| Finance & Accounts | Audit query responder | `apps/audit-responder.html` |
| Finance & Accounts | MIS consolidation checker | `apps/mis-pipeline.html` |
| Revenue Cycle · TPA | Cashless pre-auth file builder ★ | `apps/tpa-preauth.html` |
| Revenue Cycle · TPA | Denial & short-payment analyser ★ | `apps/denial-analyser.html` |
| Revenue Cycle · TPA | Discharge bill checker ★ | `apps/discharge-billing.html` |
| Revenue Cycle · TPA | Patient cost estimate | `apps/estimate-generator.html` |
| Purchase & Stores | Quote comparison & PC note ★ | `apps/purchase-quotes.html` |
| Purchase & Stores | PO–GRN–invoice matcher ★ | `apps/three-way-match.html` |
| Purchase & Stores | Vendor contract summariser | `apps/vendor-contracts.html` |
| Purchase & Stores | Reorder & expiry watch | `apps/stock-watch.html` |
| Human Resources | Resume screener & interview kit ★ | `apps/hr-screener.html` |
| Human Resources | HR letter generator | `apps/hr-letters.html` |
| Human Resources | Staff policy Q&A | `apps/hr-policy-bot.html` |
| Human Resources | Licence | Licence & credential tracker | credential tracker ★ | `apps/credential-tracker.html` |
| Human Resources | Exit interview analysis | `apps/exit-analysis.html` |
| Marketing & Comms | Content studio ★ | `apps/marketing-studio.html` |
| Marketing & Comms | Online reputation monitor | `apps/reputation-monitor.html` |
| Marketing & Comms | Referral & camp tracker | `apps/referral-tracker.html` |
| Marketing & Comms | Enquiry-to-revenue waterfall | `apps/enquiry-waterfall.html` |
| Patient Experience | Feedback intelligence ★ | `apps/patient-feedback.html` |
| Patient Experience | Call centre | Call centre & WhatsApp agent | WhatsApp agent ★ | `apps/contact-centre.html` |
| Patient Experience | Bed & discharge flow assistant ★ | `apps/bed-flow.html` |
| International Patients | International patient desk assistant ★ | `apps/intl-desk.html` |
| Quality & Accreditation | NABH readiness & policy Q&A ★ | `apps/nabh-readiness.html` |
| Quality & Accreditation | Incident trend report | `apps/incident-trends.html` |
| Legal & Secretarial | Contract risk review ★ | `apps/contract-review.html` |
| Legal & Secretarial | Board paper | Board paper & minutes drafter | minutes drafter ★ | `apps/board-papers.html` |
| Legal & Secretarial | Approval turnaround tracker | `apps/docusign-tracker.html` |
| Legal & Secretarial | Statutory compliance calendar | `apps/compliance-calendar.html` |
| Facilities & Biomedical | Equipment utilisation | Equipment utilisation & AMC analyser | AMC analyser ★ | `apps/equipment-utilisation.html` |
| Facilities & Biomedical | Maintenance ticket analyser | `apps/maintenance-tickets.html` |
| Management Office | CEO / Chairman copilot ★ | `apps/ceo-copilot.html` |
| Management Office | Competitor & market scan | `apps/market-scan.html` |
| IT & Data Governance | Data quality & SOP compliance console | `apps/data-quality.html` |
| IT & Data Governance | Master data steward assistant | `apps/master-data.html` |
| IT & Data Governance | Patient identity de-duplication | `apps/patient-dedup.html` |
| IT & Data Governance | WhatsApp KPI intake | `apps/ops-intake.html` |
| IT & Data Governance | IT helpdesk triage & answers | `apps/it-helpdesk.html` |
| IT & Data Governance | User access review | `apps/access-review.html` |
| Medical Records | Record completeness audit | `apps/mrd-completeness.html` |
| Medical Records | Records release desk | `apps/mrd-release.html` |
| Housekeeping & F&B | Room turnaround planner | `apps/housekeeping-turnaround.html` |
| Housekeeping & F&B | Food service feedback & waste | `apps/fnb-feedback.html` |
| Security | Security incident & visitor log review | `apps/security-log.html` |
| Transport & Ambulance | Ambulance trip analyser | `apps/ambulance-log.html` |
| CSR | CSR project reporter | `apps/csr-report.html` |
| Training & Academics | Mandatory training planner | `apps/training-planner.html` |

★ = flagship: a fully working demo with its own dataset, work queue, maker/approver approval, dashboard and guided tour. Also: [`governance.html`](governance.html) — principles, data rules, approval tiers, phased rollout and an hours-saved estimator.

## Running

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Or publish the folder to GitHub Pages.

## Demo vs live mode

Open **Settings** on any page to choose how Claude is reached:

| Mode | Who it's for | How it works |
|---|---|---|
| **Demo mode** (default) | Anyone, offline, on stage | Pre-written outputs built from the selected record, streamed so the page behaves as it does in live mode. Claude does not read the input. |
| **Hospital gateway** | Presenters to admin and management | Live Claude through the Cloudflare Worker in `proxy/`, which holds the hospital's API key. Presenters enter only a passcode. See `proxy/README.md` to deploy it. |
| **Own API key** | Developers | Calls the Claude API directly from the browser with a key stored in that browser only. |

Live calls stream from `claude-opus-5` with server-side refusal fallbacks. The gateway allowlists models, caps output length and daily requests, and logs metadata only. A shared passcode is fine for synthetic-data demos; real hospital data needs SSO, per-user audit logging and DPDP review first.

## Files in and out

- **Upload file** — every input box on a prototype accepts `.txt`, `.csv`, `.xlsx`, `.docx` or text-based `.pdf`. Files are read entirely in the browser; nothing is uploaded. In live mode the extracted text is what gets sent to Claude. Scanned PDFs have no text layer and are rejected.
- **Download Word (.docx)** — every Claude output can be saved as a VPS Lakeshore-branded Word draft (DM Sans, navy headings, navy-header tables, magenta rule, "Review before use" panel, page-numbered footer).
- Libraries for both live in `shared/vendor/` and load only when first used — see `shared/vendor/README.md` for versions and licences.

## Structure

- `shared/hub.css` — design system (VPS Lakeshore "In good hands" palette, light/dark)
- `shared/claude.js` — `Hub.mountHeader`, `Hub.run`, `Hub.ask` (streaming), Markdown renderer, settings modal, file upload, Word export
- `shared/kit.js` — demo toolkit: state, maker/approver roles, activity log, tabs, workflow steps, tables, review & approval, Excel export, guided tour, brand charts
- `data/*.json` + `scripts/gen/*.mjs` — seeded synthetic datasets for the fleshed-out demos and the generators that produce them
- `proxy/` — Cloudflare Worker gateway that holds the hospital API key (with `tests/worker.test.mjs`)
- `docs/FLAGSHIP_BRIEF.md`, `docs/flagship-template.html` — the pattern every fleshed-out demo follows
- `shared/apps.js` — the prototype registry (hub tiles, governance page and this table come from it)
- `apps/*.html` — one self-contained prototype per use case
- `tests/smoke.mjs` — Playwright smoke test (every page at 1280px and 375px: demo output, JS/network errors, overflow, hub links); runs on every PR via `.github/workflows/smoke.yml`

All data is synthetic. No patient-identifiable information.
