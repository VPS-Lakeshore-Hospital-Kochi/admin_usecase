// Generates data/ceo-copilot.json — CEO / Chairman copilot demo data.
// Node, no dependencies. Seeded PRNG (mulberry32) so output is reproducible.
import { writeFileSync } from 'fs';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260927);
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const int = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(d) { return `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`; }

// ---------- 30 days of daily ops KPIs ----------
const TODAY = new Date('2026-09-27T00:00:00');
const CAPACITY = 350;
const days = [];
for (let i = 29; i >= 0; i--) {
  const d = new Date(TODAY); d.setDate(d.getDate() - i);
  const dow = d.getDay(); // 0 Sun .. 6 Sat
  const weekendDip = (dow === 0 || dow === 6) ? -0.03 : 0;
  const occPct = round(Math.min(96, Math.max(68, 82 + weekendDip * 100 + int(-4, 4) + Math.sin(i / 4) * 3)), 1);
  const ipCensus = Math.round(CAPACITY * occPct / 100);
  const aopLakh = round(168 + (29 - i) * 0.6 + Math.sin(i / 6) * 6, 1); // AOP trends up slightly over the month
  const missDay = rnd() < 0.3; // some days miss AOP
  const revenueLakh = round(aopLakh * (missDay ? (0.84 + rnd() * 0.1) : (0.97 + rnd() * 0.12)), 1);
  const erFootfall = int(88, 145) + (dow === 0 || dow === 6 ? 12 : 0);
  const dischargeNoonPct = round(Math.max(8, Math.min(55, 28 + int(-14, 14) - (occPct > 88 ? 6 : 0))), 0);
  const tpaPending = int(14, 34);
  const robotDown = (i <= 3) ? round(int(0, 6) + (i === 0 ? 3.5 : i === 1 ? 4 : i === 2 ? 2 : 0), 1) : (rnd() < 0.15 ? round(rnd() * 3, 1) : 0);
  const cathDown = (i <= 1) ? round(2 + rnd() * 3, 1) : (rnd() < 0.12 ? round(rnd() * 2.5, 1) : 0);
  const mriDown = rnd() < 0.1 ? round(rnd() * 4, 1) : 0;
  const ctDown = rnd() < 0.08 ? round(rnd() * 3, 1) : 0;
  const complaints = int(4, 15) + (dischargeNoonPct < 20 ? 3 : 0);
  const cashCr = round(5.6 + Math.sin(i / 5) * 0.6 + (29 - i) * 0.03, 2);
  const intlPatients = int(9, 22) + Math.round((29 - i) * 0.15);
  days.push({
    date: fmtDate(d),
    ipCensus, occupancyPct: occPct,
    revenueLakh, aopLakh,
    erFootfall,
    dischargeNoonPct,
    tpaPending,
    downtime: { robot: robotDown, cathLab: cathDown, mri: mriDown, ct: ctDown },
    complaints,
    cashCr,
    intlPatients,
  });
}

// ---------- e-signature approvals ----------
const ROLE_HOLDERS = ['Chairman K.M. Varkey', 'CEO Rohini Balakrishnan', 'CFO Thomas Alex', 'COO Sandeep Nair', 'Medical Superintendent Dr. Leela Menon'];
const ESIGN_DOCS = [
  'Dr. Anand Menon — Consultant Cardiology renewal', 'M/s KeralaMed Supplies — annual rate contract',
  'Fatima Al Busaidi — Maldives referral-partner MoU', 'Housekeeping AMC renewal — FreshCare Facilities',
  'Radiology equipment insurance renewal', 'Dr. Priya Suresh — Consultant Nephrology renewal',
  'International Desk agency agreement — Gulf Corridor Partners', 'Cath Lab 2 tube replacement purchase order',
  'Cafeteria vendor agreement — Spice Route Caterers', 'Nursing staff bulk recruitment agency contract',
];
const esign = ESIGN_DOCS.map((doc, i) => ({
  doc,
  pendingWith: pick(ROLE_HOLDERS),
  days: int(1, 14),
}));
esign.sort((a, b) => b.days - a.days);

