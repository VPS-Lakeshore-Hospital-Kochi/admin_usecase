// Generates data/denial-analyser.json — synthetic settled cashless claims batch for the
// Revenue Cycle / TPA denial & short-payment analyser. Node, no dependencies.
// Seeded (mulberry32) for reproducibility.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260928);
const pick = arr => arr[Math.floor(rand() * arr.length)];
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const round100 = n => Math.round(n / 100) * 100;

// Same payer set as tpa-preauth.
const PAYERS = ['Sahya Health Insurance', 'MedAssure TPA', 'Periyar Claims TPA', 'Kayal Health TPA', 'CareLink TPA', 'Corporate GHI — PeerCorp Industries', 'CGHS / PMJAY (govt scheme)'];

const DEPTS = ['Orthopaedics', 'Cardiology', 'General Surgery', 'Gynaecology', 'Nephrology', 'Urology', 'ENT', 'Ophthalmology', 'Neurology'];
const PROCEDURES = [
  { name: 'Right total knee replacement', dept: 'Orthopaedics', tier: 'high' },
  { name: 'Emergency PTCA with drug-eluting stent', dept: 'Cardiology', tier: 'high' },
  { name: 'Laparoscopic cholecystectomy', dept: 'General Surgery', tier: 'mid' },
  { name: 'Phacoemulsification with IOL (cataract)', dept: 'Ophthalmology', tier: 'low' },
  { name: 'Total abdominal hysterectomy', dept: 'Gynaecology', tier: 'mid' },
  { name: 'Lumbar spinal fusion (L4-L5)', dept: 'Orthopaedics', tier: 'high' },
  { name: 'Inguinal hernia repair (mesh)', dept: 'General Surgery', tier: 'low' },
  { name: 'Lower segment caesarean section', dept: 'Gynaecology', tier: 'mid' },
  { name: 'Tonsillectomy with adenoidectomy', dept: 'ENT', tier: 'low' },
  { name: 'ACL reconstruction (arthroscopic)', dept: 'Orthopaedics', tier: 'mid' },
  { name: 'Transurethral resection of prostate (TURP)', dept: 'Urology', tier: 'mid' },
  { name: 'Total thyroidectomy', dept: 'General Surgery', tier: 'mid' },
  { name: 'CABG (triple vessel)', dept: 'Cardiology', tier: 'high' },
  { name: 'AV fistula creation (dialysis access)', dept: 'Nephrology', tier: 'low' },
  { name: 'Percutaneous nephrolithotomy (PCNL)', dept: 'Urology', tier: 'mid' },
  { name: 'Diagnostic coronary angiogram', dept: 'Cardiology', tier: 'low' },
  { name: 'Craniotomy for tumour excision', dept: 'Neurology', tier: 'high' },
];

const ROOM = ['General ward', 'Twin sharing', 'Private (non-AC)', 'Private AC', 'ICU/CCU', 'Deluxe / suite'];

// reason category -> [reason text templates, base deduction range as % of claimed, preventable?]
const CATEGORIES = [
  { cat: 'Non-payable consumables', preventable: true, pctRange: [4, 10],
    texts: [
      'Non-payable consumables (gloves, kits, disposables) not itemised separately as per IRDAI non-payables list',
      'Surgical consumables (mesh fixation clips, disposable trocars) billed under package, disallowed as non-payable',
      'Non-payable items (syringes, gauze, catheter sets) clubbed with room charges, not itemised on the bill',
    ] },
  { cat: 'Room-rent proportionate deduction', preventable: true, pctRange: [8, 18],
    texts: [
      'Room-rent proportionate deduction — patient occupied a room category above policy entitlement, linked charges (surgeon fee, OT charges) cut pro-rata',
      'Proportionate deduction on room rent and associated charges as room category exceeds sum-insured slab entitlement',
    ] },
  { cat: 'Tariff mismatch vs rate card', preventable: false, pctRange: [10, 20],
    texts: [
      'Tariff mismatch vs empanelment rate card — procedure package rate settled below the hospital\'s current agreed tariff',
      'Billed rate exceeds TPA\'s master rate list for this procedure; settled at scheme rate instead of billed rate',
    ] },
  { cat: 'Package inclusion billed separately', preventable: false, pctRange: [6, 14],
    texts: [
      'Package inclusion billed separately — item held to be part of the standard surgical package, disallowed as a separate line',
      'Implant/consumable treated as included within package rate; separate billing of the item disallowed',
    ] },
  { cat: 'Documents missing', preventable: true, pctRange: [10, 25],
    texts: [
      'Documents missing — discharge summary not attached at submission, deduction applied pending resubmission',
      'Documents missing — investigation reports / OT notes not attached, claim short-settled for lack of supporting record',
      'Documents missing — implant invoice / sticker not attached with the final bill',
    ] },
  { cat: 'PED / waiting-period dispute', preventable: false, pctRange: [15, 35],
    texts: [
      'PED/waiting-period dispute — condition treated as pre-existing under the policy\'s waiting-period clause, partial disallowance',
      'Continuity certificate not on file at submission; TPA applied waiting-period exclusion on part of the claim',
    ] },
  { cat: 'Sub-limit cap', preventable: false, pctRange: [8, 20],
    texts: [
      'Sub-limit cap applied — procedure carries a disease/procedure sub-limit under this policy, settlement capped accordingly',
      'Implant sub-limit cap applied; amount above the policy\'s implant sub-limit disallowed',
    ] },
];

