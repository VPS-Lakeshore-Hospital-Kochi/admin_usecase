// Generates data/discharge-billing.json — synthetic pre-final-bill audit queue for the
// IP billing / Revenue Cycle desk at VPS Lakeshore Hospital, Kochi. Node, no dependencies.
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
const rand = mulberry32(20260929);
const pick = arr => arr[Math.floor(rand() * arr.length)];
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const round10 = n => Math.round(n / 10) * 10;

const DOCTORS = ['Dr. Anil Menon', 'Dr. Priya Varghese', 'Dr. Thomas Koshy', 'Dr. Lakshmi Pillai', 'Dr. Sunil Nair', 'Dr. Divya Krishnan', 'Dr. Rajeev Panicker', 'Dr. Meera Balakrishnan', 'Dr. George Mathew', 'Dr. Anjali Warrier', 'Dr. Vinod Kurup', 'Dr. Sheeba Thomas'];
const FIRST_F = ['Meera', 'Anjali', 'Lakshmi', 'Divya', 'Sheeba', 'Priya', 'Reshma', 'Nisha', 'Sarita', 'Devika', 'Kavya', 'Sindhu'];
const FIRST_M = ['Anil', 'Sunil', 'Rajeev', 'George', 'Vinod', 'Thomas', 'Manoj', 'Sajeev', 'Biju', 'Arun', 'Jayan', 'Renjith'];
const CONSONANTS = 'ABCDEFGHJKLMNPRSTV'.split('');

const ROOMS = ['General ward', 'Twin sharing', 'Private (non-AC)', 'Private AC', 'ICU/CCU', 'Deluxe / suite'];
const ROOM_RATE = { 'General ward': 1400, 'Twin sharing': 2900, 'Private (non-AC)': 4200, 'Private AC': 6200, 'ICU/CCU': 9200, 'Deluxe / suite': 11800 };
const ROOM_TIER = { 'General ward': 0, 'Twin sharing': 1, 'Private (non-AC)': 2, 'Private AC': 3, 'ICU/CCU': 4, 'Deluxe / suite': 5 };

