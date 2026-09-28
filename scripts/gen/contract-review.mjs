#!/usr/bin/env node
// Generates data/contract-review.json — synthetic contract intake/review pipeline,
// clause text, hospital standard-positions playbook, and signed-contract obligations
// for VPS Lakeshore Hospital, Kochi (Legal & Secretarial). Seeded, reproducible.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../data/contract-review.json');
const TODAY = '2026-09-28';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260928);
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ---------- hospital standard positions (playbook) ---------- */
const PLAYBOOK = [
  { topic: 'Revenue share', position: 'Visiting-consultant revenue share stays within the standard band of 40-55% of net collections, reflecting specialty, consumable cost and OT overhead recovery.' },
  { topic: 'Facilitator commission', position: 'International-facilitator commission stays within the standard band of 12-18% of gross billing, payable only once the Hospital has actually collected the patient\'s bill.' },
  { topic: 'Liability cap', position: 'Cap proportionate to annual contract value, typically 1x-2x annual spend — not a flat token amount irrespective of contract size.' },
  { topic: 'Indemnity', position: 'Mutual and capped. Counterparty indemnifies the hospital for its own acts; hospital indemnifies counterparty only for hospital-caused negligence (e.g. equipment failure, staff error), not a one-sided obligation.' },
  { topic: 'Termination for convenience', position: 'Hospital retains a no-cause exit with 90-180 days\' written notice and pro-rata settlement, in addition to for-cause termination with immediate effect on breach, licence loss or misconduct.' },
  { topic: 'Jurisdiction & arbitration', position: 'Courts at Ernakulam, Kerala for litigation; where arbitration is used, seat and venue at Kochi under the Arbitration and Conciliation Act, 1996.' },
  { topic: 'DPDP data processing', position: 'Any counterparty accessing patient or personal data must have a DPDP Act 2023-compliant clause: purpose limitation, breach notification within 72 hours, and data return/deletion within 30 days of termination.' },
  { topic: 'Payment terms', position: 'Standard 30 days from invoice or collection, as applicable. 45 days may be accepted for large capital purchases; anything beyond that needs Finance sign-off.' },
  { topic: 'Auto-renewal', position: 'No silent auto-renewal beyond one term without written confirmation; hospital must get at least 60 days\' notice before a renewal window closes, with a clear opt-out mechanism.' },
  { topic: 'Non-compete', position: 'Maximum 1 year, narrowly scoped to directly competing NABH-accredited facilities within a reasonable radius — not a blanket district- or state-wide bar (restraint-of-trade risk under Contract Act s.27).' },
  { topic: 'Insurance', position: 'Counterparty must carry adequate professional indemnity / public liability / cyber insurance for the risk involved, with the hospital named as additional insured where the counterparty works on hospital premises.' },
  { topic: 'Audit rights', position: 'Hospital retains the right to audit records, compliance and (where data is processed) security controls on reasonable notice, at least once a year, without needing the counterparty\'s consent each time.' },
];

/* ---------- shared reference lists ---------- */
const CONSULTANTS = [
  'Dr. Anil Varma', 'Dr. Meera Pillai', 'Dr. Sunil Koshy', 'Dr. Priya Nair',
  'Dr. Thomas Abraham', 'Dr. Lakshmi Menon', 'Dr. Rajesh Kurian', 'Dr. Divya Warrier',
];
const SPECIALTIES = ['Robotic & Minimally Invasive Surgery', 'Interventional Cardiology', 'Joint Replacement', 'Fertility Medicine', 'Bariatric Surgery', 'Neurosurgery'];
const LEASE_VENDORS = ['Coral Diagnostics Pvt Ltd', 'Meridian Medisystems', 'Bluewave Biotech Rentals', 'Sunrise Labtech Solutions'];
const EQUIP = ['fully-automated biochemistry analyser', 'chemiluminescence immunoassay analyser', 'haematology analyser with sample-track', 'digital radiography (DR) system'];
const CMC_VENDORS = ['Zenith Biomed Services', 'Trident Engineering Care', 'Apex CSSD Solutions'];
const CMC_ASSETS = ['CT scanner (128-slice)', 'MRI system (1.5T)', 'CSSD autoclave & washer-disinfector line', 'cath lab imaging system'];
const OUTSOURCE_VENDORS = ['Silverline Facility Services', 'Guardian Shield Security', 'CleanCore Hospital Services'];
const SAAS_VENDORS = ['NimbusHealth Systems', 'Vertex Clinical Cloud', 'Datastream Health Technologies'];
const FACILITATOR_VENDORS = ['Gulf Care Connect FZE', 'Africure Medical Facilitators', 'Continental Health Bridge'];
const DEPTS = ['Cardiology', 'Orthopaedics & Joint Replacement', 'Laboratory & Pathology', 'Radiology & Imaging', 'Facilities & Engineering', 'Information Technology', 'Human Resources', 'Nursing Directorate', 'International Patient Services', 'Administration', 'Research & Academics', 'Housekeeping', 'Security', 'F&B Services'];
const NON_KERALA_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune'];

let seq = 2601;
function nextId() { return `CT-${seq++}`; }

function clause(no, heading, text, severity, risk, playbook, redline) {
  return { no, heading, text, severity: severity || null, risk: risk || null, playbook: playbook || null, redline: redline || null };
}

