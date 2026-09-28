// Generates data/capex-review.json — Finance & Accounts: FY 2026-27 capex budget review desk.
// Node, no dependencies. Seeded PRNG (mulberry32) for reproducible variation.
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260928);
const pick = arr => arr[Math.floor(rng() * arr.length)];
const int = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const jitter = (v, pct) => Math.round(v * (1 + (rng() - 0.5) * 2 * pct));
const round100 = v => Math.round(v / 100) * 100;
const dateStr = d => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const monthLabel = (fyOffset) => `${MONTHS[fyOffset % 12]} ${fyOffset < 9 ? '2026' : '2027'}`;

const LOCATIONS = ['Main building, ground floor', 'Main building, 1st floor', 'Main building, 3rd floor',
  'West block', 'East block, 2nd floor', 'New OPD block', 'Basement, service floor', 'Annexe building'];

const STRONG_JUST = [
  'quantified against a documented operational or safety metric, with a named regulatory or clinical trigger',
];

// ---- 15 capex "families", each expanded into 3 instances (variants) below ----
const FAMILIES = [
  {
    dept: 'Critical Care', assetCategory: 'Civil + MEP', subCategory: 'ICU renovation',
    descBase: 'ICU complex renovation', capexType: 'renovation',
    baseCost: 22500000, qtyRange: [1, 1], unitLabel: 'lot',
    specs: 'Renovation of a {qty}-bed ICU/isolation bay complex: modular OT-grade flooring, HEPA-filtered isolation rooms, upgraded bed-head panels, centralised gas manifold and nurse-station redesign per NABH ICU space norms.',
    purpose: 'Bring the ICU complex up to current NABH bed-spacing and infection-control norms and add isolation capacity ahead of the next accreditation survey.',
    strongJust: 'NABH pre-survey gap analysis (Aug 2026) flagged ICU bed-spacing and isolation-bay shortfall as a major non-conformance; current occupancy has averaged 96% over the last two quarters with a documented turnaway log of {n} referrals redirected to other facilities in the last 90 days.',
    weakJust: 'Existing ICU is old and needs upgrade to look better and be more comfortable for patients and staff.',
    impactStrong: 'Continued non-conformance risks a qualified NABH re-accreditation outcome; turnaways to competitor facilities continue at the current rate, an estimated ₹{rev} lakh a year in foregone critical-care revenue.',
    impactWeak: 'Patients and visitors will continue to comment that the ICU looks dated.',
    quotesTypical: 1, budgetary: false, hasSavings: true, savingsBase: 4200000, maintPct: 0.02,
  },
  {
    dept: 'Cardiology', assetCategory: 'Medical equipment', subCategory: 'Cath lab',
    descBase: 'Cath lab flat-panel detector upgrade', capexType: 'replacement',
    baseCost: 18500000, qtyRange: [1, 1], unitLabel: 'unit',
    specs: 'Flat-panel detector replacement for the existing cath lab, {qty} unit, compatible with current C-arm gantry; includes new detector, image-processing software licence and 2-year comprehensive warranty.',
    purpose: 'Restore image quality and system uptime for the structural heart and electrophysiology programme as the current detector nears end of supported life.',
    strongJust: 'Current flat-panel detector is 9 years old; OEM has confirmed AMC and spare-part support end within 6 months, and image-quality logs from the cath lab show a {n}% rise in repeat-exposure rate over the last 2 quarters, directly affecting PTCA and EP case throughput.',
    weakJust: 'Current detector is old and image quality could be better.',
    impactStrong: 'Cath lab downtime risk within 6 months once OEM support lapses; cardiology urgent-PTCA referrals would need to be redirected to other Kochi hospitals, an estimated ₹{rev} lakh a year in foregone procedure revenue.',
    impactWeak: 'Doctors may find the images a bit less sharp than they would like.',
    quotesTypical: 3, budgetary: false, hasSavings: true, savingsBase: 5800000, maintPct: 0.06,
  },
  {
    dept: 'Radiology', assetCategory: 'Medical equipment accessory', subCategory: 'MRI coil',
    descBase: 'MRI coil (16-channel head/neck)', capexType: 'replacement',
    baseCost: 4200000, qtyRange: [1, 3], unitLabel: 'coil',
    specs: '{qty}x 16-channel head/neck receive coil(s) for the existing 1.5T MRI, OEM-proprietary interface, includes calibration and clinical-protocol handover.',
    purpose: 'Replace an ageing or damaged head/neck coil to maintain image quality for neuro and ENT MRI protocols.',
    strongJust: 'The existing coil has recorded {n} signal-dropout incidents in the last quarter per the radiology QA log, each requiring a repeat scan; neuro-MRI volume has grown 18% year-on-year and a second coil would remove the current single-point-of-failure risk for that protocol set.',
    weakJust: 'Need a better coil, current one is not great.',
    impactStrong: 'Repeat scans continue at the current rate, adding an estimated {n} extra scan-slots a month of rework and patient wait time, and neuro-MRI referrals risk moving to a competitor facility if a scan has to be rescheduled.',
    impactWeak: 'Some scans will be a bit lower quality than ideal.',
    quotesTypical: 1, budgetary: false, hasSavings: false, maintPct: 0.03,
  },
  {
    dept: 'Nephrology', assetCategory: 'Medical equipment', subCategory: 'Dialysis machines',
    descBase: 'Dialysis machines', capexType: 'new',
    baseCost: 9000000, qtyRange: [4, 8], unitLabel: 'machine',
    specs: '{qty}x haemodialysis machines with volumetric UF control, bicarbonate delivery and online HDF capability, to add sessions capacity in the existing dialysis unit.',
    purpose: 'Add dialysis session capacity to meet growing chronic kidney disease case load and reduce the current waitlist for evening slots.',
    strongJust: 'Current machine utilisation is running at {n}% of rated session-capacity across three shifts, with a documented waitlist of {n2} patients for evening slots over the last quarter; adding {qty} machines brings utilisation back to a sustainable 75-80% band.',
    weakJust: 'Dialysis unit is expanding and needs more machines.',
    impactStrong: 'Waitlisted patients continue to be turned away or rescheduled to other centres, and the unit cannot safely add a fourth shift without breaching machine-utilisation norms.',
    impactWeak: 'Cannot expand the unit as planned.',
    quotesTypical: 1, budgetary: false, hasSavings: true, savingsBase: 3600000, maintPct: 0.08,
  },
  {
    dept: 'Surgery', assetCategory: 'Medical equipment', subCategory: 'OT lights',
    descBase: 'OT LED shadowless lights (replacement)', capexType: 'replacement',
    baseCost: 3600000, qtyRange: [2, 4], unitLabel: 'OT',
    specs: '{qty}x LED shadowless surgical light heads (dual-dome, integrated camera-ready mount) replacing existing halogen/older-LED units across the named operating theatres.',
    purpose: 'Replace flickering, end-of-life OT lighting to remove a patient-safety risk during long-duration procedures.',
    strongJust: 'OT nursing incident log records {n} flickering/dimming reports across the named theatres in the last 2 months; the OEM confirms replacement parts for the current fixture are discontinued, so any further fault means the theatre cannot be used until the light is replaced.',
    weakJust: 'Lights are flickering a bit sometimes.',
    impactStrong: 'A further failure would force cancellation or mid-procedure relocation of a live case; parts being discontinued means a fault cannot be repaired, only replaced under time pressure.',
    impactWeak: 'Surgeons may find the lighting a little inconsistent.',
    quotesTypical: 2, budgetary: false, hasSavings: false, maintPct: 0.04,
  },
  {
    dept: 'IT', assetCategory: 'IT infrastructure', subCategory: 'HIS servers',
    descBase: 'HIS application + database servers', capexType: 'replacement',
    baseCost: 6800000, qtyRange: [2, 3], unitLabel: 'server',
    specs: '{qty}x rack servers (dual-socket, redundant PSU) for the HIS application and database tier, plus DR-site replication licence and migration services.',
    purpose: 'Replace out-of-warranty HIS servers and restore working disaster-recovery replication before a hardware failure causes hospital-wide downtime.',
    strongJust: 'Current servers have been out of OEM warranty for {n} months; HIS response time has degraded a measured 40% during peak OPD hours per helpdesk logs, and DR replication to the secondary site is currently non-functional, confirmed by the IT team\'s last failover drill.',
    weakJust: 'Servers are getting old and could use an upgrade at some point.',
    impactStrong: 'Risk of HIS downtime affecting billing, pharmacy and lab across all departments simultaneously; with DR non-functional, a hardware failure has no fallback and could halt patient-facing systems for hours.',
    impactWeak: 'IT may need to restart the servers more often than usual.',
    quotesTypical: 2, budgetary: false, hasSavings: false, maintPct: 0.10,
  },
  {
    dept: 'Emergency Services', assetCategory: 'Vehicle', subCategory: 'Ambulance',
    descBase: 'Advanced Life Support ambulance', capexType: 'replacement',
    baseCost: 3800000, qtyRange: [1, 2], unitLabel: 'vehicle',
    specs: '{qty}x ALS-configured ambulance (chassis + body fabrication), cardiac monitor/defibrillator mount, oxygen manifold and stretcher-lift system, compliant with current MoHFW ALS ambulance norms.',
    purpose: 'Replace an ageing ambulance that no longer meets current ALS-transport norms and is increasingly unreliable.',
    strongJust: 'The existing unit(s) average {n} years old with {n2} breakdowns logged by the transport desk in the last quarter alone, and the current fit-out does not meet the revised MoHFW ALS ambulance specification issued this year.',
    weakJust: 'Ambulance is old and sometimes has issues.',
    impactStrong: 'Risk of transfer delays for critical patients during a breakdown, and continued non-compliance with the MoHFW ALS norm is a likely NABH conformance finding on emergency transport readiness.',
    impactWeak: 'Occasional delays possible if the vehicle needs servicing.',
    quotesTypical: 2, budgetary: false, hasSavings: false, maintPct: 0.07,
  },
  {
    dept: 'CSSD', assetCategory: 'Medical equipment', subCategory: 'Washer-disinfector',
    descBase: 'CSSD washer-disinfector (replacement)', capexType: 'replacement',
    baseCost: 5400000, qtyRange: [1, 2], unitLabel: 'unit',
    specs: '{qty}x automated washer-disinfector for the central sterile supply department, validated cycle logging and integration with the existing tracking system.',
    purpose: 'Replace a failing washer-disinfector that is central to instrument-reprocessing turnaround across OT and wards.',
    strongJust: 'The existing unit has logged {n} unplanned stoppages in the last quarter per the CSSD maintenance register, each forcing manual reprocessing that adds 25-30 minutes per cycle and puts same-day OT instrument turnaround at risk.',
    weakJust: 'The washer is old and breaks down now and then.',
    impactStrong: 'Repeated stoppages risk delayed OT case starts hospital-wide when instrument turnaround cannot keep pace, and manual reprocessing is a documented infection-control deviation from the validated automated cycle.',
    impactWeak: 'CSSD staff may need to do a bit more manual work occasionally.',
    quotesTypical: 2, budgetary: false, hasSavings: false, maintPct: 0.06,
  },
  {
    dept: 'Facilities', assetCategory: 'Civil + equipment', subCategory: 'Cafeteria',
    descBase: 'Staff cafeteria renovation + kitchen equipment', capexType: 'renovation',
    baseCost: 5500000, qtyRange: [1, 1], unitLabel: 'lot',
    specs: 'Renovation of the staff cafeteria seating area and replacement of ageing kitchen equipment (griddles, exhaust hoods, cold storage) for the in-house catering team.',
    purpose: 'Improve staff dining space and replace kitchen equipment nearing end of service life.',
    strongJust: 'The last food-safety audit noted the exhaust hood and two cold-storage units as due for replacement, and staff-survey feedback (n={n} responses) ranked cafeteria condition as a recurring concern.',
    weakJust: 'Cafeteria looks outdated and staff will be unhappy if nothing is done.',
    impactStrong: 'Continued use of flagged kitchen equipment risks a repeat food-safety audit finding; staff satisfaction on facilities continues to trend down in the engagement survey.',
    impactWeak: 'Staff will keep complaining that the cafeteria looks tired.',
    quotesTypical: 1, budgetary: true, hasSavings: false, maintPct: 0.03,
  },
  {
    dept: 'Facilities / Safety', assetCategory: 'Safety/MEP', subCategory: 'Fire safety',
    descBase: 'Fire safety system upgrade (sprinklers, hydrants, panel)', capexType: 'regulatory',
    baseCost: 11000000, qtyRange: [1, 1], unitLabel: 'lot',
    specs: 'Upgrade of sprinkler coverage, hydrant pressure and the central fire panel across the named block, per the external fire-audit findings.',
    purpose: 'Close fire-audit non-conformances and secure fire NOC renewal ahead of the statutory deadline.',
    strongJust: 'The external fire audit (Q4 FY25-26) flagged {n} non-conformances including non-functional hydrant pressure in the named block; this work is mandatory for NABH re-accreditation and the fire NOC renewal due within 5 months.',
    weakJust: 'Fire safety system needs some updates at some point.',
    impactStrong: 'Risk of fire NOC non-renewal and potential regulatory closure of the affected block; also a certain NABH non-conformance on fire-safety readiness at the next survey.',
    impactWeak: 'Inspectors might mention it at the next visit.',
    quotesTypical: 3, budgetary: false, hasSavings: false, maintPct: 0.02,
  },
  {
    dept: 'IT Security', assetCategory: 'Cybersecurity', subCategory: 'Network & endpoint security',
    descBase: 'IT security upgrade (firewall, endpoint protection, SOC monitoring)', capexType: 'regulatory',
    baseCost: 4800000, qtyRange: [1, 1], unitLabel: 'lot',
    specs: 'Next-generation firewall pair, endpoint detection & response licences across {n} clinical and admin workstations, and a managed SOC monitoring subscription for the first year.',
    purpose: 'Close gaps identified in the annual IT security audit and meet the hospital\'s data-protection compliance obligations for patient health information.',
    strongJust: 'The annual IT security audit (Aug 2026) rated the current perimeter firewall as end-of-support with {n} unpatched CVEs outstanding, and flagged the absence of endpoint detection as a material gap against the hospital\'s data-protection policy for patient health information.',
    weakJust: 'IT security could probably be better in general.',
    impactStrong: 'Continued exposure to a known-vulnerable perimeter device raises the risk of a patient-data breach and associated regulatory and reputational fallout, with no endpoint-level detection to catch a compromise in progress.',
    impactWeak: 'Some small risk of something going wrong eventually.',
    quotesTypical: 2, budgetary: false, hasSavings: false, maintPct: 0.15,
  },
  {
    dept: 'Housekeeping', assetCategory: 'Equipment', subCategory: 'Laundry',
    descBase: 'Industrial laundry washer-extractor (replacement)', capexType: 'replacement',
    baseCost: 3200000, qtyRange: [1, 2], unitLabel: 'unit',
    specs: '{qty}x industrial washer-extractor for the central laundry, replacing a unit past its rated duty-cycle life, sized to current linen-processing volume.',
    purpose: 'Replace a laundry washer nearing end of duty-cycle life to avoid a capacity shortfall in linen turnaround.',
    strongJust: 'The current unit has exceeded its rated duty-cycle life by {n} months and logged {n2} breakdown call-outs in the last quarter, each forcing linen to be sent to an external laundry at a documented per-kg premium.',
    weakJust: 'Laundry machine is old and needs replacing eventually.',
    impactStrong: 'Continued breakdowns push more linen to external outsourcing at a premium rate, and a full failure would create a hospital-wide linen shortfall within days.',
    impactWeak: 'Housekeeping may need to plan around occasional downtime.',
    quotesTypical: 1, budgetary: false, hasSavings: true, savingsBase: 900000, maintPct: 0.05,
  },
  {
    dept: 'Facilities', assetCategory: 'Environment, Health & Safety', subCategory: 'Biomedical waste',
    descBase: 'Biomedical waste treatment plant upgrade', capexType: 'regulatory',
    baseCost: 6200000, qtyRange: [1, 1], unitLabel: 'lot',
    specs: 'Upgrade of the on-site biomedical waste autoclave and effluent-treatment capacity to meet the revised state pollution control board norms.',
    purpose: 'Meet the state pollution control board\'s revised biomedical-waste handling capacity norms ahead of the licence renewal.',
    strongJust: 'The state pollution control board\'s revised norms (notified this year) require higher autoclave throughput than the current plant can sustain at present bed occupancy; the licence renewal inspection is due within {n} months.',
    weakJust: 'Waste plant is old and should probably be upgraded.',
    impactStrong: 'Risk of licence renewal being withheld pending capacity upgrade, which would force the hospital onto a costlier external waste-disposal contract for the shortfall volume.',
    impactWeak: 'Might get a comment from the pollution board at some point.',
    quotesTypical: 2, budgetary: false, hasSavings: false, maintPct: 0.06,
  },
  {
    dept: 'Facilities', assetCategory: 'Utilities', subCategory: 'Power backup',
    descBase: 'Rooftop solar + DG set capacity addition', capexType: 'new',
    baseCost: 7200000, qtyRange: [1, 1], unitLabel: 'lot',
    specs: 'Rooftop solar installation ({n} kWp) plus one additional diesel generator set to cover peak-load growth and reduce grid/diesel dependence.',
    purpose: 'Add power-backup and renewable capacity ahead of projected peak-load growth from new equipment and reduce recurring diesel cost.',
    strongJust: 'Facility load studies show peak demand has grown {n}% over two years against a backup capacity that is now within {n2}% of its rated ceiling; diesel consumption records show a clear payback case for the solar addition within the stated years.',
    weakJust: 'More power backup would probably be good to have.',
    impactStrong: 'A peak-load event without added backup capacity risks a partial outage across non-critical areas, and the hospital continues paying avoidable diesel cost that the solar addition would offset.',
    impactWeak: 'Power might be a bit tight during peak hours sometimes.',
    quotesTypical: 2, budgetary: false, hasSavings: true, savingsBase: 1500000, maintPct: 0.02,
  },
  {
    dept: 'Pathology', assetCategory: 'Medical equipment', subCategory: 'Lab analyzers',
    descBase: 'Biochemistry / immunoassay analyzer (replacement)', capexType: 'replacement',
    baseCost: 8200000, qtyRange: [1, 1], unitLabel: 'unit',
    specs: 'Fully automated biochemistry/immunoassay analyzer with reagent-management interface, replacing a unit approaching end of OEM support.',
    purpose: 'Replace a lab analyzer nearing end of OEM support to maintain test turnaround time and result reliability.',
    strongJust: 'OEM has confirmed end-of-support within {n} months for the current analyzer; QC logs show a rising rate of repeat-run flags over the last quarter, adding to turnaround time on routine and stat panels alike.',
    weakJust: 'Analyzer is getting old and due for replacement sometime.',
    impactStrong: 'Turnaround time on routine and stat lab panels continues to degrade, and once OEM support lapses there is no fallback if the analyzer fails outright.',
    impactWeak: 'Lab results might take a little longer sometimes.',
    quotesTypical: 2, budgetary: false, hasSavings: false, maintPct: 0.09,
  },
];