const APPEAL_STATUSES = ['Not started', 'Drafted', 'Submitted', 'Recovered', 'Rejected'];

const MONTHS = ['Jul 2026', 'Aug 2026', 'Sep 2026'];
const N = 180;
const claims = [];
for (let i = 0; i < N; i++) {
  const proc = pick(PROCEDURES);
  const payer = pick(PAYERS);
  const roomCategory = pick(ROOM);
  const monthIdx = int(0, 2);
  const month = MONTHS[monthIdx];
  const day = int(1, 28);
  const dischargeDate = `${String(day).padStart(2, '0')} ${month}`;

  const claimedBase = { low: [90000, 220000], mid: [180000, 420000], high: [350000, 750000] }[proc.tier];
  const claimed = round100(int(claimedBase[0], claimedBase[1]));

  // ~18% of claims are fully approved, no deduction
  const fullyApproved = rand() < 0.18;
  let deduction = 0, cat = null, reasonText = 'Fully approved, no deduction', preventable = 'N';
  if (!fullyApproved) {
    cat = pick(CATEGORIES);
    const pct = int(cat.pctRange[0], cat.pctRange[1]) / 100;
    deduction = round100(claimed * pct);
    reasonText = pick(cat.texts);
    preventable = cat.preventable ? (rand() < 0.85 ? 'Y' : 'N') : (rand() < 0.15 ? 'Y' : 'N');
  }
  const approved = claimed - deduction;

  // appeal window: computed relative to "today" (28 Sep 2026), IRDAI-style 30-day window from discharge date-ish;
  // for the demo we assign a days-left figure directly, skewed so many are still open.
  let appealWindowDays;
  if (month === 'Jul 2026') appealWindowDays = int(-10, 5);
  else if (month === 'Aug 2026') appealWindowDays = int(2, 20);
  else appealWindowDays = int(15, 40);
  appealWindowDays = Math.max(-15, appealWindowDays);

  let appealStatus = 'Not started';
  let recovered = 0;
  if (deduction > 0) {
    if (appealWindowDays < 0) {
      appealStatus = pick(['Not started', 'Rejected', 'Rejected', 'Submitted']);
    } else {
      const r = rand();
      if (r < 0.30) appealStatus = 'Not started';
      else if (r < 0.48) appealStatus = 'Drafted';
      else if (r < 0.70) appealStatus = 'Submitted';
      else if (r < 0.90) appealStatus = 'Recovered';
      else appealStatus = 'Rejected';
    }
    if (appealStatus === 'Recovered') recovered = round100(deduction * (int(55, 100) / 100));
    if (appealStatus === 'Rejected') recovered = 0;
  }

  claims.push({
    id: `CLM-${String(3000 + i)}`,
    dischargeDate, month,
    payer, dept: proc.dept, procedure: proc.name, roomCategory,
    claimed, approved, deduction,
    reasonCategory: cat ? cat.cat : 'Fully approved',
    reasonText,
    preventable,
    appealWindowDays,
    appealStatus,
    recovered,
  });
}

// months trend for dashboard (recovery trend line) — synthesize a monthly recovered total
const trendMonths = MONTHS;
const recoveryTrend = trendMonths.map(m => claims.filter(c => c.month === m).reduce((a, c) => a + c.recovered, 0));

const DATA = { generatedAt: '2026-09-28', months: trendMonths, recoveryTrend, claims };

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', '..', 'data', 'denial-analyser.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(DATA));
console.log(`Wrote ${outPath} — ${claims.length} claims, ${JSON.stringify(DATA).length} bytes`);