/* ================= Visiting consultant agreement ================= */
function consultantContract(stage, receivedDaysAgo) {
  const doc = pick(CONSULTANTS), spec = pick(SPECIALTIES);
  const revShare = pick([38, 45, 50, 55, 62, 65, 70]);
  const payDays = pick([30, 30, 45, 60, 60]);
  const termYears = pick([2, 3, 3, 5]);
  const nonCompeteYears = pick([1, 1, 2, 3]);
  const nonCompeteBlanket = nonCompeteYears >= 2 || rnd() < 0.4;
  const noticeDays = pick([60, 90, 90, 120]);
  const hasCauseTermination = rnd() < 0.5;
  const jurisdictionOk = rnd() < 0.55;
  const hasDPDP = rnd() < 0.3;
  const hasInsurance = rnd() < 0.45;
  const cityOther = pick(NON_KERALA_CITIES);
  const received = addDays(TODAY, -receivedDaysAgo);

  const clauses = [
    clause(1, 'TERM', `This agreement is for a period of ${termYears} years from the date of signing, renewable by mutual written consent.`),
    clause(2, 'REVENUE SHARE', `Hospital shall pay the Consultant ${revShare}% of net collections from ${spec.toLowerCase()} procedures performed by the Consultant, payable within ${payDays} days of collection.`,
      revShare > 55 ? 'High' : revShare > 50 ? 'Medium' : null,
      revShare > 55 ? `Revenue share of ${revShare}% is well above the standard band of 40-55% for visiting consultants, eroding the hospital's margin on high-cost consumables and OT overheads.` : revShare > 50 ? `${revShare}% sits at the upper edge of the standard band; acceptable but leaves little room for cost recovery.` : null,
      'Revenue share', revShare > 50 ? `Revise to a tiered structure (e.g. 55% below a monthly volume threshold, 45% above it) or cap at 50% of net collections.` : null),
    payDays > 30 ? clause(2, 'PAYMENT (cont.)', `Payment beyond the ${payDays}-day cycle noted above applies to all revenue-share disbursements without exception.`, payDays > 45 ? 'Medium' : 'Low', `Standard payment terms are 30 days; ${payDays} days is a cash-flow drag on the Consultant relationship and an outlier versus other visiting-consultant agreements.`, 'Payment terms', `Amend to 30 days of collection, or 45 days at most with Finance sign-off.`) : null,
    clause(3, 'INDEMNITY', hasCauseTermination
      ? `The Consultant shall indemnify the Hospital against claims arising from the Consultant's professional acts. The Hospital shall indemnify the Consultant only for loss caused by the Hospital's own equipment failure or staff negligence, subject to a cap equal to one year's revenue share paid under this agreement.`
      : `The Consultant shall indemnify the Hospital against all claims arising from the Consultant's professional acts. The Hospital shall have no obligation to indemnify the Consultant under any circumstances.`,
      hasCauseTermination ? null : 'High',
      hasCauseTermination ? null : `One-sided indemnity: the Consultant bears all risk while the Hospital carries zero indemnity obligation even for its own equipment failure or staff negligence.`,
      'Indemnity',
      hasCauseTermination ? null : `Make mutual: Hospital indemnifies the Consultant for Hospital-caused equipment/staff negligence, capped at a reasonable multiple of annual revenue share.`),
    clause(4, 'NON-COMPETE', nonCompeteBlanket
      ? `The Consultant shall not practice ${spec.toLowerCase()} at any other hospital within Ernakulam district for a period of ${nonCompeteYears} years after termination of this agreement.`
      : `The Consultant shall not practice ${spec.toLowerCase()} at any other NABH-accredited hospital within a 5 km radius of this Hospital for a period of ${nonCompeteYears} year after termination of this agreement.`,
      nonCompeteBlanket ? 'High' : null,
      nonCompeteBlanket ? `A district-wide, multi-year non-compete is a blanket restraint of trade likely unenforceable under Contract Act s.27 (Percept D'Mark v. Zaheer Khan line of authority); litigation risk if challenged.` : null,
      'Non-compete',
      nonCompeteBlanket ? `Narrow to 1 year, limited to directly competing NABH-accredited hospitals within a defined radius, not a district-wide bar.` : null),
    clause(5, 'EQUIPMENT & OT ACCESS', `The Consultant shall have priority use of scheduled OT slots for ${spec.toLowerCase()} procedures, subject to the Hospital's OT allocation policy.`),
    clause(6, 'CREDENTIALING', `The Consultant shall maintain valid medical registration and Hospital credentialing/privileging for the duration of this agreement, and shall notify the Hospital immediately of any change in licence status.`),
    clause(7, 'TERMINATION', hasCauseTermination
      ? `Either party may terminate this agreement with ${noticeDays} days' written notice. The Hospital may additionally terminate with immediate effect on licence suspension, criminal conviction, or a finding of professional misconduct.`
      : `Either party may terminate this agreement with ${noticeDays} days' written notice.`,
      hasCauseTermination ? null : 'Medium',
      hasCauseTermination ? null : `Only no-cause termination exists; there is no immediate-effect exit for licence suspension or misconduct, forcing the Hospital to run out the full notice period even in a serious case.`,
      'Termination for convenience',
      hasCauseTermination ? null : `Add an immediate-termination clause for licence suspension, criminal conviction, or a finding of professional misconduct.`),
    clause(8, 'CONFIDENTIALITY', `The Consultant shall keep confidential all non-public information of the Hospital, including patient data accessed in the course of practice, and shall not disclose it to any third party.`,
      hasDPDP ? null : 'Medium',
      hasDPDP ? null : `Confidentiality is stated generally but there is no DPDP Act 2023-specific clause covering purpose limitation, breach notification, or post-termination data return/deletion for the patient data the Consultant accesses.`,
      'DPDP data processing',
      hasDPDP ? null : `Add a DPDP-compliant data processing clause: purpose limitation, 72-hour breach notification, and data return/deletion within 30 days of termination.`),
    clause(9, 'GOVERNING LAW & JURISDICTION', jurisdictionOk
      ? `This agreement is governed by the laws of India, with courts at Ernakulam, Kerala having exclusive jurisdiction.`
      : `This agreement is governed by the laws of India, with courts at ${cityOther} having exclusive jurisdiction.`,
      jurisdictionOk ? null : 'High',
      jurisdictionOk ? null : `Jurisdiction is set at ${cityOther} rather than Ernakulam, forcing the Hospital to litigate outside Kerala at material cost and inconvenience.`,
      'Jurisdiction & arbitration',
      jurisdictionOk ? null : `Amend to courts at Ernakulam, Kerala.`),
    clause(10, 'INSURANCE', hasInsurance
      ? `The Consultant shall maintain professional indemnity insurance of not less than ₹1 crore for the duration of this agreement and shall furnish proof on request.`
      : null, hasInsurance ? null : 'Medium', hasInsurance ? null : `No professional indemnity insurance requirement on the Consultant, leaving the Hospital exposed if a claim exceeds what the Consultant can personally satisfy.`, 'Insurance', hasInsurance ? null : `Add a requirement for professional indemnity insurance of at least ₹1 crore, with proof furnished annually.`),
  ].filter(Boolean);

  const missingClauses = [];
  if (!hasDPDP) missingClauses.push({ topic: 'DPDP data processing', note: 'No DPDP Act 2023-compliant clause for the patient data the Consultant accesses in the course of practice.' });
  if (!hasCauseTermination) missingClauses.push({ topic: 'Termination for convenience', note: 'No separate for-cause, immediate-effect termination alongside the no-cause notice clause.' });
  if (!hasInsurance) missingClauses.push({ topic: 'Insurance', note: 'No professional indemnity insurance obligation on the Consultant.' });

  return {
    id: nextId(), title: `Visiting consultant agreement — ${doc}, ${spec}`, type: 'Visiting consultant agreement',
    counterparty: doc, counterpartyType: 'Individual consultant', value: Math.round((revShare / 100) * int(60, 220) * 1e5),
    valueLabel: `Est. ${revShare}% of net collections (variable)`, term: `${termYears} years`,
    requestingDept: pick(['Cardiology', 'Orthopaedics & Joint Replacement', 'Research & Academics']),
    receivedDate: received, stage, clauses, missingClauses,
  };
}