const PROCS = [
  { name: 'Right total knee replacement', dept: 'Orthopaedics', implant: true, implantLabel: 'Cemented titanium knee implant', base: 155000, days: [4, 6],
    inclusions: ['Room rent up to Twin sharing', 'Standard cemented implant', 'OT & anaesthesia charges', 'Physiotherapy — 4 sessions', 'Routine pre-op investigations'],
    imaging: 'Post-op X-ray knee AP/Lat' },
  { name: 'Emergency PTCA with drug-eluting stent', dept: 'Cardiology', implant: true, implantLabel: 'Drug-eluting coronary stent', base: 210000, days: [2, 4],
    inclusions: ['ICU/CCU up to 2 days', 'Single DES stent', 'Cath lab procedure charges', 'Post-procedure ECG monitoring'],
    imaging: '2D-Echo (post-procedure)' },
  { name: 'Laparoscopic cholecystectomy', dept: 'General Surgery', implant: false, base: 92000, days: [2, 3],
    inclusions: ['Room rent up to Twin sharing', 'OT & anaesthesia charges', 'Standard laparoscopic consumables', 'Routine pre-op investigations'],
    imaging: 'Ultrasound abdomen (pre-op)' },
  { name: 'Total abdominal hysterectomy', dept: 'Gynaecology', implant: false, base: 98000, days: [3, 5],
    inclusions: ['Room rent up to Twin sharing', 'OT & anaesthesia charges', 'Routine pre-op investigations', 'Physiotherapy — 2 sessions'],
    imaging: 'Ultrasound pelvis (pre-op)' },
  { name: 'Lumbar spinal fusion (L4-L5)', dept: 'Orthopaedics', implant: true, implantLabel: 'Pedicle screw & rod system', base: 285000, days: [5, 7],
    inclusions: ['Room rent up to Twin sharing', 'Standard implant set', 'OT & anaesthesia charges', 'Physiotherapy — 6 sessions'],
    imaging: 'MRI spine (pre-op)' },
  { name: 'Lower segment caesarean section', dept: 'Gynaecology', implant: false, base: 68000, days: [3, 4],
    inclusions: ['Room rent up to Twin sharing', 'OT & anaesthesia charges', 'Neonatal charges — routine', 'Routine post-natal investigations'],
    imaging: 'Ultrasound abdomen (post-op)' },
  { name: 'ACL reconstruction (arthroscopic)', dept: 'Orthopaedics', implant: true, implantLabel: 'Bio-absorbable interference screw', base: 118000, days: [2, 3],
    inclusions: ['Room rent up to Twin sharing', 'Standard implant', 'OT & anaesthesia charges', 'Physiotherapy — 4 sessions'],
    imaging: 'MRI knee (pre-op)' },
  { name: 'Total thyroidectomy', dept: 'General Surgery', implant: false, base: 105000, days: [3, 4],
    inclusions: ['Room rent up to Twin sharing', 'OT & anaesthesia charges', 'Routine pre-op investigations'],
    imaging: 'Neck ultrasound (pre-op)' },
  { name: 'Percutaneous nephrolithotomy (PCNL)', dept: 'Urology', implant: false, base: 128000, days: [3, 5],
    inclusions: ['Room rent up to Twin sharing', 'OT & anaesthesia charges', 'Routine pre-op investigations'],
    imaging: 'CT KUB (pre-op)' },
  { name: 'CABG (triple vessel)', dept: 'Cardiology', implant: false, base: 385000, days: [6, 9],
    inclusions: ['ICU/CCU up to 3 days', 'OT & anaesthesia charges', 'Standard bypass consumables', 'Physiotherapy — 4 sessions'],
    imaging: '2D-Echo (post-op)' },
  { name: 'Total hip replacement', dept: 'Orthopaedics', implant: true, implantLabel: 'Cementless titanium hip implant', base: 265000, days: [5, 7],
    inclusions: ['Room rent up to Twin sharing', 'Standard implant', 'OT & anaesthesia charges', 'Physiotherapy — 5 sessions'],
    imaging: 'Post-op X-ray hip AP/Lat' },
  { name: 'Modified radical mastectomy', dept: 'General Surgery', implant: false, base: 145000, days: [4, 6],
    inclusions: ['Room rent up to Twin sharing', 'OT & anaesthesia charges', 'Routine pre-op investigations'],
    imaging: 'CT chest (staging)' },
];

const PAYER_TYPES = [
  { type: 'Cash', share: 0.20 },
  { type: 'TPA', share: 0.45 },
  { type: 'International', share: 0.12 },
  { type: 'Govt scheme', share: 0.23 },
];
const TPA_NAMES = ['Star Health', 'Medi Assist (TPA)', 'Paramount TPA', 'Vidal Health TPA', 'MediBuddy', 'Corporate GHI — PeerCorp Industries'];
const INTL_NAMES = ['GlobeCare International Assist', 'Gulf Region Corporate Insurance', 'OverseasMed TPA (UAE)', 'Self-pay — international patient'];
const SCHEME_NAMES = ['CGHS', 'PMJAY (Ayushman Bharat)', 'Kerala govt employee scheme (MEDISEP)'];
const ENTITLEMENT_BY_PAYER = { 'CGHS': 'Twin sharing', 'PMJAY (Ayushman Bharat)': 'General ward', 'Kerala govt employee scheme (MEDISEP)': 'Twin sharing' };

function payerFor() {
  const roll = rand(); let acc = 0;
  const t = PAYER_TYPES.find(p => (acc += p.share) >= roll) || PAYER_TYPES[0];
  if (t.type === 'Cash') return { type: 'Cash', name: 'Self-pay (cash)', roomEntitlement: null };
  if (t.type === 'TPA') { const name = pick(TPA_NAMES); return { type: 'TPA', name, roomEntitlement: pick(['Twin sharing', 'Twin sharing', 'Private (non-AC)']) }; }
  if (t.type === 'International') { const name = pick(INTL_NAMES); return { type: 'International', name, roomEntitlement: pick(['Private (non-AC)', 'Private AC', 'Deluxe / suite']) }; }
  const name = pick(SCHEME_NAMES);
  return { type: 'Govt scheme', name, roomEntitlement: ENTITLEMENT_BY_PAYER[name], schemeRate: true };
}

