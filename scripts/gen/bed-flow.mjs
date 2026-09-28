// Generates data/bed-flow.json — synthetic daily IP census, waiting-admission list and
// 30-day patient-flow metrics for the bed & discharge flow assistant. Node, no dependencies.
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
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad = n => String(n).padStart(2, '0');

const WARDS = [
  { name: 'Cardiac ICU', bedType: 'ICU', beds: 8, prefix: 'CI' },
  { name: 'MICU', bedType: 'ICU', beds: 8, prefix: 'MI' },
  { name: 'Ortho ward', bedType: 'Ortho', beds: 10, prefix: 'OR' },
  { name: 'Oncology', bedType: 'Onco', beds: 8, prefix: 'ON' },
  { name: 'Transplant', bedType: 'Transplant', beds: 6, prefix: 'TX' },
  { name: 'General ward A', bedType: 'General', beds: 10, prefix: 'GA' },
  { name: 'General ward B', bedType: 'General', beds: 10, prefix: 'GB' },
  { name: 'General ward C', bedType: 'General', beds: 10, prefix: 'GC' },
  { name: 'General ward D', bedType: 'General', beds: 10, prefix: 'GD' },
  { name: 'Private rooms', bedType: 'Private', beds: 8, prefix: 'PR' },
  { name: 'International suite', bedType: 'Suite', beds: 4, prefix: 'IS' },
];

const PAYERS_BY_TYPE = {
  ICU: ['TPA', 'TPA', 'Cash', 'Govt scheme'],
  Ortho: ['TPA', 'TPA', 'Cash', 'Govt scheme'],
  Onco: ['TPA', 'Cash', 'TPA', 'Govt scheme'],
  Transplant: ['TPA', 'International', 'Cash'],
  General: ['Cash', 'TPA', 'Govt scheme', 'Cash'],
  Private: ['Cash', 'TPA', 'International'],
  Suite: ['International', 'International', 'TPA'],
};

const BLOCKERS = [
  'TPA final approval pending',
  'Final bill not prepared',
  'Pharmacy return',
  'Discharge summary unsigned',
  'Reports awaited',
  'Transport/relatives not arrived',
  'Housekeeping',
];

const FIRST_F = ['Meera', 'Anjali', 'Lakshmi', 'Divya', 'Sheeba', 'Priya', 'Reshma', 'Nisha', 'Sarita', 'Devika', 'Kavya', 'Remya'];
const FIRST_M = ['Anil', 'Sunil', 'Rajeev', 'George', 'Vinod', 'Thomas', 'Manoj', 'Sajeev', 'Biju', 'Arun', 'Jose', 'Vishnu'];
const LAST_INIT = 'ABCDEFGHJKLMNPRSTV'.split('');
const initials = () => { const sex = rand() < 0.5 ? 'F' : 'M'; return { sex, initials: (sex === 'F' ? pick(FIRST_F) : pick(FIRST_M))[0] + pick(LAST_INIT) }; };

function admittedDate(daysAgoMax) {
  const d = new Date('2026-09-28');
  d.setDate(d.getDate() - int(1, daysAgoMax));
  return d.toISOString().slice(0, 10);
}

function blockerWeight(bedType, payer) {
  // weight per blocker type given ward/payer context
  const w = { 'TPA final approval pending': 1, 'Final bill not prepared': 1, 'Pharmacy return': 1, 'Discharge summary unsigned': 1, 'Reports awaited': 1, 'Transport/relatives not arrived': 1, 'Housekeeping': 1 };
  if (payer === 'TPA' || payer === 'Govt scheme') w['TPA final approval pending'] = 4;
  if (payer === 'International') w['Transport/relatives not arrived'] = 4;
  if (bedType === 'ICU' || bedType === 'Transplant') w['Reports awaited'] = 3;
  if (bedType === 'Onco') w['Discharge summary unsigned'] = 2.5;
  if (payer === 'Cash') w['Final bill not prepared'] = 3;
  return w;
}
function weightedBlockers(bedType, payer, n) {
  const w = blockerWeight(bedType, payer);
  const pool = [];
  BLOCKERS.forEach(b => { for (let i = 0; i < Math.round(w[b] * 3); i++) pool.push(b); });
  const chosen = new Set();
  while (chosen.size < n && chosen.size < BLOCKERS.length) chosen.add(pick(pool));
  return [...chosen];
}