/* ================= Equipment lease / reagent rental ================= */
function leaseContract(stage, receivedDaysAgo) {
  const vendor = pick(LEASE_VENDORS), equip = pick(EQUIP);
  const termYears = pick([3, 5, 5, 7]);
  const minTests = int(30, 55) * 1000;
  const shortfallPenal = rnd() < 0.55;
  const hasSLA = rnd() < 0.4;
  const escalationCapped = rnd() < 0.35;
  const liabilityCapFlat = rnd() < 0.5;
  const jurisdictionOk = rnd() < 0.5;
  const cityOther = pick(NON_KERALA_CITIES);
  const hasDPDP = rnd() < 0.35;
  const convenienceExit = rnd() < 0.3;
  const received = addDays(TODAY, -receivedDaysAgo);
  const annualValue = int(35, 70) * 1e5;

  const clauses = [
    clause(1, 'TERM', `Lease of one (1) ${equip} for ${termYears} years, with reagent rental (cost-per-test) pricing model.`),
    clause(2, 'MINIMUM COMMITMENT', shortfallPenal
      ? `Hospital commits to a minimum of ${minTests.toLocaleString('en-IN')} tests per year; any shortfall is billed at the full reagent rate regardless of actual utilisation.`
      : `Hospital commits to a minimum of ${minTests.toLocaleString('en-IN')} tests per year, with a 15% shortfall tolerance before penal billing applies, trued up annually.`,
      shortfallPenal ? 'High' : null,
      shortfallPenal ? `No tolerance band — a slow quarter (e.g. a competing lab tie-up) results in full-rate billing on tests never run.` : null,
      'Payment terms', shortfallPenal ? `Add a 15% shortfall tolerance before penal billing; true up annually, not per quarter.` : null),
    clause(3, 'MAINTENANCE & SLA', hasSLA
      ? `Vendor shall provide preventive maintenance quarterly, with a 4-hour response time and 24-hour resolution target for breakdowns, and a minimum 95% uptime guarantee with service credits below that threshold.`
      : `Vendor shall provide preventive maintenance quarterly. Breakdown response time is best-effort, with no SLA specified.`,
      hasSLA ? null : 'High',
      hasSLA ? null : `This analyser is critical-path for OPD/IPD reporting; an undefined response time risks reporting delays with no contractual recourse.`,
      'Audit rights', hasSLA ? null : `Add an SLA: 4-hour response, 24-hour resolution, >=95% uptime guarantee with service credits below threshold.`),
    clause(4, 'PRICE ESCALATION', escalationCapped
      ? `Reagent pricing may be revised annually, capped at 5% or WPI, whichever is lower.`
      : `Reagent pricing may be revised annually by the Vendor at its sole discretion.`,
      escalationCapped ? null : 'High',
      escalationCapped ? null : `Open-ended cost exposure over a ${termYears}-year term with no ceiling on annual increases.`,
      'Payment terms', escalationCapped ? null : `Cap escalation at 5% p.a. or CPI/WPI-linked, whichever is lower.`),
    clause(5, 'LIABILITY', liabilityCapFlat
      ? `Vendor's total liability under this agreement shall not exceed ₹1,00,000 in aggregate, irrespective of the cause of loss.`
      : `Vendor's total liability under this agreement shall not exceed 1.5 times the annual contract value, irrespective of the cause of loss.`,
      liabilityCapFlat ? 'High' : null,
      liabilityCapFlat ? `A flat ₹1 lakh cap is grossly disproportionate to a likely annual spend of ₹${(annualValue / 1e5).toFixed(0)} lakh at this volume — inadequate cover for a reporting-error or equipment-damage event.` : null,
      'Liability cap', liabilityCapFlat ? `Raise the cap to 1x-2x annual contract value.` : null),
    clause(6, 'EXIT', convenienceExit
      ? `Hospital may terminate for convenience after year 2 with 6 months' written notice and pro-rata equipment buy-back/settlement, in addition to termination for Vendor's uncured material breach.`
      : `Hospital may not terminate before completion of ${termYears} years except for Vendor's uncured material breach, with a 6-month cure period.`,
      convenienceExit ? null : 'Medium',
      convenienceExit ? null : `Hospital is locked in for the full term even if a better-value vendor emerges, with no convenience exit at all.`,
      'Termination for convenience', convenienceExit ? null : `Add a convenience termination after year 2, with 6 months' notice and pro-rata settlement.`),
    clause(7, 'TITLE & RETURN', `Title to the equipment remains with the Vendor throughout the lease term. On expiry or termination, the Hospital shall permit removal within 30 days, subject to settlement of outstanding dues.`),
    clause(8, 'DATA & LIS INTEGRATION', hasDPDP
      ? `Where the analyser integrates with the LIS/HIS, the Vendor shall process any patient data solely for calibration and reporting support, under a DPDP Act 2023-compliant data processing addendum, with data returned or deleted within 30 days of termination.`
      : null, hasDPDP ? null : 'Medium', hasDPDP ? null : `The analyser integrates with the LIS and patient records; the agreement is silent on data-handling, access-control, or breach-notification terms.`, 'DPDP data processing', hasDPDP ? null : `Add a DPDP-compliant data processing addendum covering purpose limitation, access control and data return/deletion.`),
    clause(9, 'GOVERNING LAW', jurisdictionOk
      ? `This agreement is governed by the laws of Kerala, with courts at Ernakulam having exclusive jurisdiction.`
      : `This agreement is governed by the laws of ${cityOther === 'Delhi' ? 'the National Capital Territory of Delhi' : `the state where the Vendor is headquartered (${cityOther})`}, with courts at ${cityOther} having exclusive jurisdiction.`,
      jurisdictionOk ? null : 'High', jurisdictionOk ? null : `Forces the Hospital to litigate outside Kerala for a Kochi-based dispute — high cost and inconvenience.`, 'Jurisdiction & arbitration', jurisdictionOk ? null : `Amend to Kerala law, courts at Ernakulam.`),
    clause(10, 'FORCE MAJEURE', `Neither party shall be liable for delay or failure caused by events beyond its reasonable control, provided the affected party gives prompt notice and uses reasonable efforts to mitigate.`),
  ].filter(Boolean);

  const missingClauses = [];
  if (!hasDPDP) missingClauses.push({ topic: 'DPDP data processing', note: 'No DPDP-compliant addendum despite LIS/patient-data integration.' });
  if (!hasSLA) missingClauses.push({ topic: 'Audit rights', note: 'No uptime/SLA reporting obligation to allow the Hospital to audit vendor performance against a defined standard.' });

  return {
    id: nextId(), title: `Equipment lease / reagent rental — ${vendor} (${equip})`, type: 'Equipment lease / reagent rental',
    counterparty: vendor, counterpartyType: 'Company', value: annualValue * termYears, valueLabel: `₹${(annualValue / 1e5).toFixed(0)} lakh/yr est. reagent spend`, term: `${termYears} years`,
    requestingDept: pick(['Laboratory & Pathology', 'Radiology & Imaging']),
    receivedDate: received, stage, clauses, missingClauses,
  };
}