// ---------- ~25 action items from past management meetings ----------
const MEETINGS = ['Chairman review — 25-Aug-2026', 'Monthly management meeting — 05-Sep-2026', 'Chairman review — 25-Sep-2026'];
const OWNERS = ['Sameeraj Rao (Management Office)', 'SK (Strategy)', 'Marketing + International Desk', 'COO Sandeep Nair', 'CFO Thomas Alex',
  'Radiology HOD Dr. Vinod Pillai', 'HR + Quality', 'Surgery Dept', 'Medical Superintendent Dr. Leela Menon', 'Finance + Nursing'];
const ACTION_TEMPLATES = [
  ['Set up recurring monthly CMI / ARPOB / ALOS dashboard', 'Sameeraj Rao (Management Office)', 'CMI, ARPOB, ALOS'],
  ['Start quarterly competitor benchmarking against Peer A Kerala cluster', 'SK (Strategy)', 'Revenue index vs Peer A'],
  ['Build plan to grow international revenue from ~14% to 20% of total', 'Marketing + International Desk', 'International revenue %'],
  ['Design off-peak discount package for out-of-Kochi robotic surgery patients', 'COO Sandeep Nair', 'Robot utilisation %'],
  ['Explore revenue-share model for underused Cath Lab 2 / 2nd LINAC slot', 'CFO Thomas Alex', 'Equipment utilisation %'],
  ['Implement radiology token/priority system for full-bladder-prep cases', 'Radiology HOD Dr. Vinod Pillai', 'MRI/CT wait time'],
  ['Design and roll out patient-flow training module for nursing + front office', 'HR + Quality', 'Discharge-before-noon %'],
  ['Maintain single-page monthly management dashboard', 'Sameeraj Rao (Management Office)', 'All KPIs, rolled up'],
  ['Review 2pm discharge SOP with Finance and Nursing', 'Finance + Nursing', 'Discharge-before-noon %'],
  ['Negotiate faster TPA turnaround with top 3 insurers', 'CFO Thomas Alex', 'TPA approvals pending'],
  ['Prepare vendor AMC renewal calendar for critical equipment', 'COO Sandeep Nair', 'Equipment downtime hours'],
  ['Draft outreach plan for GCC corridor referral partners', 'Marketing + International Desk', 'International patients'],
  ['Set up weekly complaints-theme review with department heads', 'Medical Superintendent Dr. Leela Menon', 'Complaints logged'],
  ['Benchmark ALOS against NABH peer average for top 5 DRGs', 'SK (Strategy)', 'ALOS'],
  ['Review cash-flow runway assuming current DPO trend', 'CFO Thomas Alex', 'Cash position'],
  ['Pilot second radiology shift to cut MRI/CT queue', 'Radiology HOD Dr. Vinod Pillai', 'MRI/CT wait time'],
  ['Draft training module for TPA desk on documentation completeness', 'HR + Quality', 'TPA approvals pending'],
  ['Review robot utilisation vs plan monthly with Surgery', 'Surgery Dept', 'Robot utilisation %'],
  ['Set up quarterly international-patient satisfaction survey', 'Marketing + International Desk', 'International patients'],
  ['Propose revised AOP for Q4 given MTD shortfall', 'CFO Thomas Alex', 'Revenue vs AOP'],
  ['Review ER-to-admission conversion trend with Medical Superintendent', 'Medical Superintendent Dr. Leela Menon', 'ER footfall'],
  ['Draft communication to consultants on privileging renewal timelines', 'Sameeraj Rao (Management Office)', 'e-signature approvals pending'],
  ['Evaluate additional Cath Lab slot to reduce equipment downtime impact', 'COO Sandeep Nair', 'Equipment downtime hours'],
  ['Set up monthly Peer A revenue-per-bed comparison note', 'SK (Strategy)', 'Revenue index vs Peer A'],
  ['Review housekeeping turnaround SOP linked to discharge delays', 'Finance + Nursing', 'Discharge-before-noon %'],
  ['Prepare Board note on international-revenue growth trajectory', 'Sameeraj Rao (Management Office)', 'International revenue %'],
];
const STATUSES = ['Not started', 'In progress', 'Done', 'Overdue'];
const actions = ACTION_TEMPLATES.map((t, i) => {
  const meeting = pick(MEETINGS);
  const dueOffset = int(-10, 45);
  const due = new Date(TODAY); due.setDate(due.getDate() + dueOffset);
  let status = dueOffset < 0 ? (rnd() < 0.5 ? 'Overdue' : 'Done') : (rnd() < 0.35 ? 'In progress' : (rnd() < 0.15 ? 'Done' : 'Not started'));
  return {
    id: `A-${String(i + 1).padStart(3, '0')}`,
    action: t[0],
    owner: t[1],
    due: fmtDate(due),
    status,
    source: meeting,
  };
});

