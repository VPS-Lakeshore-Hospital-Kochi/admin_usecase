// Generates data/finance-mis.json — synthetic monthly MIS for VPS Lakeshore Finance & Accounts.
// Node, no dependencies. Seeded (mulberry32) so output is reproducible.
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261001);
const noise = (spread) => (rnd() * 2 - 1) * spread;
const round1 = n => Math.round(n * 10) / 10;

const MONTHS = ['Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026',
  'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026'];

// dept: base monthly AOP revenue (₹ lakh), annual growth, story
const DEPTS = [
  { name: 'Cardiology', base: 420, growth: 0.05, ipBase: 150, opBase: 1900 },
  { name: 'Orthopaedics', base: 265, growth: 0.04, ipBase: 90, opBase: 1350 },
  { name: 'Neurosciences', base: 195, growth: 0.05, ipBase: 58, opBase: 900 },
  { name: 'Oncology', base: 235, growth: 0.14, ipBase: 72, opBase: 1250, story: 'ahead' },
  { name: 'Gastro & Liver Transplant', base: 180, growth: 0.06, ipBase: 20, opBase: 600 },
  { name: 'Nephrology & Urology', base: 155, growth: 0.03, ipBase: 42, opBase: 1750 },
  { name: 'Robotic Surgery', base: 100, growth: 0.10, ipBase: 26, opBase: 190, story: 'downtime' },
  { name: 'Emergency Medicine', base: 145, growth: 0.03, ipBase: 60, opBase: 3000 },
  { name: 'Pharmacy', base: 315, growth: 0.04, ipBase: 0, opBase: 0 },
  { name: 'Lab & Radiology', base: 185, growth: 0.04, ipBase: 0, opBase: 0 },
];

const rows = [];
for (const d of DEPTS) {
  for (let m = 0; m < 12; m++) {
    const aop = round1(d.base * (1 + d.growth * (m / 11)) * (1 + noise(0.02)));
    let variancePct;
    if (d.story === 'ahead') {
      variancePct = 0.08 + m * 0.006 + noise(0.02); // Oncology: steadily ahead of plan, widening
    } else if (d.story === 'downtime') {
      // robot down for servicing Dec–Feb (months 2,3,4), ramps back through Mar–Apr
      if (m === 2) variancePct = -0.18 + noise(0.02);
      else if (m === 3) variancePct = -0.34 + noise(0.02);
      else if (m === 4) variancePct = -0.29 + noise(0.02);
      else if (m === 5) variancePct = -0.08 + noise(0.03);
      else variancePct = 0.06 + noise(0.05);
    } else {
      variancePct = noise(0.07);
    }
    const actual = round1(aop * (1 + variancePct));
    const volFactor = 1 + variancePct * 0.7 + noise(0.03);
    const ip = d.ipBase ? Math.max(0, Math.round(d.ipBase * (1 + m * 0.01) * volFactor)) : 0;
    const op = d.opBase ? Math.max(0, Math.round(d.opBase * (1 + m * 0.008) * volFactor)) : 0;
    const priorYearActual = round1(actual / (1 + d.growth * 0.8 + noise(0.03)));
    rows.push({ month: MONTHS[m], dept: d.name, aop, actual, ip, op, priorYearActual });
  }
}

// Hospital KPIs per month — international share climbs from ~12% toward ~20% across the year
const kpis = MONTHS.map((month, m) => {
  const intl = round1(12 + (20 - 12) * (m / 11) + noise(1.2));
  const govt = round1(9 - m * 0.15 + noise(1.4));
  const cash = round1(31 + noise(1.5));
  const tpa = round1(100 - intl - govt - cash);
  const occAop = 74;
  const occ = round1(occAop + noise(6) + (m >= 2 && m <= 4 ? -5 : 2));
  const cmiAop = 1.30;
  const cmi = round1(cmiAop + noise(0.06) + (m >= 2 && m <= 4 ? -0.06 : 0.02));
  const arpobAop = 48000 + m * 250;
  const arpob = Math.round(arpobAop * (1 + (occ - occAop) / 400 + noise(0.02)));
  const alosAop = 4.4;
  const alos = round1(alosAop + noise(0.35) + (m >= 2 && m <= 4 ? 0.3 : -0.05));
  return { month, arpob, arpobAop, alos, alosAop, occ, occAop, cmi, cmiAop, payor: { cash, tpa, intl, govt } };
});

const data = {
  months: MONTHS,
  depts: DEPTS.map(d => d.name),
  rows,
  kpis,
  notes: {
    'Robotic Surgery': 'Console 2 went down for scheduled servicing and a parts delay from the OEM (Peer Surgical Systems) from Dec 2025, cutting case volume through Feb 2026. Throughput has been recovering since March.',
    'Oncology': 'Referral volumes from the new day-care chemotherapy wing and tie-ups with two peer oncology clinics (Peer A, Peer B) in the district have kept Oncology ahead of plan all year, with the gap widening.',
  },
};

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
writeFileSync(join(outDir, 'finance-mis.json'), JSON.stringify(data));
console.log('Wrote data/finance-mis.json —', rows.length, 'rows,', kpis.length, 'KPI months');
