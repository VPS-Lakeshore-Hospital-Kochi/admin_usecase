// Generates data/equipment-utilisation.json — synthetic high-value equipment register
// (18 assets), 12 months of usage/revenue/downtime, and ~40 downtime tickets, for the
// Facilities & Biomedical equipment utilisation & AMC analyser. Node, no dependencies.
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
const round1 = v => Math.round(v * 10) / 10;

const GENERATED_AT = '2026-09-28';
const HOSPITAL = 'VPS Lakeshore Hospital, Kochi';

// 12 months ending with the current month, Oct'25 through Sep'26.
const MONTHS = [];
{
  let y = 2025, m = 10; // Oct 2025
  for (let i = 0; i < 12; i++) {
    MONTHS.push(`${y}-${String(m).padStart(2, '0')}`);
    m++; if (m > 12) { m = 1; y++; }
  }
}
const MONTH_LABELS = MONTHS.map(k => {
  const [y, m] = k.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
});

// ---------- Asset register ----------
// Fictional OEM/model names only — no real manufacturers.
const ASSETS_SPEC = [
  { id: 'EQ-01', name: 'Surgical robot', category: 'Surgery', oem: 'Solera Surgical Systems', model: 'Helios X1', install: 2021, capCr: 21.5, amcPct: 9.5, avail: 250, sla: 92, baseUtil: 0.30, trend: 0.055, revPerHour: 55000, casesPerHour: 0.32 },
  { id: 'EQ-02', name: 'Cath lab 1', category: 'Cardiology', oem: 'Kestrel Diagnostics', model: 'CardioFlow 512', install: 2019, capCr: 7.8, amcPct: 8.5, avail: 300, sla: 95, baseUtil: 0.66, trend: 0.01, revPerHour: 33000, casesPerHour: 0.75 },
  { id: 'EQ-03', name: 'Cath lab 2', category: 'Cardiology', oem: 'Kestrel Diagnostics', model: 'CardioFlow 512', install: 2022, capCr: 8.1, amcPct: 8.5, avail: 300, sla: 95, baseUtil: 0.44, trend: 0.02, revPerHour: 30000, casesPerHour: 0.7 },
  { id: 'EQ-04', name: 'MRI 3T', category: 'Imaging', oem: 'Meridian Imaging', model: 'Aurora 3T', install: 2020, capCr: 14.2, amcPct: 9, avail: 300, sla: 95, baseUtil: 0.80, trend: 0.005, revPerHour: 19000, casesPerHour: 1.05 },
  { id: 'EQ-05', name: 'MRI 1.5T', category: 'Imaging', oem: 'Meridian Imaging', model: 'Aurora 1.5T', install: 2017, capCr: 8.4, amcPct: 8, avail: 300, sla: 93, baseUtil: 0.58, trend: 0.01, revPerHour: 14000, casesPerHour: 1.1 },
  { id: 'EQ-06', name: 'CT scanner 1', category: 'Imaging', oem: 'Meridian Imaging', model: 'Vantage CT128', install: 2021, capCr: 6.6, amcPct: 8, avail: 300, sla: 95, baseUtil: 0.85, trend: 0.003, revPerHour: 12500, casesPerHour: 1.6 },
  { id: 'EQ-07', name: 'CT scanner 2', category: 'Imaging', oem: 'Meridian Imaging', model: 'Vantage CT64', install: 2016, capCr: 4.9, amcPct: 8.5, avail: 300, sla: 92, baseUtil: 0.52, trend: 0.015, revPerHour: 11000, casesPerHour: 1.5 },
  { id: 'EQ-08', name: 'PET-CT', category: 'Imaging', oem: 'Northgate Molecular', model: 'IsoTrace 700', install: 2022, capCr: 16.8, amcPct: 10, avail: 190, sla: 90, baseUtil: 0.38, trend: 0.04, revPerHour: 42000, casesPerHour: 0.5 },
  { id: 'EQ-09', name: 'Linear accelerator', category: 'Oncology', oem: 'Zenith Radiotherapy', model: 'ApexBeam 6', install: 2020, capCr: 19.5, amcPct: 9.5, avail: 280, sla: 95, baseUtil: 0.62, trend: 0.02, revPerHour: 21000, casesPerHour: 1.1 },
  { id: 'EQ-10', name: 'Lithotripter', category: 'Urology', oem: 'Solera Surgical Systems', model: 'ClearWave L2', install: 2018, capCr: 3.1, amcPct: 8, avail: 180, sla: 90, baseUtil: 0.16, trend: -0.005, revPerHour: 16000, casesPerHour: 0.5 },
  { id: 'EQ-11', name: 'Dialysis stations (30, pooled)', category: 'Nephrology', oem: 'Riverline Renal Care', model: 'FlowCare D30', install: 2019, capCr: 4.4, amcPct: 7, avail: 7200, sla: 96, baseUtil: 0.74, trend: 0.008, revPerHour: 2400, casesPerHour: 0.34 },
  { id: 'EQ-12', name: 'ECMO (fleet of 4)', category: 'Critical care', oem: 'Northgate Molecular', model: 'LifeFlow ECMO-4', install: 2021, capCr: 2.6, amcPct: 11, avail: 2880, sla: 98, baseUtil: 0.09, trend: 0.01, revPerHour: 9000, casesPerHour: 0.02 },
  { id: 'EQ-13', name: 'OT integration suite', category: 'Surgery', oem: 'Vantage OR Systems', model: 'IntegraSuite Pro', install: 2020, capCr: 3.4, amcPct: 9, avail: 420, sla: 94, baseUtil: 0.70, trend: 0.01, revPerHour: 6000, casesPerHour: 0.4 },
  { id: 'EQ-14', name: 'Digital radiography 1', category: 'Imaging', oem: 'Meridian Imaging', model: 'ClearRay DR200', install: 2018, capCr: 1.3, amcPct: 7, avail: 320, sla: 93, baseUtil: 0.72, trend: 0.005, revPerHour: 2800, casesPerHour: 2.2 },
  { id: 'EQ-15', name: 'Digital radiography 2', category: 'Imaging', oem: 'Meridian Imaging', model: 'ClearRay DR200', install: 2023, capCr: 1.4, amcPct: 6, avail: 320, sla: 95, baseUtil: 0.48, trend: 0.02, revPerHour: 2800, casesPerHour: 2.1 },
  { id: 'EQ-16', name: 'Mammography', category: 'Imaging', oem: 'Northgate Molecular', model: 'ClearView Mammo3D', install: 2019, capCr: 2.1, amcPct: 8, avail: 260, sla: 93, baseUtil: 0.40, trend: 0.02, revPerHour: 4200, casesPerHour: 1.3 },
  { id: 'EQ-17', name: 'Fibroscan', category: 'Gastroenterology', oem: 'Riverline Renal Care', model: 'HepaScan F500', install: 2022, capCr: 0.65, amcPct: 7, avail: 220, sla: 90, baseUtil: 0.34, trend: 0.03, revPerHour: 3200, casesPerHour: 1.6 },
  { id: 'EQ-18', name: 'Bone densitometry (DEXA)', category: 'Imaging', oem: 'Vantage OR Systems', model: 'BoneMetric D2', install: 2017, capCr: 0.95, amcPct: 7.5, avail: 220, sla: 90, baseUtil: 0.28, trend: -0.01, revPerHour: 1800, casesPerHour: 1.8 },
];