const STATUS_CYCLE = ['Submitted', 'Submitted', 'Reviewed', 'Submitted', 'Recommended', 'Submitted', 'Approved', 'Submitted', 'Reviewed', 'Deferred', 'Submitted', 'Recommended'];
let statusIdx = 0;
function nextSeedStatus() { const s = STATUS_CYCLE[statusIdx % STATUS_CYCLE.length]; statusIdx++; return s; }

const requests = [];
let seq = 1;
const fyStart = new Date('2026-04-01');

FAMILIES.forEach((fam, fi) => {
  const instances = 3;
  for (let vi = 0; vi < instances; vi++) {
    const qty = int(fam.qtyRange[0], fam.qtyRange[1]);
    const costMult = 0.8 + rng() * 0.5;
    const equipment = round100(jitter(fam.baseCost * costMult * (qty / Math.max(1, fam.qtyRange[1] === fam.qtyRange[0] ? 1 : (qty / fam.qtyRange[1]))), 0.08));
    const installation = round100(equipment * (0.03 + rng() * 0.09));
    const other = round100(equipment * (0.01 + rng() * 0.03));
    const total = equipment + installation + other;
    const n1 = int(2, 14), n2 = int(6, 40);
    const quality = pick(['strong', 'strong', 'moderate', 'weak']);
    const justification = quality === 'weak' ? fam.weakJust
      : quality === 'strong' ? fam.strongJust.replace('{n}', n1).replace('{n2}', n2).replace('{rev}', int(20, 90))
        : (fam.strongJust.replace('{n}', n1).replace('{n2}', n2).replace('{rev}', int(20, 90)).split('. ')[0] + '.');
    const impact = quality === 'weak' ? fam.impactWeak : fam.impactStrong.replace('{n}', n1).replace('{n2}', n2).replace('{rev}', int(20, 90));
    const quotesCount = fam.budgetary ? 0 : Math.max(0, Math.min(3, fam.quotesTypical + (vi === 1 ? int(-1, 1) : 0)));
    const startOffset = int(0, 8);
    const durDays = int(45, 150);
    const start = addDays(fyStart, startOffset * 30 + int(0, 20));
    const end = addDays(start, durDays);
    const putToUseOffset = Math.min(11, startOffset + Math.round(durDays / 30));
    const hasSavings = fam.hasSavings && vi !== 2 && quality !== 'weak';
    const maintenancePerYear = round100(total * fam.maintPct * (0.85 + rng() * 0.3));
    const revenueSavingsPerYear = hasSavings ? round100(total * (0.15 + rng() * 0.25)) : null;
    const specs = fam.specs.replace(/\{qty\}/g, qty).replace(/\{n\}/g, n1);
    const location = pick(LOCATIONS);
    const reqNo = `CAPEX-2627-${String(seq).padStart(3, '0')}`;
    requests.push({
      id: reqNo,
      dept: fam.dept,
      assetCategory: fam.assetCategory,
      subCategory: fam.subCategory,
      description: instances > 1 ? `${fam.descBase}${vi > 0 ? ` (Batch ${vi + 1})` : ''}` : fam.descBase,
      qty, unitLabel: fam.unitLabel,
      costs: { equipment, installation, other },
      total,
      capexType: fam.capexType,
      location,
      quotesCount,
      budgetaryEstimate: !!fam.budgetary,
      timelineStart: dateStr(start),
      timelineEnd: dateStr(end),
      monthPutToUse: monthLabel(putToUseOffset),
      purpose: fam.purpose,
      impactIfNot: impact,
      specs,
      maintenancePerYear,
      revenueSavingsPerYear,
      justification,
      justificationQuality: quality,
      status: nextSeedStatus(),
    });
    seq++;
  }
});

// Budget envelope default and months trend for dashboard sparkline-style chart (submissions per month, FY26-27)
const months = MONTHS;
const submissionsByMonth = months.map(() => 0);
requests.forEach(r => { const idx = Math.round((new Date(r.timelineStart) - fyStart) / (30 * 86400000)); submissionsByMonth[Math.max(0, Math.min(11, idx))]++; });

const out = {
  fyLabel: 'FY 2026-27',
  budgetEnvelopeDefault: 180000000,
  months,
  submissionsByMonth,
  requests,
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', '..', 'data', 'capex-review.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${requests.length} capex requests to ${outPath} (${(JSON.stringify(out).length / 1024).toFixed(1)} KB)`);