/* ================= CMC / AMC service contracts ================= */
function cmcContract(stage, receivedDaysAgo) {
  const vendor = pick(CMC_VENDORS), asset = pick(CMC_ASSETS);
  const termYears = pick([1, 2, 3]);
  const hasUptime = rnd() < 0.45;
  const responseHrs = pick([4, 8, 24, 48]);
  const escalationCapped = rnd() < 0.4;
  const spareParts = rnd() < 0.5;
  const jurisdictionOk = rnd() < 0.6;
  const cityOther = pick(NON_KERALA_CITIES);
  const hasAudit = rnd() < 0.4;
  const received = addDays(TODAY, -receivedDaysAgo);
  const annualValue = int(8, 45) * 1e5;

  const clauses = [
    clause(1, 'SCOPE', `Comprehensive Maintenance Contract (CMC) covering the ${asset}, including all preventive maintenance, breakdown calls, and software updates for ${termYears} year(s).`),
    clause(2, 'RESPONSE TIME', responseHrs <= 8
      ? `Vendor shall respond to a breakdown call within ${responseHrs} hours and resolve within 24 hours, on a 24x7 basis given the criticality of this asset.`
      : `Vendor shall respond to a breakdown call within ${responseHrs} hours during business hours (Mon-Sat, 9am-6pm).`,
      responseHrs <= 8 ? null : 'High',
      responseHrs <= 8 ? null : `A ${responseHrs}-hour, business-hours-only response is inadequate for a critical diagnostic/imaging asset that runs emergency and inpatient cases outside those hours.`,
      'Audit rights', responseHrs <= 8 ? null : `Amend to a 4-8 hour response, 24x7, given the criticality of this asset.`),
    clause(3, 'UPTIME GUARANTEE', hasUptime
      ? `Vendor guarantees minimum 95% uptime measured monthly, with service credits of 1% of the annual CMC value per percentage point of shortfall.`
      : null, hasUptime ? null : 'Medium', hasUptime ? null : `No uptime guarantee or service credit mechanism — downtime has no contractual consequence for the Vendor.`, 'Audit rights', hasUptime ? null : `Add a minimum 95% uptime guarantee with service credits for shortfall.`),
    clause(4, 'SPARE PARTS', spareParts
      ? `All spare parts and consumable components (excluding items under a separate reagent contract) are included within the CMC value.`
      : `Spare parts above ₹25,000 per item are billed separately at the Vendor's then-current price list, at the Vendor's sole discretion on availability.`,
      spareParts ? null : 'Medium', spareParts ? null : `"Sole discretion on availability" pricing for high-value parts creates open-ended cost exposure and a possible hold-up if a critical part is delayed.`, 'Payment terms', spareParts ? null : `Fix a parts price list for the contract term, or cap the mark-up over cost.`),
    clause(5, 'ESCALATION', escalationCapped
      ? `CMC value may be revised at renewal, capped at 5% over the prior year's value.`
      : `CMC value may be revised at renewal at the Vendor's discretion based on then-prevailing market rates.`,
      escalationCapped ? null : 'Medium', escalationCapped ? null : `Open-ended renewal pricing with no cap makes multi-year budgeting difficult and favours the Vendor at each renewal.`, 'Payment terms', escalationCapped ? null : `Cap renewal escalation at 5% p.a.`),
    clause(6, 'LIABILITY', `Vendor's liability for direct loss arising from its negligence is capped at the annual CMC value; consequential losses are excluded by both parties.`),
    clause(7, 'TERMINATION', `Either party may terminate with 60 days' written notice, or with immediate effect for uncured material breach following a 30-day cure period.`),
    clause(8, 'AUDIT & REPORTING', hasAudit
      ? `Vendor shall submit a quarterly service report (calls attended, response/resolution times, uptime achieved) and permit the Hospital's Biomedical Engineering team to audit maintenance logs on reasonable notice.`
      : null, hasAudit ? null : 'Low', hasAudit ? null : `No obligation on the Vendor to report service metrics, making it hard for the Hospital to verify SLA compliance without a dispute.`, 'Audit rights', hasAudit ? null : `Add a quarterly service-report obligation and an audit right over maintenance logs.`),
    clause(9, 'GOVERNING LAW', jurisdictionOk
      ? `This agreement is governed by the laws of Kerala, with courts at Ernakulam having exclusive jurisdiction.`
      : `This agreement is governed by the laws of India, with disputes referred to arbitration seated at ${cityOther}.`,
      jurisdictionOk ? null : 'Medium', jurisdictionOk ? null : `Arbitration seat is set at ${cityOther} rather than Kochi, adding cost and inconvenience for a Kerala-based dispute.`, 'Jurisdiction & arbitration', jurisdictionOk ? null : `Amend the arbitration seat and venue to Kochi.`),
  ].filter(Boolean);

  const missingClauses = [];
  if (!hasUptime) missingClauses.push({ topic: 'Audit rights', note: 'No uptime guarantee or service-credit mechanism on a critical clinical asset.' });
  if (!hasAudit) missingClauses.push({ topic: 'Audit rights', note: 'No quarterly reporting or audit right over maintenance logs.' });

  return {
    id: nextId(), title: `CMC — ${asset} (${vendor})`, type: 'CMC/AMC service contract',
    counterparty: vendor, counterpartyType: 'Company', value: annualValue * termYears, valueLabel: `₹${(annualValue / 1e5).toFixed(1)} lakh/yr`, term: `${termYears} year(s)`,
    requestingDept: pick(['Radiology & Imaging', 'Facilities & Engineering', 'Cardiology']),
    receivedDate: received, stage, clauses, missingClauses,
  };
}

/* ================= Housekeeping / security outsourcing ================= */
function outsourcingContract(stage, receivedDaysAgo) {
  const vendor = pick(OUTSOURCE_VENDORS), svc = vendor.includes('Guardian') ? 'security' : 'housekeeping';
  const termYears = pick([1, 2, 3]);
  const headcount = int(35, 120);
  const wageComplianceClause = rnd() < 0.5;
  const insuranceOk = rnd() < 0.4;
  const indemnityMutual = rnd() < 0.35;
  const noticeDays = pick([30, 60, 90]);
  const dataAccess = svc === 'security';
  const hasDPDP = rnd() < 0.3;
  const auditOk = rnd() < 0.5;
  const received = addDays(TODAY, -receivedDaysAgo);
  const annualValue = headcount * int(2.2, 3.6) * 1.2e5;

  const clauses = [
    clause(1, 'SCOPE & MANPOWER', `Vendor shall deploy ${headcount} trained ${svc} personnel across the Hospital campus on a 3-shift basis, per the roster agreed with Facilities/Administration.`),
    clause(2, 'STATUTORY COMPLIANCE', wageComplianceClause
      ? `Vendor shall pay all deployed personnel not less than the applicable Kerala minimum wage, remit PF/ESI contributions on time, and furnish monthly compliance proof (challans, wage registers) to the Hospital.`
      : `Vendor shall comply with applicable labour laws. Wage and PF/ESI records are maintained by the Vendor and made available "as and when required."`,
      wageComplianceClause ? null : 'High',
      wageComplianceClause ? null : `No routine proof of statutory compliance — exposes the Hospital to principal-employer liability under the Contract Labour Act if the Vendor defaults on wages or PF/ESI.`,
      'Audit rights', wageComplianceClause ? null : `Require monthly wage-register and PF/ESI challan proof as a condition of invoice payment.`),
    clause(3, 'SUPERVISION', `Vendor shall provide one on-site supervisor per shift, responsible for quality checks, attendance, and escalation of incidents to the Hospital's Facilities/Security desk.`),
    clause(4, 'INDEMNITY', indemnityMutual
      ? `Vendor indemnifies the Hospital against claims arising from acts of its personnel; the Hospital indemnifies the Vendor only for loss caused by the Hospital's own instructions to Vendor staff, subject to a cap of one year's contract value.`
      : `Vendor indemnifies the Hospital against claims arising from acts of its personnel. This indemnity survives termination without any liability cap.`,
      indemnityMutual ? null : 'Medium', indemnityMutual ? null : `An uncapped survival clause could be read to expose the Vendor (and by extension disputes over enforceability) to open-ended liability years after the contract ends — better practice is a capped, time-bound indemnity.`, 'Indemnity', indemnityMutual ? null : `Cap the indemnity at contract value and limit survival to 2 years post-termination.`),
    clause(5, 'INSURANCE', insuranceOk
      ? `Vendor shall maintain workmen's compensation insurance for all deployed personnel and public liability insurance of at least ₹50 lakh, with the Hospital named as additional insured.`
      : `Vendor shall maintain insurance "as required by law".`,
      insuranceOk ? null : 'Medium', insuranceOk ? null : `No specified insurance amount or requirement to name the Hospital as additional insured — a generic "as required by law" clause offers little practical protection.`, 'Insurance', insuranceOk ? null : `Specify workmen's compensation for all deployed staff and public liability of at least ₹50 lakh, Hospital named as additional insured.`),
    dataAccess ? clause(6, 'ACCESS TO PREMISES & SYSTEMS', hasDPDP
      ? `Security personnel with access to CCTV monitoring and the visitor-management system shall be bound by a DPDP Act 2023-compliant confidentiality undertaking, with footage/data access logged and reviewed monthly.`
      : `Security personnel are granted access to CCTV monitoring and the visitor-management system as required for their duties.`,
      hasDPDP ? null : 'Medium', hasDPDP ? null : `CCTV and visitor data is personal data under the DPDP Act; access is granted without a specific confidentiality undertaking or access-logging requirement.`, 'DPDP data processing', hasDPDP ? null : `Add a DPDP-compliant confidentiality undertaking and monthly access-log review for staff with CCTV/visitor-data access.`) : null,
    clause(7, 'TERMINATION', `Either party may terminate this agreement with ${noticeDays} days' written notice, or with immediate effect for a serious breach (e.g. repeated statutory non-compliance, a security lapse causing harm).`),
    clause(8, 'AUDIT', auditOk
      ? `Hospital may audit the Vendor's compliance records, training logs and deployment rosters at any time on 48 hours' notice.`
      : null, auditOk ? null : 'Low', auditOk ? null : `No explicit audit right over the Vendor's compliance records or training logs.`, 'Audit rights', auditOk ? null : `Add an audit right over compliance records, training logs and rosters on reasonable notice.`),
    clause(9, 'GOVERNING LAW', `This agreement is governed by the laws of Kerala, with courts at Ernakulam having exclusive jurisdiction.`),
  ].filter(Boolean);

  const missingClauses = [];
  if (!wageComplianceClause) missingClauses.push({ topic: 'Audit rights', note: 'No routine statutory-compliance proof (wages/PF/ESI), a principal-employer risk under the Contract Labour Act.' });
  if (dataAccess && !hasDPDP) missingClauses.push({ topic: 'DPDP data processing', note: 'No DPDP-compliant confidentiality undertaking for staff with CCTV/visitor-data access.' });

  return {
    id: nextId(), title: `${svc === 'security' ? 'Security' : 'Housekeeping'} outsourcing — ${vendor}`, type: 'Housekeeping/security outsourcing',
    counterparty: vendor, counterpartyType: 'Company', value: Math.round(annualValue * termYears), valueLabel: `₹${(annualValue / 1e5).toFixed(1)} lakh/yr · ${headcount} staff`, term: `${termYears} year(s)`,
    requestingDept: svc === 'security' ? 'Security' : 'Housekeeping',
    receivedDate: received, stage, clauses, missingClauses,
  };
}