// ---------- 2 sample raw meeting-notes texts ----------
const meetingNotes = [
  {
    title: "Chairman's review meeting",
    date: '25-Sep-2026',
    text: `Chairman's review meeting — 25 Sep 2026, attendees: Chairman, CEO, COO, CFO, Medical Superintendent, Sameeraj Rao (Management Office), SK (Strategy)

1. CMI (Case Mix Index), ARPOB (Average Revenue Per Occupied Bed) and ALOS (Average Length of Stay) to be tracked and reviewed every month at the management meeting — Sameeraj to set up the recurring dashboard.
2. Need visibility on competitor revenue trends, specifically Peer A Kerala cluster — quarterly benchmarking exercise to be started.
3. International revenue currently ~14% of total; Chairman wants this to reach 20% over the next 2-3 quarters. Marketing + international desk to build a plan (GCC, Maldives, Africa corridors).
4. Robot (da Vinci) utilisation is below plan. Proposal: offer a discount/package pricing for patients travelling from outside Kochi (Kottayam, Thrissur, Alappuzha corridors) to drive volume during off-peak OT slots.
5. Explore revenue-share arrangements with other VPS units or external partners for underused equipment (Cath Lab 2, second Linear Accelerator slot) instead of it sitting idle.
6. Radiology to implement a token/priority system so that full-bladder-prep patients (CT/MRI abdomen-pelvis) are not stuck behind routine cases — reduces both wait time complaints and re-prep costs.
7. Staff training needed on patient flow management (admission to discharge) — HR/Quality to design a module, roll out to nursing and front-office staff.
8. A monthly management dashboard (single page, CEO + Chairman view) to be maintained going forward — owners: Sameeraj Rao and SK.

Chairman asked for a follow-up email summarising actions and owners to go out by end of week.`,
  },
  {
    title: 'Monthly management meeting',
    date: '05-Sep-2026',
    text: `Monthly management meeting — 05 Sep 2026, attendees: CEO, COO, CFO, Medical Superintendent, HOD Radiology, HR Head, Sameeraj Rao (Management Office)

1. TPA approvals pending are creeping up — currently averaging high-20s on any given day. CFO to open a conversation with the top 3 insurers on faster turnaround, and TPA desk staff need a documentation-completeness training module.
2. Discharge-before-noon percentage remains low on high-occupancy days. Finance and Nursing to jointly review the 2pm discharge SOP and see if housekeeping turnaround is a bottleneck.
3. Equipment downtime (robot, Cath Lab, MRI, CT) is being logged but not reviewed centrally — COO to prepare a vendor AMC renewal calendar so recurring faults are caught before they cause multi-day outages.
4. ER footfall to admission conversion should be reviewed monthly by the Medical Superintendent — flag any unusual swings.
5. Complaints are trending around billing delays at discharge and radiology wait times — Medical Superintendent to set up a weekly complaints-theme review with department heads.
6. Cash position is comfortable this month but CFO flagged the days-payable-outstanding trend should be watched given upcoming equipment AMC renewals.
7. International patient volumes are inching up — Marketing to commission a quarterly satisfaction survey once volumes cross 15 a week consistently.

Action: Sameeraj to circulate the tracker from this meeting alongside the one from the 25 Aug review, and flag any item now overdue.`,
  },
];

const out = { generatedAt: fmtDate(TODAY), capacity: CAPACITY, days, esign, actions, meetingNotes };
writeFileSync(new URL('../../data/ceo-copilot.json', import.meta.url), JSON.stringify(out));
console.log(`Wrote data/ceo-copilot.json — ${days.length} days, ${esign.length} e-sign items, ${actions.length} actions, ${meetingNotes.length} meeting notes.`);
