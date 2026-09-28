// Generates data/tpa-preauth.json — synthetic cashless pre-authorisation queue for the
// Revenue Cycle / TPA desk. Node, no dependencies. Seeded (mulberry32) for reproducibility.
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
const rand = mulberry32(20260927);
const pick = arr => arr[Math.floor(rand() * arr.length)];
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const round100 = n => Math.round(n / 100) * 100;

const PAYERS = ['Star Health', 'Medi Assist (TPA)', 'Paramount TPA', 'Vidal Health TPA', 'MediBuddy', 'Corporate GHI — PeerCorp Industries', 'CGHS / PMJAY (govt scheme)'];
const DOCTORS = ['Dr. Anil Menon', 'Dr. Priya Varghese', 'Dr. Thomas Koshy', 'Dr. Lakshmi Pillai', 'Dr. Sunil Nair', 'Dr. Divya Krishnan', 'Dr. Rajeev Panicker', 'Dr. Meera Balakrishnan', 'Dr. George Mathew', 'Dr. Anjali Warrier', 'Dr. Vinod Kurup', 'Dr. Sheeba Thomas'];
const ROOM = ['General ward', 'Twin sharing', 'Private (non-AC)', 'Private AC', 'ICU/CCU', 'Deluxe / suite'];

const PROCEDURES = [
  { name: 'Right total knee replacement', dept: 'Orthopaedics', ped: true, ilness: 'osteoarthritis', tier: 'high' },
  { name: 'Emergency PTCA with drug-eluting stent', dept: 'Cardiology', admission: 'Emergency', tier: 'high' },
  { name: 'Laparoscopic cholecystectomy', dept: 'General Surgery', tier: 'mid' },
  { name: 'Phacoemulsification with IOL (cataract)', dept: 'Ophthalmology', ped: true, ilness: 'cataract', tier: 'low', subLimit: true },
  { name: 'Total abdominal hysterectomy', dept: 'Gynaecology', tier: 'mid' },
  { name: 'Lumbar spinal fusion (L4-L5)', dept: 'Orthopaedics', tier: 'high' },
  { name: 'Inguinal hernia repair (mesh)', dept: 'General Surgery', ped: true, ilness: 'hernia', tier: 'low' },
  { name: 'Lower segment caesarean section', dept: 'Gynaecology', admission: 'Emergency', tier: 'mid', maternity: true },
  { name: 'Tonsillectomy with adenoidectomy', dept: 'ENT', tier: 'low' },
  { name: 'Diagnostic coronary angiogram', dept: 'Cardiology', tier: 'low' },
  { name: 'ACL reconstruction (arthroscopic)', dept: 'Orthopaedics', tier: 'mid' },
  { name: 'Transurethral resection of prostate (TURP)', dept: 'Urology', ped: true, ilness: 'BPH', tier: 'mid' },
  { name: 'Total thyroidectomy', dept: 'General Surgery', tier: 'mid' },
  { name: 'Modified radical mastectomy', dept: 'General Surgery', tier: 'high' },
  { name: 'CABG (triple vessel)', dept: 'Cardiology', admission: 'Emergency', tier: 'high' },
  { name: 'AV fistula creation (dialysis access)', dept: 'Nephrology', tier: 'low' },
  { name: 'Appendectomy (laparoscopic)', dept: 'General Surgery', admission: 'Emergency', tier: 'low' },
  { name: 'Percutaneous nephrolithotomy (PCNL)', dept: 'Urology', tier: 'mid' },
];

const DOC_ITEMS = [
  'Patient ID proof (Aadhaar/Passport)',
  'Policy card / e-card number',
  "Doctor's clinical notes & admission advice",
  'Investigation reports (relevant to diagnosis)',
  'Detailed cost estimate (itemised)',
  'Pre-auth request form (insurer/TPA format)',
  'Past policy / continuity certificate (for PED check)',
  'Employer / scheme authorisation letter',
];

const STATUSES = ['New', 'Docs pending', 'Draft ready', 'Submitted', 'Query raised', 'Approved', 'Denied'];
const FIRST_F = ['Meera', 'Anjali', 'Lakshmi', 'Divya', 'Sheeba', 'Priya', 'Reshma', 'Nisha', 'Sarita', 'Devika'];
const FIRST_M = ['Anil', 'Sunil', 'Rajeev', 'George', 'Vinod', 'Thomas', 'Manoj', 'Sajeev', 'Biju', 'Arun'];

const QUERY_TEMPLATES = [
  n => `Please confirm continuity of prior policy for PED waiting-period assessment on ${n}'s ailment. Attach previous policy copy / portability certificate.`,
  () => `Itemised bill breakup does not match package code. Kindly resubmit cost estimate with room category and per-day room rent clearly stated.`,
  () => `Pre-existing disease declaration form not on file. Share proposal form / first policy medical declaration.`,
  () => `Requested sum insured exceeds available balance under sub-limit for this procedure. Confirm co-payment consent from patient/attendant.`,
  () => `Treating doctor's admission notes do not establish medical necessity clearly. Share detailed clinical justification with investigation reports.`,
];