/* ================= IT SaaS (HIS add-on) with DPA ================= */
function saasContract(stage, receivedDaysAgo) {
  const vendor = pick(SAAS_VENDORS);
  const module = pick(['patient engagement & appointment reminders', 'AI-assisted radiology reporting', 'revenue-cycle analytics', 'e-prescription & drug-interaction checker']);
  const termYears = pick([1, 2, 3]);
  const hasDPA = rnd() < 0.35;
  const dataResidencyIndia = rnd() < 0.5;
  const breachNoticeHrs = pick([24, 72, 168, 0]);
  const subProcessorDisclosure = rnd() < 0.45;
  const uptimeSLA = rnd() < 0.5;
  const autoRenewSilent = rnd() < 0.55;
  const exitDataReturn = rnd() < 0.4;
  const received = addDays(TODAY, -receivedDaysAgo);
  const annualValue = int(6, 28) * 1e5;

  const clauses = [
    clause(1, 'SCOPE', `Vendor shall provide the ${module} module as a hosted, subscription (SaaS) add-on integrated with the Hospital's HIS via API, for ${termYears} year(s).`),
    clause(2, 'DATA PROCESSING ADDENDUM', hasDPA
      ? `A DPDP Act 2023-compliant Data Processing Addendum is annexed, specifying purpose limitation, lawful basis, and the Vendor's role as data processor acting only on the Hospital's instructions.`
      : `Vendor shall process patient data solely to provide the Services, in accordance with its general privacy policy.`,
      hasDPA ? null : 'High',
      hasDPA ? null : `No DPDP-specific Data Processing Addendum — reliance on a generic privacy policy does not satisfy the Hospital's obligations as data fiduciary for patient personal data processed by this Vendor.`,
      'DPDP data processing', hasDPA ? null : `Annex a DPDP-compliant DPA covering purpose limitation, processor obligations, and the Hospital's instructions as data fiduciary.`),
    clause(3, 'DATA RESIDENCY', dataResidencyIndia
      ? `All patient data processed under this agreement shall be hosted on servers located within India.`
      : `Patient data may be hosted on the Vendor's global cloud infrastructure, which may be located outside India.`,
      dataResidencyIndia ? null : 'High', dataResidencyIndia ? null : `Cross-border hosting of patient health data without an explicit data-localisation commitment raises DPDP and sectoral-guidance concerns for a hospital data fiduciary.`, 'DPDP data processing', dataResidencyIndia ? null : `Require all patient data to be hosted within India.`),
    clause(4, 'BREACH NOTIFICATION', breachNoticeHrs && breachNoticeHrs <= 72
      ? `Vendor shall notify the Hospital of any data breach affecting patient data within ${breachNoticeHrs} hours of becoming aware of it.`
      : breachNoticeHrs ? `Vendor shall notify the Hospital of any data breach "within a reasonable time" (target ${breachNoticeHrs} hours, non-binding).`
      : `The agreement does not specify a breach-notification timeline.`,
      breachNoticeHrs && breachNoticeHrs <= 72 ? null : 'High',
      breachNoticeHrs && breachNoticeHrs <= 72 ? null : `DPDP Act practice expects breach notification within 72 hours; a non-binding target or silence leaves the Hospital unable to meet its own regulatory notification timelines.`,
      'DPDP data processing', breachNoticeHrs && breachNoticeHrs <= 72 ? null : `Set a binding 72-hour breach-notification obligation.`),
    clause(5, 'SUB-PROCESSORS', subProcessorDisclosure
      ? `Vendor shall maintain and disclose to the Hospital a current list of sub-processors with access to patient data, and shall not add a new sub-processor without 30 days' prior notice.`
      : `Vendor may engage sub-processors at its discretion without notice to the Hospital.`,
      subProcessorDisclosure ? null : 'Medium', subProcessorDisclosure ? null : `Undisclosed sub-processing of patient data removes the Hospital's ability to assess or object to additional parties handling patient information.`, 'DPDP data processing', subProcessorDisclosure ? null : `Require a disclosed sub-processor list with 30 days' prior notice before any addition.`),
    clause(6, 'SERVICE LEVEL', uptimeSLA
      ? `Vendor guarantees 99.5% monthly uptime, with service credits for shortfall, and shall notify the Hospital of planned downtime at least 48 hours in advance.`
      : `Vendor targets "high availability" with no specific uptime commitment.`,
      uptimeSLA ? null : 'Medium', uptimeSLA ? null : `No measurable uptime SLA for a module integrated into clinical/administrative workflow — outages have no contractual consequence.`, 'Audit rights', uptimeSLA ? null : `Add a 99%+ uptime SLA with service credits and planned-downtime notice.`),
    clause(7, 'FEES & AUTO-RENEWAL', autoRenewSilent
      ? `Subscription fees are payable annually in advance. This agreement automatically renews for successive one-year terms unless either party gives notice of non-renewal at least 30 days before the then-current term ends.`
      : `Subscription fees are payable annually in advance. The Hospital will be notified at least 60 days before the renewal date and must actively confirm renewal in writing.`,
      autoRenewSilent ? 'Medium' : null, autoRenewSilent ? `Only a 30-day opt-out window before silent auto-renewal — short enough that it is easy to miss and get locked into another year.` : null, 'Auto-renewal', autoRenewSilent ? `Extend the opt-out window to at least 60 days, or require the Hospital's active written confirmation to renew.` : null),
    clause(8, 'EXIT & DATA RETURN', exitDataReturn
      ? `On termination or expiry, Vendor shall export all Hospital data in a usable format within 30 days and thereafter permanently delete it, certifying deletion in writing.`
      : `On termination, Vendor will "assist with data migration on a commercially reasonable basis" for an additional fee.`,
      exitDataReturn ? null : 'Medium', exitDataReturn ? null : `No firm data-return obligation or timeline, and migration assistance is conditioned on an undefined additional fee — a lock-in risk at exit.`, 'DPDP data processing', exitDataReturn ? null : `Require data export in a usable format within 30 days of termination, followed by certified deletion, at no extra fee.`),
    clause(9, 'LIABILITY', `Vendor's aggregate liability under this agreement is capped at the fees paid in the preceding 12 months, except for liability arising from a data breach caused by the Vendor's negligence, which is uncapped.`),
    clause(10, 'GOVERNING LAW', `This agreement is governed by the laws of India, with courts at Ernakulam, Kerala having exclusive jurisdiction.`),
  ].filter(Boolean);

  const missingClauses = [];
  if (!hasDPA) missingClauses.push({ topic: 'DPDP data processing', note: 'No DPDP-compliant Data Processing Addendum annexed.' });
  if (!dataResidencyIndia) missingClauses.push({ topic: 'DPDP data processing', note: 'No India data-residency commitment for patient data.' });

  return {
    id: nextId(), title: `IT SaaS — ${module} (${vendor})`, type: 'IT SaaS (HIS add-on)',
    counterparty: vendor, counterpartyType: 'Company', value: annualValue * termYears, valueLabel: `₹${(annualValue / 1e5).toFixed(1)} lakh/yr subscription`, term: `${termYears} year(s)`,
    requestingDept: 'Information Technology', receivedDate: received, stage, clauses, missingClauses,
  };
}