const beds = [];
WARDS.forEach(ward => {
  for (let i = 1; i <= ward.beds; i++) {
    const p = initials();
    const payer = pick(PAYERS_BY_TYPE[ward.bedType]);
    const expected = rand() < 0.42;
    let targetTime = null, blockers = [];
    if (expected) {
      const baseHour = 9 + Math.floor(rand() * rand() * 6); // skew earlier
      targetTime = `${pad(clamp(baseHour, 9, 15))}:${pick(['00', '15', '30', '45'])}`;
      const nBlockers = rand() < 0.28 ? 0 : rand() < 0.7 ? 1 : 2;
      blockers = weightedBlockers(ward.bedType, payer, nBlockers);
    }
    beds.push({
      id: `${ward.prefix}-${pad(i)}`,
      bedNo: `${ward.prefix}-${pad(i)}`,
      ward: ward.name,
      bedType: ward.bedType,
      patientInitials: p.initials, sex: p.sex, age: int(4, 82),
      payer,
      admittedDate: admittedDate(ward.bedType === 'ICU' ? 6 : ward.bedType === 'Transplant' ? 18 : 10),
      expectedDischargeToday: expected,
      targetTime,
      blockers,
    });
  }
});
// seeded shuffle so the census doesn't read as sorted by ward
for (let i = beds.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [beds[i], beds[j]] = [beds[j], beds[i]]; }

const BED_TYPES = ['ICU', 'Ortho', 'Onco', 'Transplant', 'General', 'Private', 'Suite'];
const SOURCES = ['ER', 'OT', 'Elective'];
const NOTES_BY_TYPE = {
  ICU: { ER: 'Breathless, needs monitored bed', OT: 'Post-op, needs ICU stepdown', Elective: 'Planned admission, high-risk monitoring' },
  Ortho: { ER: 'Post-fall, needs ortho bed', OT: 'Post-op ortho recovery, ready to shift to ward', Elective: 'Planned joint surgery tomorrow morning' },
  Onco: { ER: 'Fever with neutropenia, oncology admission', OT: 'Post-op, oncology recovery bed needed', Elective: 'Planned admission, chemotherapy cycle' },
  Transplant: { ER: 'Graft-related concern, needs transplant bed', OT: 'Post-transplant recovery, stepdown needed', Elective: 'Planned admission, transplant work-up' },
  General: { ER: 'Abdominal pain, surgical admission likely', OT: 'Recovery, ready to shift to ward', Elective: 'OP-to-IP conversion, consultant advised' },
  Private: { ER: 'Chest pain, ruled in for admission', OT: 'Elective surgery just completed', Elective: 'Planned admission, family requested private room' },
  Suite: { ER: 'International patient, needs monitored admission', OT: 'International patient, post-op recovery', Elective: 'Planned admission, international patient' },
};
const waiting = [];
const N_WAIT = 15;
for (let i = 0; i < N_WAIT; i++) {
  const source = pick(SOURCES);
  const requiredBedType = pick(BED_TYPES);
  const p = initials();
  const waitHours = rand() < 0.3 ? rand() * 1 : rand() * rand() * 6 + 0.5;
  const h = clamp(8 - Math.floor(waitHours), 3, 8);
  const m = int(0, 59);
  waiting.push({
    id: `W-${pad(i + 1)}`,
    source,
    patientInitials: p.initials, sex: p.sex, age: int(2, 80),
    requiredBedType,
    waitStart: `${pad(h)}:${pad(m)}`,
    waitHours: Math.round(waitHours * 10) / 10,
    note: NOTES_BY_TYPE[requiredBedType][source],
  });
}
waiting.sort((a, b) => b.waitHours - a.waitHours);

const metrics = [];
{
  const start = new Date('2026-08-29');
  let prevDischarges = 34;
  for (let i = 0; i < 30; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const isWeekend = [0, 6].includes(d.getDay());
    const discharges = clamp(Math.round(prevDischarges + (rand() - 0.5) * 10 + (isWeekend ? -6 : 0)), 18, 48);
    prevDischarges = discharges;
    const pctBeforeNoon = clamp(Math.round(30 + rand() * 35 + (isWeekend ? -8 : 0)), 15, 72);
    const avgTAT = Math.round((2.6 + rand() * 2.6 + (isWeekend ? 0.5 : 0)) * 10) / 10;
    const erBoardingHours = Math.round((1.4 + rand() * 3.8 + (isWeekend ? 0.8 : 0)) * 10) / 10;
    metrics.push({ date: d.toISOString().slice(0, 10), discharges, pctBeforeNoon, avgTAT, erBoardingHours });
  }
}

const out = {
  generatedAt: '2026-09-28',
  hospital: 'VPS Lakeshore Hospital, Kochi',
  currentTime: '09:10',
  wards: WARDS.map(w => ({ name: w.name, bedType: w.bedType, beds: w.beds })),
  beds,
  waiting,
  metrics,
};

const file = fileURLToPath(import.meta.url);
const dataPath = join(dirname(file), '..', '..', 'data', 'bed-flow.json');
mkdirSync(dirname(dataPath), { recursive: true });
writeFileSync(dataPath, JSON.stringify(out, null, 1));
console.log(`Wrote ${beds.length} beds, ${waiting.length} waiting admissions, ${metrics.length} days of metrics to ${dataPath}`);