const REASONS = ['Breakdown', 'PM', 'Awaiting part'];
const REASON_WEIGHT = { 'Breakdown': 0.45, 'PM': 0.35, 'Awaiting part': 0.20 };
function pickReason() {
  const r = rand();
  let acc = 0;
  for (const [k, w] of Object.entries(REASON_WEIGHT)) { acc += w; if (r <= acc) return k; }
  return 'Breakdown';
}

const RENEWAL_START = { 'EQ-01': '2026-11-15', 'EQ-02': '2026-10-05', 'EQ-03': '2027-01-20', 'EQ-04': '2026-12-01',
  'EQ-05': '2027-04-10', 'EQ-06': '2026-10-22', 'EQ-07': '2027-02-14', 'EQ-08': '2027-01-05', 'EQ-09': '2026-11-30',
  'EQ-10': '2027-03-18', 'EQ-11': '2026-12-15', 'EQ-12': '2027-05-01', 'EQ-13': '2027-02-28', 'EQ-14': '2027-06-10',
  'EQ-15': '2027-07-01', 'EQ-16': '2026-10-28', 'EQ-17': '2027-03-05', 'EQ-18': '2026-11-08' };

const assets = ASSETS_SPEC.map(a => {
  const amcAnnual = Math.round(a.capCr * 1e7 * a.amcPct / 100 / 10000) * 10000;
  const months = MONTHS.map((mKey, i) => {
    const seasonal = [0].includes(i % 12) ? -0.03 : 0; // slight dip in Oct (festival slowdown)
    const utilFrac = clamp(a.baseUtil + a.trend * (i / 11) + (rand() - 0.5) * 0.06 + seasonal, 0.04, 0.97);
    const usedHours = round1(a.avail * utilFrac);
    const cases = Math.max(0, Math.round(usedHours * a.casesPerHour * (0.9 + rand() * 0.2)));
    const revenueLakh = round1((usedHours * a.revPerHour * (0.92 + rand() * 0.16)) / 100000);
    // downtime: baseline unreliability skewed by asset age and category
    const ageFactor = clamp((2026 - a.install) / 10, 0.15, 1.1);
    const downtimeHours = round1(clamp((a.avail * 0.02 + rand() * a.avail * 0.05) * ageFactor, 0.5, a.avail * 0.18));
    const bd = { breakdown: 0, pm: 0, awaitingPart: 0 };
    let remain = downtimeHours;
    const w = { breakdown: 0.4 + rand() * 0.2, pm: 0.25 + rand() * 0.15 };
    bd.breakdown = round1(remain * w.breakdown); remain -= bd.breakdown;
    bd.pm = round1(remain * (w.pm / (1 - w.breakdown))); remain -= bd.pm;
    bd.awaitingPart = round1(Math.max(0, remain));
    return { month: mKey, usedHours, cases, revenueLakh, downtimeHours, downtimeBreakdown: bd };
  });
  return {
    id: a.id, name: a.name, category: a.category, oem: a.oem, model: a.model,
    installYear: a.install, capitalCostCr: a.capCr, amcAnnual, amcRenewalDate: RENEWAL_START[a.id],
    availableHoursMonth: a.avail, slaUptimePct: a.sla, months,
  };
});