/* ================= International facilitator agreement ================= */
function facilitatorContract(stage, receivedDaysAgo) {
  const vendor = pick(FACILITATOR_VENDORS);
  const commission = pick([12, 15, 18, 22, 28]);
  const termYears = pick([1, 2, 3]);
  const exclusiveTerritory = rnd() < 0.45;
  const paymentOnCollection = rnd() < 0.5;
  const kickbackSafeguard = rnd() < 0.4;
  const jurisdictionOk = rnd() < 0.5;
  const dataSharingOk = rnd() < 0.35;
  const received = addDays(TODAY, -receivedDaysAgo);
  const estAnnualPatients = int(80, 260);
  const avgBillLakh = pick([2.5, 3.5, 5, 7]);
  const annualValue = Math.round(estAnnualPatients * avgBillLakh * 1e5 * (commission / 100));

  const clauses = [
    clause(1, 'APPOINTMENT', `Hospital appoints the Facilitator on a ${exclusiveTerritory ? 'exclusive' : 'non-exclusive'} basis to refer international patients from ${vendor.includes('Gulf') ? 'the GCC region' : vendor.includes('Africure') ? 'East and West Africa' : 'Central and East Africa'} for treatment at the Hospital.`,
      exclusiveTerritory ? 'Medium' : null, exclusiveTerritory ? `An exclusive appointment blocks the Hospital from working with other facilitators or opening a direct desk in the same territory, even if referral volumes fall short of expectations.` : null, null, exclusiveTerritory ? `Make non-exclusive, or add a minimum-referral-volume condition for exclusivity to continue.` : null),
    clause(2, 'COMMISSION', `Facilitator shall receive a commission of ${commission}% of the gross billed amount for each referred patient who completes treatment at the Hospital.`,
      commission > 20 ? 'High' : commission > 18 ? 'Medium' : null,
      commission > 20 ? `A ${commission}% commission on gross billing is well above the typical international-facilitator band (12-18%) and materially erodes net realisation on high-value cases.` : commission > 18 ? `${commission}% is at the high end of the usual band.` : null,
      'Facilitator commission', commission > 18 ? `Negotiate down to 15-18%, or move to a tiered structure that reduces the rate above a volume threshold.` : null),
    clause(3, 'PAYMENT TIMING', paymentOnCollection
      ? `Commission is payable within 30 days of the Hospital actually collecting the patient's bill in full.`
      : `Commission is payable within 15 days of the patient's admission, regardless of eventual collection.`,
      paymentOnCollection ? null : 'High', paymentOnCollection ? null : `Paying commission on admission rather than on collection exposes the Hospital to paying out on bills that are later disputed, discounted, or written off (common with international insurance/TPA cases).`, 'Payment terms', paymentOnCollection ? null : `Tie commission payment to actual collection, not admission.`),
    clause(4, 'ANTI-KICKBACK / PATIENT INTEREST', kickbackSafeguard
      ? `Facilitator shall not receive any payment from the patient for the referral itself, shall disclose the commission arrangement to the patient on request, and shall not steer patients toward specific treatments for commission purposes.`
      : `Facilitator's dealings with patients are its own responsibility; the Hospital makes no representation as to the Facilitator's conduct with patients.`,
      kickbackSafeguard ? null : 'High', kickbackSafeguard ? null : `No safeguard against the Facilitator double-charging patients or steering treatment choices for commission — a reputational and (in some destination countries) regulatory risk that can attach to the Hospital by association.`, null, kickbackSafeguard ? null : `Add a clause prohibiting patient-side charges for the referral and requiring disclosure of the commission arrangement on request.`),
    clause(5, 'MARKETING MATERIALS', `Facilitator may use Hospital-approved marketing materials only, and shall not make clinical claims not authorised in writing by the Hospital's Marketing department.`),
    clause(6, 'DATA SHARING', dataSharingOk
      ? `Any patient information shared by the Facilitator for pre-arrival coordination shall be limited to what is necessary, handled under a DPDP Act 2023-compliant undertaking, and not retained beyond the referral's conclusion.`
      : `Facilitator may share patient enquiry details (including passport copies and medical history) with the Hospital by email as needed for coordination.`,
      dataSharingOk ? null : 'Medium', dataSharingOk ? null : `Patient medical history and identity documents moving by plain email, with no data-minimisation or retention limit, is a DPDP-relevant gap on both sides of the relationship.`, 'DPDP data processing', dataSharingOk ? null : `Add a DPDP-compliant data-handling undertaking with a secure channel and defined retention limit.`),
    clause(7, 'TERM & TERMINATION', `This agreement runs for ${termYears} year(s) and may be terminated by either party with 90 days' written notice, or immediately for a breach of the anti-kickback/patient-interest clause.`),
    clause(8, 'GOVERNING LAW', jurisdictionOk
      ? `This agreement is governed by the laws of India, with disputes referred to arbitration seated at Kochi under the Arbitration and Conciliation Act, 1996.`
      : `This agreement is governed by the laws of India, with disputes subject to the exclusive jurisdiction of the courts of the Facilitator's home jurisdiction.`,
      jurisdictionOk ? null : 'High', jurisdictionOk ? null : `Ceding jurisdiction to the Facilitator's home country makes enforcement (e.g. of the anti-kickback clause) impractical for the Hospital.`, 'Jurisdiction & arbitration', jurisdictionOk ? null : `Amend to Indian law with arbitration seated at Kochi.`),
    clause(9, 'CURRENCY & TAX', `Commission is payable in Indian Rupees, net of applicable TDS, within the timeline set out above.`),
  ].filter(Boolean);

  const missingClauses = [];
  if (!kickbackSafeguard) missingClauses.push({ topic: 'Indemnity', note: 'No anti-kickback / patient-interest safeguard — reputational and regulatory exposure by association.' });
  if (!dataSharingOk) missingClauses.push({ topic: 'DPDP data processing', note: 'Patient documents shared by plain email with no data-handling undertaking.' });

  return {
    id: nextId(), title: `International facilitator agreement — ${vendor}`, type: 'International facilitator agreement',
    counterparty: vendor, counterpartyType: 'Overseas company', value: annualValue * termYears, valueLabel: `Est. ₹${(annualValue / 1e5).toFixed(1)} lakh/yr commission (~${estAnnualPatients} patients/yr)`, term: `${termYears} year(s)`,
    requestingDept: 'International Patient Services', receivedDate: received, stage, clauses, missingClauses,
  };
}