const N = 32;
const cases = [];
for (let i = 0; i < N; i++) {
  const proc = pick(PROCEDURES);
  const sex = proc.maternity ? 'F' : rand() < 0.5 ? 'F' : 'M';
  const initials = (sex === 'F' ? pick(FIRST_F) : pick(FIRST_M))[0] + pick('ABCDEFGHJKLMNPRSTV'.split(''));
  const age = proc.maternity ? int(24, 38) : int(22, 78);
  const payer = pick(PAYERS);
  const policyYear = int(1, 6);
  const sumInsured = pick([300000, 500000, 700000, 1000000, 1500000, 2000000]);
  const roomCategory = proc.tier === 'high' && rand() < 0.4 ? 'Private AC' : pick(ROOM);
  const admissionType = proc.admission || (rand() < 0.75 ? 'Planned' : 'Emergency');
  const doctor = pick(DOCTORS);

  // baseline minutes elapsed since request, at the moment this dataset was captured —
  // the page adds real elapsed seconds on top so the clock keeps ticking live.
  const baselineMinutes = Math.round(rand() * rand() * 80); // skew toward lower values, some over 50

  const hour = 7 + Math.floor((baselineMinutes / 80) * 4 + rand() * 1.5);
  const minute = int(0, 59);
  const requestTime = `${String(Math.min(hour, 11)).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  // Assign a status by target share so the queue shows a realistic spread across all seven states.
  const roll = i / N;
  let status;
  if (roll < 0.16) status = 'New';
  else if (roll < 0.38) status = 'Docs pending';
  else if (roll < 0.55) status = 'Draft ready';
  else if (roll < 0.70) status = 'Submitted';
  else if (roll < 0.83) status = 'Query raised';
  else if (roll < 0.94) status = 'Approved';
  else status = 'Denied';

  const nDocs = status === 'Docs pending' ? int(3, 6) : status === 'New' ? int(4, 7) : int(6, 8);
  const docIdx = new Set();
  while (docIdx.size < nDocs) docIdx.add(int(0, DOC_ITEMS.length - 1));
  const documents = DOC_ITEMS.map((name, idx) => ({ name, present: docIdx.has(idx) }));

  const pedFlag = !!proc.ped && policyYear <= 2;
  const roomRentFlag = roomCategory === 'Private AC' || roomCategory === 'Deluxe / suite';
  const subLimitFlag = !!proc.subLimit;
  const govtScheme = payer.startsWith('CGHS');

  const base = { knee: 145000, mid: 68000, high: 165000, low: 32000 }[proc.tier] || 60000;
  const implant = proc.tier === 'high' ? round100(base * (0.7 + rand() * 0.5)) : 0;
  const ot = round100(base * (0.35 + rand() * 0.2));
  const days = proc.admission === 'Emergency' ? int(2, 5) : int(1, 4);
  const roomRate = { 'General ward': 1500, 'Twin sharing': 3200, 'Private (non-AC)': 4500, 'Private AC': 6500, 'ICU/CCU': 9500, 'Deluxe / suite': 12000 }[roomCategory];
  const roomRent = roomRate * days;
  const profFee = round100(base * (0.45 + rand() * 0.25));
  const pharmacy = round100(base * (0.15 + rand() * 0.2));
  const nonPayables = round100(2000 + rand() * 6000);
  const costItems = [
    ...(implant ? [{ label: 'Implant / device charges', amount: implant }] : []),
    { label: 'OT & anaesthesia charges', amount: ot },
    { label: `Room rent (${days} day${days > 1 ? 's' : ''}, ${roomCategory.toLowerCase()} @ ₹${roomRate.toLocaleString('en-IN')}/day)`, amount: roomRent },
    { label: 'Surgeon & anaesthetist professional fee', amount: profFee },
    { label: 'Investigations, pharmacy & consumables', amount: pharmacy },
    { label: 'Non-payable items (as per IRDAI list)', amount: nonPayables },
  ];
  const total = costItems.reduce((a, c) => a + c.amount, 0);

  const query = status === 'Query raised' ? { text: pick(QUERY_TEMPLATES)(initials), raisedAt: `${requestTime}` } : null;

  cases.push({
    id: `PA-26${String(1000 + i)}`,
    patientInitials: initials, age, sex,
    procedure: proc.name, dept: proc.dept, doctor,
    payer, sumInsured, policyYear, roomCategory, admissionType,
    requestTime, baselineMinutes,
    status,
    documents,
    costItems, totalEstimate: total,
    pedFlag, ilness: proc.ilness || null, roomRentFlag, subLimitFlag, govtScheme,
    query,
  });
}

// Shuffle display order (seeded) so the queue doesn't read as sorted by status.
for (let i = cases.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [cases[i], cases[j]] = [cases[j], cases[i]];
}

const out = {
  generatedAt: '2026-09-27',
  hospital: 'VPS Lakeshore Hospital, Kochi',
  cases,
};

const file = fileURLToPath(import.meta.url);
const dataPath = join(dirname(file), '..', '..', 'data', 'tpa-preauth.json');
mkdirSync(dirname(dataPath), { recursive: true });
writeFileSync(dataPath, JSON.stringify(out, null, 1));
console.log(`Wrote ${cases.length} cases to ${dataPath}`);