// ---------- Downtime tickets (~40 across the fleet) ----------
const NOTES_BY_REASON = {
  'Breakdown': ['Unplanned stoppage during a case', 'Fault code triggered mid-shift', 'Power/console fault reported by user', 'Intermittent fault reported over two shifts'],
  'PM': ['Scheduled preventive maintenance visit', 'Quarterly calibration and safety check', 'Annual PM as per AMC schedule', 'Software/firmware update during PM window'],
  'Awaiting part': ['Spare part ordered from OEM, awaiting delivery', 'Import clearance delay on replacement part', 'Part backordered by OEM regional depot', 'Component swap pending part arrival'],
};
const ENGINEERS = ['Anoop Varghese', 'Divya Menon', 'Rahul Pillai', 'Sneha Thomas', 'Vishnu Nair'];

function dateInMonth(mKey, day) {
  const [y, m] = mKey.split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-${String(clamp(day, 1, 28)).padStart(2, '0')}`;
}

const tickets = [];
let tno = 1;
assets.forEach(a => {
  // number of tickets roughly proportional to total downtime hours, min 1
  const totalDown = a.months.reduce((s, m) => s + m.downtimeHours, 0);
  const nTickets = clamp(Math.round(totalDown / 40), 1, 3);
  for (let k = 0; k < nTickets; k++) {
    const mIdx = int(0, 11);
    const mKey = a.months[mIdx].month;
    const reason = pickReason();
    const hoursDown = round1(clamp(a.months[mIdx].downtimeHours / nTickets * (0.6 + rand() * 0.8), 0.5, 40));
    const opened = dateInMonth(mKey, int(2, 26));
    const closedOffset = int(0, reason === 'Awaiting part' ? 12 : 4);
    const [y, m, d] = opened.split('-').map(Number);
    const closedDate = new Date(y, m - 1, d + closedOffset);
    const isLastTwoMonths = mIdx >= 10;
    const status = isLastTwoMonths && rand() < 0.3 ? 'Open' : 'Closed';
    tickets.push({
      id: `TCK-${String(tno++).padStart(3, '0')}`,
      assetId: a.id,
      assetName: a.name,
      openedDate: opened,
      closedDate: status === 'Closed' ? closedDate.toISOString().slice(0, 10) : null,
      reason,
      description: pick(NOTES_BY_REASON[reason]),
      hoursDown,
      status,
      engineer: pick(ENGINEERS),
      oemRef: `${a.oem.split(' ')[0].toUpperCase()}-${int(10000, 99999)}`,
    });
  }
});
tickets.sort((a, b) => a.openedDate.localeCompare(b.openedDate));

const out = {
  generatedAt: GENERATED_AT,
  hospital: HOSPITAL,
  months: MONTHS,
  monthLabels: MONTH_LABELS,
  assets,
  tickets,
};

const file = fileURLToPath(import.meta.url);
const dataPath = join(dirname(file), '..', '..', 'data', 'equipment-utilisation.json');
mkdirSync(dirname(dataPath), { recursive: true });
writeFileSync(dataPath, JSON.stringify(out, null, 1));
console.log(`Wrote ${assets.length} assets, ${tickets.length} tickets, ${MONTHS.length} months to ${dataPath}`);