/* ================= Clinical establishment lease ================= */
function establishmentLeaseContract(stage, receivedDaysAgo) {
  const landlord = 'Kavya Estates Pvt Ltd';
  const termYears = 15;
  const rentLakhMonth = 9.5;
  const escalationPct = pick([5, 8, 12]);
  const lockInYears = pick([3, 5]);
  const registrationClauseOk = rnd() < 0.45;
  const subleaseOk = rnd() < 0.4;
  const structuralOk = rnd() < 0.4;
  const jurisdictionOk = true;
  const received = addDays(TODAY, -receivedDaysAgo);

  const clauses = [
    clause(1, 'PREMISES & USE', `Landlord leases the ground-plus-3 building at Kaloor, Kochi, admeasuring approx. 42,000 sq ft, for use exclusively as a clinical establishment (outpatient centre and day-care procedures) under this Hospital's brand.`),
    clause(2, 'TERM', `Lease term of ${termYears} years from the commencement date, with a lock-in period of ${lockInYears} years during which the Hospital may not exit except for the Landlord's breach.`,
      lockInYears >= 5 ? 'Medium' : null, lockInYears >= 5 ? `A ${lockInYears}-year lock-in on a clinical premises lease is long; if the location underperforms, the Hospital has no practical exit for half a decade.` : null, 'Termination for convenience', lockInYears >= 5 ? `Negotiate the lock-in down to 3 years, or add a performance-linked break clause.` : null),
    clause(3, 'RENT & ESCALATION', `Monthly rent of ₹${rentLakhMonth} lakh, escalating at ${escalationPct}% every 3 years.`,
      escalationPct > 8 ? 'Medium' : null, escalationPct > 8 ? `${escalationPct}% triennial escalation is above the typical 5-8% band for comparable Kochi clinical premises.` : null, 'Payment terms', escalationPct > 8 ? `Negotiate escalation down to 5-8% per 3-year block, or link to a published rent index.` : null),
    clause(4, 'REGISTRATION & STAMP DUTY', registrationClauseOk
      ? `This lease shall be registered under the Registration Act, 1908, with stamp duty and registration charges shared equally between the parties.`
      : `The parties may execute this lease as an unregistered document notarised before a notary public.`,
      registrationClauseOk ? null : 'High', registrationClauseOk ? null : `A 15-year lease exceeding 1 year must be registered to be enforceable in court; an unregistered document weakens the Hospital's position on any future dispute over possession or terms.`, null, registrationClauseOk ? null : `Require registration under the Registration Act, 1908.`),
    clause(5, 'STRUCTURAL & FIT-OUT', structuralOk
      ? `Hospital may carry out structural modifications required for clinical licensing (fire safety, biomedical waste storage, oxygen pipeline) subject to Landlord's consent, not to be unreasonably withheld or delayed.`
      : `Hospital may carry out fit-out works only with the Landlord's prior written consent, which may be granted or withheld at the Landlord's sole discretion.`,
      structuralOk ? null : 'High', structuralOk ? null : `Clinical establishment licensing (fire, BMW storage, oxygen pipeline) needs structural changes; leaving consent to the Landlord's "sole discretion" risks a licensing delay entirely outside the Hospital's control.`, null, structuralOk ? null : `Amend to "consent not unreasonably withheld or delayed" for licensing-mandated works.`),
    clause(6, 'SUBLEASE & ASSIGNMENT', subleaseOk
      ? `Hospital may permit specific clinical departments or empanelled diagnostic partners to operate from the premises under its overall licence, without requiring fresh Landlord consent for each such arrangement.`
      : `Hospital may not sublease, assign, or permit any third party to operate from the premises without the Landlord's prior written consent for each instance.`,
      subleaseOk ? null : 'Low', subleaseOk ? null : `Operationally restrictive for a multi-specialty outpatient centre that may want to bring in an empanelled diagnostic partner, though not unusual for commercial leases.`, null, null),
    clause(7, 'MAINTENANCE', `Landlord is responsible for structural repairs and common-area maintenance; the Hospital is responsible for interior fit-out and equipment maintenance.`),
    clause(8, 'TERMINATION FOR CAUSE', `Either party may terminate immediately for the other's uncured material breach following 60 days' written notice and opportunity to cure.`),
    clause(9, 'INSURANCE', `Hospital shall maintain fire and special-perils insurance covering its fit-out and equipment; Landlord shall maintain building insurance for the structure.`),
    clause(10, 'GOVERNING LAW', `This lease is governed by the laws of Kerala, with courts at Ernakulam having exclusive jurisdiction.`),
  ].filter(Boolean);

  const missingClauses = [];
  if (!registrationClauseOk) missingClauses.push({ topic: 'Audit rights', note: 'Lease exceeds 1 year but is proposed as unregistered — enforceability risk.' });
  if (!structuralOk) missingClauses.push({ topic: 'Audit rights', note: 'Structural/fit-out consent left to Landlord\'s sole discretion, risking a licensing delay.' });

  return {
    id: nextId(), title: `Clinical establishment lease — ${landlord} (Kaloor outpatient centre)`, type: 'Clinical establishment lease',
    counterparty: landlord, counterpartyType: 'Company (lessor)', value: Math.round(rentLakhMonth * 1e5 * 12 * termYears), valueLabel: `₹${rentLakhMonth} lakh/month base rent`, term: `${termYears} years`,
    requestingDept: 'Administration', receivedDate: received, stage, clauses, missingClauses,
  };
}