const NURSING_RATE = 900, CONSULT_RATE = 600, LAB_ITEMS = [
  ['CBC', 350], ['RFT', 450], ['LFT', 500], ['Electrolytes', 400], ['Coagulation profile', 650], ['Blood grouping & cross-match', 550],
  ['HbA1c', 450], ['Troponin-I', 900], ['CRP', 500], ['Urine routine', 250], ['Blood sugar (random)', 150], ['Lipid profile', 600],
];
const RADIO_ITEMS = [['X-ray chest PA', 450], ['ECG', 250], ['2D-Echo', 2800], ['Ultrasound abdomen', 1800], ['CT scan (region)', 6500]];
const PHARMA_ITEMS = ['IV antibiotics (course)', 'Analgesics (course)', 'IV fluids', 'Anti-emetics', 'PPI cover', 'DVT prophylaxis (LMWH)', 'Oral antibiotics (take-home)', 'Multivitamin/supportive'];
const CONSUMABLE_ITEMS = ['Surgical drape kit', 'Sterile gown set', 'IV cannula set', 'Urinary catheter set', 'Dressing kit', 'Suture material', 'Gloves (surgical, box)', 'Syringes & needles (set)'];
const NONPAYABLE_ITEMS = ['Registration & admission kit', 'Attendant meal charges', 'Housekeeping consumables', 'Disposable thermometer cover', 'Cotton roll & gauze (routine)'];

let seq = 3100;
function makeBill(proc, payer, roomCategory, days) {
  const lines = [];
  let lid = 1;
  const add = (section, label, qty, rate, extra = {}) => {
    const amount = round10(qty * rate);
    lines.push({ id: `L${lid++}`, section, label, qty, rate, amount, flag: null, ...extra });
    return lines[lines.length - 1];
  };
  const roomRate = ROOM_RATE[roomCategory];
  add('Room', `Room rent (${roomCategory}, ${days} day${days > 1 ? 's' : ''})`, days, roomRate);
  add('Nursing', `Nursing charges (${days} day${days > 1 ? 's' : ''})`, days, NURSING_RATE);
  const visits = days + int(0, 2);
  add('Consultation', `Consultant visit charges (${proc.dept})`, visits, CONSULT_RATE);
  if (rand() < 0.5) add('Consultation', 'Physician cross-consultation', int(1, 2), 700);
  add('Procedure', `${proc.name} — surgeon & anaesthetist professional fee`, 1, round10(proc.base * 0.35));
  add('OT', 'OT & anaesthesia charges', 1, round10(proc.base * 0.22));
  if (proc.implant) add('Implant', proc.implantLabel, 1, round10(proc.base * 0.4), { sticker: true, batch: `BT${int(1000, 9999)}` });
  // physiotherapy sessions — number is package-included up to a limit
  const physioIncluded = (proc.inclusions.find(i => i.startsWith('Physiotherapy')) || '').match(/\d+/);
  const physioLimit = physioIncluded ? Number(physioIncluded[0]) : 0;
  if (physioLimit) add('Procedure', `Physiotherapy sessions (${physioLimit} billed)`, physioLimit, 800);
  const nLab = int(4, 8);
  for (let i = 0; i < nLab; i++) { const [name, rate] = pick(LAB_ITEMS); add('Lab', name, 1, rate); }
  const nRadio = int(1, 2);
  for (let i = 0; i < nRadio; i++) { const [name, rate] = pick(RADIO_ITEMS); add('Radiology', name, 1, rate); }
  const nPharm = int(6, 14);
  for (let i = 0; i < nPharm; i++) add('Pharmacy', pick(PHARMA_ITEMS), int(1, 3), int(80, 420));
  const nCons = int(5, 12);
  for (let i = 0; i < nCons; i++) add('Consumables', pick(CONSUMABLE_ITEMS), int(1, 4), int(120, 900));
  return lines;
}