/* ================= NDA with research sponsor ================= */
function ndaContract(stage, receivedDaysAgo) {
  const sponsor = pick(['Helios Clinical Research Foundation', 'Meridian Biosciences Sponsor Trust']);
  const study = pick(['a Phase III cardiometabolic drug trial', 'a post-market surveillance study for a joint implant', 'an investigator-initiated diagnostics validation study']);
  const mutualNda = rnd() < 0.5;
  const termYears = pick([3, 5]);
  const survivalYears = pick([3, 5, 7]);
  const carveOutsOk = rnd() < 0.55;
  const returnOk = rnd() < 0.4;
  const received = addDays(TODAY, -receivedDaysAgo);

  const clauses = [
    clause(1, 'PURPOSE', `This Non-Disclosure Agreement is entered into in connection with discussions for ${study} at the Hospital, sponsored by ${sponsor}.`),
    clause(2, 'CONFIDENTIALITY OBLIGATION', mutualNda
      ? `Both parties shall keep confidential any non-public information disclosed by the other in connection with the study, using at least the same degree of care as for their own confidential information.`
      : `The Hospital shall keep confidential all information disclosed by the Sponsor. The Sponsor has no reciprocal confidentiality obligation toward information disclosed by the Hospital (e.g. site capability, patient volume data).`,
      mutualNda ? null : 'Medium', mutualNda ? null : `A one-way NDA leaves the Hospital's own disclosures (site data, capability information) unprotected, which is unusual and unfavourable for a bilateral research relationship.`, null, mutualNda ? null : `Make the confidentiality obligation mutual.`),
    clause(3, 'CARVE-OUTS', carveOutsOk
      ? `The confidentiality obligation does not apply to information that is already public, independently developed, or required to be disclosed by law or a regulatory authority (including the Ethics Committee and CDSCO), provided notice is given where legally permissible.`
      : `The confidentiality obligation applies to all information disclosed, without exception for legally mandated disclosure.`,
      carveOutsOk ? null : 'Medium', carveOutsOk ? null : `No carve-out for disclosure required by law or a regulator (Ethics Committee, CDSCO) could put the Hospital in a bind if it is legally compelled to disclose something covered by the NDA.`, null, carveOutsOk ? null : `Add a standard carve-out for legally/regulator-mandated disclosure, with notice where permissible.`),
    clause(4, 'TERM & SURVIVAL', `This NDA is effective for ${termYears} years, with the confidentiality obligation surviving for ${survivalYears} years after termination or expiry.`),
    clause(5, 'PATIENT DATA', `Any patient-identifiable information remains subject to the Hospital's own DPDP Act 2023 obligations and the study's Ethics Committee-approved protocol, independent of this NDA's general confidentiality terms.`),
    clause(6, 'RETURN OR DESTRUCTION', returnOk
      ? `On request or termination, each party shall return or certify destruction of the other's confidential information within 30 days, except for one archival copy retained for legal/regulatory record-keeping.`
      : `The agreement does not specify what happens to shared information on termination.`,
      returnOk ? null : 'Low', returnOk ? null : `No return/destruction mechanism at the end of the relationship — a housekeeping gap rather than a high-risk term, but worth closing before signature.`, 'DPDP data processing', returnOk ? null : `Add a return-or-certify-destruction clause with a defined timeline, subject to an archival-record exception.`),
    clause(7, 'NO LICENCE', `Nothing in this NDA grants either party a licence to use the other's confidential information for any purpose other than evaluating and conducting the study.`),
    clause(8, 'GOVERNING LAW', `This agreement is governed by the laws of Kerala, with courts at Ernakulam having exclusive jurisdiction.`),
  ].filter(Boolean);

  const missingClauses = [];
  if (!mutualNda) missingClauses.push({ topic: 'Indemnity', note: 'Confidentiality obligation is one-way; Hospital disclosures are unprotected.' });
  if (!returnOk) missingClauses.push({ topic: 'DPDP data processing', note: 'No return-or-destruction mechanism for shared information at termination.' });

  return {
    id: nextId(), title: `NDA — ${sponsor} (${study})`, type: 'NDA with research sponsor',
    counterparty: sponsor, counterpartyType: 'Research foundation', value: 0, valueLabel: 'No monetary value (NDA only)', term: `${termYears} years`,
    requestingDept: 'Research & Academics', receivedDate: received, stage, clauses, missingClauses,
  };
}

/* ---------- assemble the pipeline: 20 contracts across stages ---------- */
const PLAN = [
  // [builder, stage, daysAgoReceived]
  [consultantContract, 'Intake', 3],
  [leaseContract, 'Intake', 5],
  [saasContract, 'Intake', 2],
  [outsourcingContract, 'Reviewed', 12],
  [cmcContract, 'Reviewed', 18],
  [facilitatorContract, 'Reviewed', 9],
  [consultantContract, 'Reviewed', 21],
  [leaseContract, 'Redlines sent', 34],
  [saasContract, 'Redlines sent', 28],
  [outsourcingContract, 'Redlines sent', 40],
  [cmcContract, 'Redlines sent', 25],
  [consultantContract, 'Negotiating', 55],
  [facilitatorContract, 'Negotiating', 48],
  [establishmentLeaseContract, 'Negotiating', 70],
  [ndaContract, 'Ready to sign', 30],
  [leaseContract, 'Ready to sign', 62],
  [cmcContract, 'Signed', 210],
  [outsourcingContract, 'Signed', 260],
  [saasContract, 'Signed', 180],
  [consultantContract, 'Signed', 320],
  [ndaContract, 'Signed', 150],
];

const contracts = PLAN.map(([fn, stage, daysAgo]) => fn(stage, daysAgo));

/* ---------- obligations: key dates for Signed contracts ---------- */
function buildObligations(c) {
  if (c.stage !== 'Signed') return [];
  const obs = [];
  const termYearsMatch = /(\d+)\s*year/.exec(c.term);
  const termYears = termYearsMatch ? Number(termYearsMatch[1]) : 3;
  const renewalDate = addDays(c.receivedDate, termYears * 365);
  const noticeDays = c.type === 'IT SaaS (HIS add-on)' ? 60 : c.type === 'Visiting consultant agreement' ? 90 : 90;
  if (c.type !== 'NDA with research sponsor') {
    obs.push({ contractId: c.id, contractTitle: c.title, type: 'Renewal', date: renewalDate, description: `Contract term ends; renew, renegotiate, or exit.` });
    obs.push({ contractId: c.id, contractTitle: c.title, type: 'Notice deadline', date: addDays(renewalDate, -noticeDays), description: `Last date to give ${noticeDays} days' non-renewal / renegotiation notice.` });
  } else {
    obs.push({ contractId: c.id, contractTitle: c.title, type: 'NDA expiry', date: renewalDate, description: `NDA term ends (confidentiality obligations continue to survive separately).` });
  }
  if (['Equipment lease / reagent rental', 'CMC/AMC service contract', 'IT SaaS (HIS add-on)'].includes(c.type)) {
    obs.push({ contractId: c.id, contractTitle: c.title, type: 'Price escalation', date: addDays(c.receivedDate, 365), description: `First annual price/CMC-value revision date.` });
  }
  return obs;
}
const obligations = contracts.flatMap(buildObligations);

const data = { today: TODAY, playbook: PLAYBOOK, contracts, obligations };
writeFileSync(OUT, JSON.stringify(data, null, 1));
console.log(`Wrote ${OUT}`);
console.log(`Contracts: ${contracts.length}, clauses: ${contracts.reduce((a, c) => a + c.clauses.length, 0)}, obligations: ${obligations.length}`);
console.log('By stage:', Object.entries(contracts.reduce((a, c) => { a[c.stage] = (a[c.stage] || 0) + 1; return a; }, {})));