function makeLog(proc, days, doctor) {
  const entries = []; let eid = 1;
  const add = (day, section, label, note = '') => entries.push({ id: `E${eid++}`, day, section, label, note });
  add(1, 'Admission', 'Admission & pre-op work-up', `Under ${doctor}`);
  add(1, 'Lab', 'Pre-op investigation panel done', '');
  add(2, 'Procedure', proc.name, `Performed by ${doctor}`);
  add(2, 'OT', 'OT consumables issued', proc.implant ? `1x ${proc.implantLabel} used` : 'Standard set used');
  for (let d = 2; d <= days; d++) add(d, 'Nursing', 'Nursing rounds & vitals monitoring', '');
  const physioIncluded = (proc.inclusions.find(i => i.startsWith('Physiotherapy')) || '').match(/\d+/);
  const physioLimit = physioIncluded ? Number(physioIncluded[0]) : 0;
  for (let i = 1; i <= physioLimit; i++) add(Math.min(days, 1 + i), 'Procedure', `Physiotherapy session #${i}`, 'Nursing note confirms session done');
  add(Math.max(1, days - 1), 'Radiology', proc.imaging, 'Ordered and performed as per protocol');
  return entries;
}

const N = 40;
const patients = [];
for (let i = 0; i < N; i++) {
  const proc = pick(PROCS);
  const sex = rand() < 0.5 ? 'F' : 'M';
  const initials = (sex === 'F' ? pick(FIRST_F) : pick(FIRST_M))[0] + pick(CONSONANTS);
  const age = int(24, 79);
  const doctor = pick(DOCTORS);
  const payer = payerFor();
  const days = int(proc.days[0], proc.days[1]);
  // room category: usually matches entitlement, sometimes drifts up
  let roomCategory = payer.roomEntitlement || pick(ROOMS);
  const overrentRoll = rand();
  if (payer.roomEntitlement && overrentRoll < 0.3) {
    const tiers = Object.keys(ROOM_TIER).filter(r => ROOM_TIER[r] > ROOM_TIER[payer.roomEntitlement]);
    if (tiers.length) roomCategory = pick(tiers);
  } else if (!payer.roomEntitlement) roomCategory = pick(ROOMS);

  const bill = makeBill(proc, payer, roomCategory, days);
  const log = makeLog(proc, days, doctor);
  const byId = m => bill.find(l => l.id === m);

  // ---- built-in exceptions (1-3 per patient, weighted so some patients are clean) ----
  const exRoll = rand();
  const wantExceptions = exRoll < 0.85 ? int(1, 3) : 0;
  const pool = [];

  // 1. unbilled item: an MRI/CT ordered per log but never billed
  pool.push(() => {
    const [name, rate] = pick(RADIO_ITEMS.filter(r => r[0].startsWith('CT') || r[0].startsWith('Ultrasound')).concat([['MRI (region)', 9500]]));
    log.push({ id: `E${log.length + 1}`, day: Math.max(1, days - 1), section: 'Radiology', label: name, note: 'Ordered and reported — not on the interim bill', unbilled: true, estimatedAmount: rate });
  });
  // 2. duplicate charge
  pool.push(() => {
    const cands = bill.filter(l => ['Lab', 'Radiology', 'Consultation', 'Nursing'].includes(l.section) && !l.flag);
    if (!cands.length) return;
    const src = pick(cands);
    bill.push({ id: `L${bill.length + 1}`, section: src.section, label: src.label, qty: src.qty, rate: src.rate, amount: src.amount, flag: 'duplicate', note: `Repeats ${src.id} — same charge posted twice` });
  });
  // 3. package inclusion billed separately (only when a package exists and days<=... )
  pool.push(() => {
    const physioLine = bill.find(l => l.label.startsWith('Physiotherapy'));
    if (physioLine) { physioLine.flag = 'inclusion'; physioLine.note = 'Included in the package price — should not be billed as a separate line'; return; }
    const inv = bill.find(l => l.section === 'Investigations') || bill.find(l => l.section === 'Lab');
    if (inv) { inv.flag = 'inclusion'; inv.note = 'Routine pre-op investigations are part of the package — remove from the separate bill'; }
  });
  // 4. TPA/scheme non-payable (only for TPA / International / Govt scheme)
  pool.push(() => {
    if (payer.type === 'Cash') return;
    const [name, amt] = [pick(NONPAYABLE_ITEMS), int(400, 2200)];
    bill.push({ id: `L${bill.length + 1}`, section: 'Consumables', label: name, qty: 1, rate: amt, amount: amt, flag: 'nonpayable', note: `${payer.name} treats this as a non-payable item — recover from patient` });
  });
  // 5. room rent over entitlement
  pool.push(() => {
    if (!payer.roomEntitlement || ROOM_TIER[roomCategory] <= ROOM_TIER[payer.roomEntitlement]) return;
    const roomLine = bill.find(l => l.section === 'Room');
    const entRate = ROOM_RATE[payer.roomEntitlement];
    const excess = round10((ROOM_RATE[roomCategory] - entRate) * days);
    roomLine.flag = 'overrent';
    roomLine.note = `Entitlement is ${payer.roomEntitlement} (₹${entRate}/day); patient occupies ${roomCategory} (₹${ROOM_RATE[roomCategory]}/day) — excess ₹${excess.toLocaleString('en-IN')} to the patient`;
    roomLine.excessAmount = excess;
  });
  // 6. implant billed without sticker/batch
  pool.push(() => {
    const implantLine = bill.find(l => l.section === 'Implant');
    if (!implantLine) return;
    implantLine.sticker = false; implantLine.batch = null;
    implantLine.flag = 'noimplantsticker';
    implantLine.note = 'Implant sticker/batch not attached to the file — TPA will reject the implant charge until the sticker is on record';
  });

  // pick applicable exceptions without duplicate types, respecting eligibility
  const chosen = new Set();
  let guard = 0;
  while (chosen.size < wantExceptions && guard++ < 20) {
    const idx = int(0, pool.length - 1);
    if (idx === 3 && payer.type === 'Cash') continue; // non-payable needs a payer
    if (idx === 4 && !payer.roomEntitlement) continue; // over-entitlement needs a scheme/TPA entitlement
    if (idx === 5 && !proc.implant) continue; // sticker issue needs an implant
    if (idx === 4 && ROOM_TIER[roomCategory] <= (ROOM_TIER[payer.roomEntitlement] || 0)) continue;
    chosen.add(idx);
  }
  chosen.forEach(idx => pool[idx]());

  const billTotal = bill.reduce((s, l) => s + l.amount, 0);
  const unbilledLog = log.filter(e => e.unbilled);
  const leakage = unbilledLog.reduce((s, e) => s + e.estimatedAmount, 0);
  const overbilling = bill.filter(l => l.flag === 'duplicate' || l.flag === 'inclusion').reduce((s, l) => s + l.amount, 0);
  const patientPayable = bill.filter(l => l.flag === 'nonpayable').reduce((s, l) => s + l.amount, 0) + bill.filter(l => l.flag === 'overrent').reduce((s, l) => s + (l.excessAmount || 0), 0);
  const complianceRisk = bill.some(l => l.flag === 'noimplantsticker');
  const exceptionCount = unbilledLog.length + bill.filter(l => l.flag).length;

  patients.push({
    id: `DIS-${seq++}`,
    initials, age, sex, dept: proc.dept, procedure: proc.name, doctor,
    package: { name: `${proc.name} package`, inclusions: proc.inclusions, price: round10(proc.base) },
    payer, roomCategory, days,
    dischargeHours: int(2, 24),
    billLines: bill, logEntries: log,
    billTotal, leakage, overbilling, patientPayable, complianceRisk, exceptionCount,
  });
}

// Shuffle display order (seeded) so the queue doesn't read as sorted.
for (let i = patients.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [patients[i], patients[j]] = [patients[j], patients[i]];
}

const out = {
  generatedAt: '2026-09-28',
  hospital: 'VPS Lakeshore Hospital, Kochi',
  patients,
};

const file = fileURLToPath(import.meta.url);
const dataPath = join(dirname(file), '..', '..', 'data', 'discharge-billing.json');
mkdirSync(dirname(dataPath), { recursive: true });
writeFileSync(dataPath, JSON.stringify(out));
console.log(`Wrote ${patients.length} patients to ${dataPath}`);
