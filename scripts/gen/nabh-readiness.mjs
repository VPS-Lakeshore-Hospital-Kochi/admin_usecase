#!/usr/bin/env node
// Generates data/nabh-readiness.json — synthetic NABH P&P register, policy excerpts,
// and gap/CAPA queue for VPS Lakeshore Hospital, Kochi. Seeded, reproducible.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../data/nabh-readiness.json');
const TODAY = '2026-09-27';

// ---------- seeded PRNG (mulberry32) ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260927);
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const DEPTS = [
  { dept: 'Quality & Accreditation', role: 'Quality Manager' },
  { dept: 'Facilities & Engineering', role: 'Facilities Manager' },
  { dept: 'Pharmacy', role: 'Chief Pharmacist' },
  { dept: 'Nursing Directorate', role: 'Nursing Superintendent' },
  { dept: 'Infection Control', role: 'Infection Control Officer' },
  { dept: 'Human Resources', role: 'HR Head' },
  { dept: 'Information Technology', role: 'IT Head' },
  { dept: 'Medical Affairs', role: 'Medical Superintendent' },
  { dept: 'Biomedical Engineering', role: 'Biomedical Engineer' },
  { dept: 'Administration', role: 'Admin Manager' },
  { dept: 'Emergency & Trauma', role: 'ER Head of Dept' },
  { dept: 'Blood Bank', role: 'Blood Bank In-charge' },
  { dept: 'Health Records (MRD)', role: 'MRD In-charge' },
  { dept: 'CSSD', role: 'CSSD In-charge' },
  { dept: 'Risk Management', role: 'Risk Manager' },
];

// Each chapter: 6 policy topics. `x` marks the ~12 with a Q&A excerpt.
const CHAPTERS = [
  { code: 'AAC', name: 'Access, Assessment & Continuity of Care', topics: [
    ['REG', 'Patient Registration & Records', 0],
    ['OPA', 'Outpatient Assessment Protocol', 0],
    ['ADM', 'Inpatient Admission & Bed Allocation', 9],
    ['COC', 'Continuity of Care & Referral', 0],
    ['TRF', 'Transfer of Patients (Intra/Inter-hospital)', 0],
    ['DIS', 'Discharge Planning & Summary', 0],
  ] },
  { code: 'COP', name: 'Care of Patients', topics: [
    ['ER', 'Emergency Department Triage Protocol', 10],
    ['ER', 'Auto Pulse Mechanical CPR Device Use in ER', 10, true],
    ['OBS', 'High-Risk Obstetric Care Protocol', 0],
    ['SED', 'Moderate Sedation & Analgesia', 3],
    ['RES', 'Physical Restraint & Seclusion Policy', 3, true],
    ['BT', 'Blood & Blood Component Transfusion', 11],
  ] },
  { code: 'MOM', name: 'Management of Medication', topics: [
    ['MOM', 'Medication Storage & Cold Chain', 2, true],
    ['HAM', 'High-Alert Medication Management', 2],
    ['REC', 'Medication Reconciliation', 3],
    ['NAR', 'Narcotic & Controlled Drug Custody', 2],
    ['PRO', 'Prescription & Verbal Order Policy', 2],
    ['ADR', 'Adverse Drug Reaction Reporting', 2],
  ] },
  { code: 'PRE', name: 'Patient Rights & Education', topics: [
    ['PRE', 'Patient Rights & Responsibilities Charter', 0, true],
    ['CON', 'Informed Consent for Procedures', 7, true],
    ['EDU', 'Patient & Family Education Program', 0],
    ['GRV', 'Grievance Redressal Mechanism', 9],
    ['LANG', 'Interpreter & Language Assistance', 0],
    ['EOL', 'Advance Directives & End-of-Life Care', 7],
  ] },
  { code: 'HIC', name: 'Hospital Infection Control', topics: [
    ['HIC', 'Hospital Infection Control Manual', 4],
    ['HH', 'Hand Hygiene Program', 4],
    ['NSI', 'Needle-Stick & Sharps Injury Protocol', 4, true],
    ['ISO', 'Isolation Precautions (Airborne/Droplet/Contact)', 4],
    ['CSSD', 'Sterile Supply & CSSD Monitoring', 13],
    ['ABS', 'Antibiotic Stewardship Program', 4],
  ] },
  { code: 'PSQ', name: 'Patient Safety & Quality Improvement', topics: [
    ['PSQ', 'Patient Safety Incident Reporting (CAPA)', 0],
    ['SEN', 'Sentinel Event Review Policy', 14],
    ['IND', 'Clinical Indicator Monitoring', 0],
    ['RM', 'Risk Management Framework', 14],
    ['PID', 'Patient Identification Protocol', 3],
    ['QC', 'Quality Council Charter', 0],
  ] },
  { code: 'ROM', name: 'Responsibilities of Management', topics: [
    ['ROM', 'Organisation Chart & Delegation of Authority', 9],
    ['AOP', 'Strategic & Annual Operating Plan', 9],
    ['COMP', 'Corporate Compliance Policy', 9],
    ['ETH', 'Ethics Committee Charter', 7],
    ['CSO', 'Contracted Services Oversight', 9],
    ['PUB', 'Public Disclosure & Website Policy', 9],
  ] },
  { code: 'FMS', name: 'Facility Management & Safety', topics: [
    ['FS', 'Fire Safety & Evacuation', 1, true],
    ['BMW', 'Biomedical Waste Management', 1, true],
    ['HSM', 'Hazardous Material Safety', 1, true],
    ['DMP', 'Disaster Management Plan (Code Grey)', 1, true],
    ['EQP', 'Medical Equipment Maintenance Program', 8],
    ['UTL', 'Utility Systems Management (Power/Water/Medical Gas)', 1],
  ] },
  { code: 'HRM', name: 'Human Resource Management', topics: [
    ['HRM', 'HR Credentialing & Privileging', 5, true],
    ['ORI', 'Staff Orientation & Induction', 5],
    ['CE', 'Continuing Education & Training Hours', 5],
    ['SH', 'Staff Health & Immunization', 5],
    ['PA', 'Performance Appraisal Policy', 5],
    ['GDP', 'Grievance & Disciplinary Procedure (Staff)', 5],
  ] },
  { code: 'IMS', name: 'Information Management System', topics: [
    ['IMS', 'IT & Cybersecurity Policy (Downtime Procedure)', 6, true],
    ['EMR', 'Electronic Medical Record Access Control', 6],
    ['MRR', 'Medical Records Retention & Retrieval', 12],
    ['DBR', 'Data Backup & Disaster Recovery', 6],
    ['SIR', 'Statistical Indicator Reporting', 0],
    ['DPP', 'Confidentiality & Data Privacy Policy', 6],
  ] },
];

// Distribution of ages so status mix spans overdue / due-soon / current / missing.
const AGE_BUCKETS = [
  { weight: 5, reviewedDaysAgo: () => int(1000, 1400), cycleYears: 3 },   // overdue
  { weight: 3, reviewedDaysAgo: () => int(950, 1050), cycleYears: 3 },    // due within 90d
  { weight: 8, reviewedDaysAgo: () => int(30, 900), cycleYears: 3 },      // current
  { weight: 1, reviewedDaysAgo: null, cycleYears: null },                 // missing (never reviewed)
];
function pickBucket() {
  const total = AGE_BUCKETS.reduce((a, b) => a + b.weight, 0);
  let r = rnd() * total;
  for (const b of AGE_BUCKETS) { if ((r -= b.weight) <= 0) return b; }
  return AGE_BUCKETS[0];
}

let seq = 0;
const policies = [];
for (const ch of CHAPTERS) {
  ch.topics.forEach(([abbr, title, deptIdx, hasExcerpt], i) => {
    seq += 1;
    const num = i + 1 + int(0, 8); // vary the doc number a little, house style e.g. LHRC/P&P/HSM/11
    const id = `LHRC/P&P/${abbr}/${String(num).padStart(2, '0')}`;
    const owner = DEPTS[deptIdx] || DEPTS[0];
    const bucket = pickBucket();
    let reviewed = null, due = null;
    if (bucket.reviewedDaysAgo) {
      reviewed = addDays(TODAY, -bucket.reviewedDaysAgo());
      due = addDays(reviewed, bucket.cycleYears * 365);
    }
    const prepared = reviewed ? addDays(reviewed, -int(10, 60)) : null;
    policies.push({
      id, title, chapter: ch.code, ownerDept: owner.dept, ownerRole: owner.role,
      prepared, reviewed, due, version: reviewed ? int(1, 6) : 1,
      hasExcerpt: !!hasExcerpt,
    });
  });
}

// ---------- policy excerpts (~12, for Policy Q&A tab) ----------
const EXCERPTS = [
  { abbr: 'ER', section: 'Section 4.2–4.3 — Authorised Use',
    text: `Section 4.2 — Authorised Use: The Auto Pulse mechanical CPR device is approved for use within the Emergency Department and the Cath Lab only, by ER physicians and Critical Care physicians who have completed the vendor-certified competency module (valid 2 years).\nSection 4.3 — Use Outside ER: Deployment of the device outside the ER or Cath Lab (e.g. during an in-hospital transport code blue) requires verbal authorisation from the ER Medical Officer on duty OR the Critical Care Consultant on call, to be countersigned within 24 hours. Nursing staff may not independently authorise use.` },
  { abbr: 'FS', section: 'Section 3 — Evacuation & Fire Drills',
    text: `Section 3.1 — Fire Alarm Response: On activation of a fire alarm, the ward in-charge announces "Code Red, [location]" over the PA system and initiates horizontal evacuation to the adjoining fire compartment first; vertical evacuation via the designated fire stairs is used only if the fire compartment itself is compromised.\nSection 3.2 — Drill Frequency: A full-scale fire evacuation drill is conducted each quarter per building block, with at least one night-shift drill per year. Records (attendance, evacuation time, debrief notes) are retained by Facilities for 3 years.\nSection 3.3 — Fire Extinguisher Checks: Monthly visual check and annual refill/pressure test by an empanelled vendor; tags updated on each extinguisher.` },
  { abbr: 'BMW', section: 'Section 2 — Waste Segregation & Handover',
    text: `Section 2.1 — Colour Coding: Yellow (human anatomical waste, soiled linen), Red (contaminated plastics, tubing, catheters), White/translucent (sharps, needles), Blue (glassware, metallic implants).\nSection 2.2 — Segregation Point: Segregation happens at the point of generation (bedside/OT), never retrospectively at the storage room.\nSection 2.3 — Handover: Waste is weighed and logged in the BMW register at each shift change, then handed to the empanelled BMW contractor daily by 6 pm; the contractor's manifest is countersigned by the ward in-charge and filed for 5 years.` },
  { abbr: 'HSM', section: 'Section 6 — Chemical Spill Response (Mercury Spills)',
    text: `Section 6.1 — Mercury Spills (e.g. broken thermometer/sphygmomanometer): Evacuate the immediate area; do not use a vacuum cleaner or broom. Don PPE (nitrile gloves, N95). Use the designated Mercury Spill Kit (stored in each nursing station utility room) to contain droplets using the suction bulb/cardboard provided; place residue in the kit's sealed container, label as hazardous waste, and hand over to the BMW contractor per LHRC/P&P/BMW/01. Ventilate the area for a minimum of 2 hours.\nSection 6.2 — Non-mercury chemical spills (housekeeping chemicals): refer to the MSDS on file with the Housekeeping Supervisor; this excerpt does not reproduce the MSDS index.` },
  { abbr: 'MOM', section: 'Section 5 — Storage & Cold Chain',
    text: `Section 5.1 — Ambient Storage: Medication store rooms are maintained at 20–25°C with daily logged temperature checks (twice a shift); any excursion beyond 30°C for over 2 hours is reported to Pharmacy and the affected batch quarantined pending manufacturer advice.\nSection 5.2 — Cold Chain: Refrigerated medicines (vaccines, insulin, some biologics) are stored at 2–8°C in a dedicated pharmacy refrigerator with a continuous data logger and backup power; a stock-out or power failure alarm routes to the on-call pharmacist's phone.\nSection 5.3 — Look-Alike/Sound-Alike (LASA): LASA drugs are stored with tall-man lettering and a physical separator, never adjacent on the same shelf.` },
  { abbr: 'PRE', section: 'Section 1 — Patient Rights',
    text: `Section 1.4 — Right to Information: Patients and, where relevant, their attendants have the right to receive information about their diagnosis, planned treatment, expected cost estimate, and alternatives, in a language they understand.\nSection 1.7 — Right to Refuse Treatment: A competent adult patient may refuse a recommended treatment after being informed of the likely consequences; the refusal and the counselling given are documented and countersigned by the treating consultant.\nSection 1.9 — Privacy & Confidentiality: Patient information is disclosed to family only with the patient's consent, except where law requires disclosure (e.g. notifiable diseases, medico-legal cases).` },
  { abbr: 'CON', section: 'Section 2 — Informed Consent',
    text: `Section 2.1 — Who Obtains Consent: Informed consent for any invasive procedure or surgery is obtained by the operating/treating consultant (or a designated qualified team member), not by administrative or nursing staff alone.\nSection 2.3 — High-Risk Procedures: For high-risk procedures (e.g. robotic surgery, procedures under general anaesthesia), consent is taken on the specific high-risk consent form listing the procedure, alternatives, anticipated benefits, material risks and the named consultant, at least on the day prior to an elective procedure where feasible.\nSection 2.5 — Video/Photo Consent: Separate written consent is required before any clinical photography or video recording, specifying the purpose (record vs teaching vs publication).` },
  { abbr: 'RES', section: 'Section 4 — Restraint Use',
    text: `Section 4.1 — Indications: Physical restraint is used only when a patient is a danger to self or others and less-restrictive measures have failed or are not feasible; it is never used for staff convenience.\nSection 4.2 — Authorisation: Restraint requires a documented physician order specifying type, reason and maximum duration (renewable in writing every 4 hours for behavioural restraint, every 24 hours for medical/surgical restraint); a verbal order must be countersigned within 1 hour.\nSection 4.4 — Monitoring: A restrained patient is assessed and the restraint's continued need reviewed at least every 2 hours, with skin integrity, circulation and toileting needs checked and logged on the restraint monitoring sheet.` },
  { abbr: 'HRM', section: 'Section 3 — Credentialing & Privileging',
    text: `Section 3.1 — Primary Source Verification: Before a consultant is granted clinical privileges, HR/Medical Affairs verifies the medical degree, postgraduate qualification, Kerala Medical Council registration, and prior employment references from the primary source (issuing university/council), not from photocopies alone.\nSection 3.3 — Privilege Delineation: Privileges are granted procedure-wise (a delineated privileges list), not merely by department, and are reviewed at re-credentialing every 2 years or on request for a new procedure/technology (e.g. a new robotic platform).\nSection 3.5 — Locum & Visiting Consultants: A locum or visiting consultant practising for fewer than 30 days in a year still requires the same primary source verification before any patient contact, with an abbreviated file retained.` },
  { abbr: 'IMS', section: 'Section 7 — Downtime Procedure',
    text: `Section 7.1 — Planned Downtime: IT notifies all clinical and billing areas at least 24 hours before planned HIS/EMR downtime; each ward switches to the paper downtime forms kept in the downtime box at the nursing station.\nSection 7.2 — Unplanned Downtime: On an unplanned outage, the ward in-charge activates the downtime protocol immediately: paper vitals charting, paper drug charts, and manual bed-board tracking, with a designated "runner" for lab/pharmacy communication until systems are restored.\nSection 7.3 — Data Reconciliation: Once systems are restored, all paper records generated during downtime are entered into the EMR within 24 hours and the original paper forms scanned and retained per the medical records retention schedule.` },
  { abbr: 'DMP', section: 'Section 2 — Code Alerts',
    text: `Section 2.1 — Code Grey (Internal Disaster, e.g. structural/fire/utility failure): Announced hospital-wide; the Disaster Management Committee convenes at the designated command point within 15 minutes; non-essential admissions are paused and the surge bed list is activated.\nSection 2.2 — Code Yellow (External/Mass Casualty Disaster): Triggers activation of the triage area near the ER ambulance bay, recall of off-duty clinical staff per the recall tree, and opening of the overflow ward.\nSection 2.4 — Drills: At least two mock disaster drills per year, one of which simulates a mass casualty (Code Yellow) scenario, with a written debrief within 1 week.` },
  { abbr: 'NSI', section: 'Section 9 — Sharps and Needle-Stick Injuries',
    text: `Section 9.1 — Immediate First Aid: Wash the exposed site with soap and running water (do not squeeze or suck); for mucosal splash, flush with saline or water for 10 minutes.\nSection 9.2 — Reporting: Report to the Infection Control Officer within 1 hour of exposure using the needle-stick injury form; do not wait for the shift to end.\nSection 9.3 — Post-Exposure Prophylaxis: PEP eligibility and regimen are assessed per Annexure C based on source-patient status and exposure severity; baseline and follow-up serology are tracked by Infection Control at 6 weeks, 3 months and 6 months.` },
];
const excerpts = EXCERPTS.map(e => {
  const p = policies.find(x => x.id.includes(`/${e.abbr}/`) && x.hasExcerpt);
  return { id: p ? p.id : `LHRC/P&P/${e.abbr}/01`, title: p ? p.title : e.abbr, chapter: p ? p.chapter : '', section: e.section, text: e.text };
});

// ---------- gaps / open CAPAs (~15) ----------
const SEVERITIES = ['High', 'Medium', 'Low'];
const GAP_SEEDS = [
  { title: 'IT & Cybersecurity Policy overdue for revision', chapter: 'IMS', abbr: 'IMS', severity: 'High',
    desc: 'The governing IT & Cybersecurity policy has crossed its 3-year revision cycle with no updated VAPT (vulnerability assessment/penetration test) evidence on file.' },
  { title: 'Auto Pulse device competency certificates lapsing', chapter: 'COP', abbr: 'ER', severity: 'High',
    desc: 'Vendor competency certification for the mechanical CPR device is 2-year validity; several ER nursing staff certificates lapsed without a refresher batch scheduled.' },
  { title: 'Fire drill records incomplete for Q2', chapter: 'FMS', abbr: 'FS', severity: 'Medium',
    desc: 'Quarterly fire evacuation drill for the OPD block in Q2 2026 has no attendance sheet or evacuation-time record on file.' },
  { title: 'Mercury spill kit missing in two nursing stations', chapter: 'FMS', abbr: 'HSM', severity: 'High',
    desc: 'Internal round found the designated Mercury Spill Kit absent from the utility rooms of 3rd floor Medicine ward and 5th floor Surgical ward.' },
  { title: 'BMW manifest countersignature gaps', chapter: 'FMS', abbr: 'BMW', severity: 'Medium',
    desc: 'Random audit of 20 daily BMW handover manifests found 4 without the ward in-charge countersignature.' },
  { title: 'Cold-chain temperature log gaps in pharmacy store', chapter: 'MOM', abbr: 'MOM', severity: 'Medium',
    desc: 'The twice-a-shift refrigerator temperature log for the main pharmacy store had unexplained gaps on 6 days in August 2026.' },
  { title: 'Restraint monitoring sheet not completed every 2 hours', chapter: 'COP', abbr: 'RES', severity: 'High',
    desc: 'Chart review of 5 ICU restraint episodes found the 2-hourly monitoring sheet completed for only 2 of the required intervals in 3 cases.' },
  { title: 'Credentialing file missing primary-source verification', chapter: 'HRM', abbr: 'HRM', severity: 'High',
    desc: 'One visiting consultant file (cardiology) had degree copies on record but no documented primary-source verification from the issuing university.' },
  { title: 'Informed consent form missing consultant signature', chapter: 'PRE', abbr: 'CON', severity: 'Medium',
    desc: 'Medical records audit of 30 surgical files found 2 high-risk consent forms with the patient signature but no countersignature from the named consultant.' },
  { title: 'Needle-stick injuries not reported within 1 hour', chapter: 'HIC', abbr: 'NSI', severity: 'Medium',
    desc: 'Of 12 needle-stick injuries logged in the last quarter, 4 were reported to Infection Control more than 4 hours after the exposure.' },
  { title: 'Disaster drill debrief not completed', chapter: 'FMS', abbr: 'DMP', severity: 'Low',
    desc: 'The mass-casualty (Code Yellow) mock drill in July 2026 was conducted but the written debrief was never circulated within the required 1 week.' },
  { title: 'Patient rights charter not displayed in regional language', chapter: 'PRE', abbr: 'PRE', severity: 'Low',
    desc: 'Patient rights charter posters in 2 outpatient waiting areas are in English only; Malayalam version is not displayed.' },
  { title: 'Downtime paper forms stock low at nursing stations', chapter: 'IMS', abbr: 'IMS', severity: 'Low',
    desc: 'Spot check found the downtime box in 2 wards had fewer than 5 paper vitals-charting forms remaining, below the stocked minimum of 20.' },
  { title: 'Sentinel event review turnaround exceeding target', chapter: 'PSQ', abbr: 'SEN', severity: 'Medium',
    desc: 'Root cause analysis for the last 2 sentinel events took 18 and 21 days respectively, against the policy target of completion within 10 working days.' },
  { title: 'Delegation of authority chart not updated post reorganisation', chapter: 'ROM', abbr: 'ROM', severity: 'Medium',
    desc: 'The approved organisation chart and delegation-of-authority table still reflects the pre-reorganisation structure from 2024; 3 roles have since changed.' },
];
const gaps = GAP_SEEDS.map((g, i) => {
  const linked = policies.find(p => p.id.includes(`/${g.abbr}/`)) || policies.find(p => p.chapter === g.chapter);
  const owner = DEPTS.find(d => d.dept === (linked ? linked.ownerDept : '')) || pick(DEPTS);
  return {
    id: `GAP-${String(i + 1).padStart(3, '0')}`,
    title: g.title, chapter: g.chapter, severity: g.severity, description: g.desc,
    policyId: linked ? linked.id : null, policyTitle: linked ? linked.title : null,
    ownerDept: owner.dept, ownerRole: owner.role,
    raisedOn: addDays(TODAY, -int(5, 45)),
    status: 'Open',
  };
});

// ---------- mock-survey question bank (per chapter, generic templates) ----------
const SURVEY_BANK = {
  AAC: [
    { q: 'Walk me through a patient from registration to bed allocation — where is continuity of care documented?', evidence: 'Admission register, bed board log, nursing assessment sheet' },
    { q: 'Show me a recent inter-hospital patient transfer record with the accompanying clinical summary.', evidence: 'Transfer form, referral letter, ambulance handover checklist' },
    { q: 'How do you ensure a discharge summary reaches the patient and the referring doctor?', evidence: 'Discharge summary log, courier/email dispatch register' },
  ],
  COP: [
    { q: 'Demonstrate the competency record for staff authorised to use the mechanical CPR device.', evidence: 'Vendor competency certificates, training attendance log' },
    { q: 'Show me a recent restraint episode and its 2-hourly monitoring sheet.', evidence: 'Restraint order, monitoring sheet, physician review notes' },
    { q: 'How is a blood transfusion reaction identified and escalated?', evidence: 'Transfusion reaction reporting form, blood bank register' },
  ],
  MOM: [
    { q: 'Show me today\'s cold-chain temperature log for the pharmacy store.', evidence: 'Refrigerator temperature log, alarm/escalation record' },
    { q: 'How are look-alike/sound-alike drugs physically separated on the shelf?', evidence: 'Pharmacy store walk-through, LASA labelling' },
    { q: 'Walk me through medication reconciliation at admission and discharge.', evidence: 'Reconciliation form, discharge medication list' },
  ],
  PRE: [
    { q: 'Show me a high-risk procedure consent form completed in the last week.', evidence: 'Signed high-risk consent form with consultant countersignature' },
    { q: 'How does a patient register a grievance, and how is it tracked to closure?', evidence: 'Grievance register, turnaround-time log' },
    { q: 'Is the patient rights charter available in the local language?', evidence: 'Charter display at OPD/wards, translated versions' },
  ],
  HIC: [
    { q: 'Show me the needle-stick injury reporting and PEP tracking for the last quarter.', evidence: 'Injury report forms, PEP register, serology follow-up log' },
    { q: 'Demonstrate a hand-hygiene compliance audit and the corrective actions taken.', evidence: 'Hand-hygiene audit checklist, trend chart, CAPA if below target' },
    { q: 'How is isolation precaution signage and PPE stocked for an airborne-precaution room?', evidence: 'Isolation room walk-through, PPE stock log' },
  ],
  PSQ: [
    { q: 'Show me the root-cause analysis for your most recent sentinel event, with turnaround time.', evidence: 'RCA report, timeline against the 10-working-day target' },
    { q: 'How are clinical indicators tracked and reviewed by the Quality Council?', evidence: 'Indicator dashboard, Quality Council minutes' },
    { q: 'Demonstrate the patient identification protocol at the bedside.', evidence: 'ID band check, two-identifier verification at a care point' },
  ],
  ROM: [
    { q: 'Show me the current approved organisation chart and delegation-of-authority table.', evidence: 'Signed org chart, DoA table, board/management approval' },
    { q: 'How does management oversee contracted/outsourced services (housekeeping, security, F&B)?', evidence: 'Vendor contract, service-level review minutes' },
    { q: 'Walk me through the annual operating plan review cycle.', evidence: 'AOP document, management review minutes' },
  ],
  FMS: [
    { q: 'Show me the last fire evacuation drill record, including a night-shift drill.', evidence: 'Drill attendance sheet, evacuation time, debrief notes' },
    { q: 'Demonstrate the mercury spill kit and walk me through the spill response.', evidence: 'Spill kit at the nursing station, SOP walk-through' },
    { q: 'Show me the biomedical waste segregation and handover manifest for today.', evidence: 'Colour-coded bins, BMW register, contractor manifest' },
  ],
  HRM: [
    { q: 'Show me the credentialing file for a recently onboarded consultant, including primary-source verification.', evidence: 'Credentialing file, primary-source verification letter' },
    { q: 'How is staff continuing education tracked against the required annual hours?', evidence: 'Training log, CE hour tracker' },
    { q: 'Demonstrate the staff health and immunization record for a clinical staff member.', evidence: 'Immunization card, pre-employment health check record' },
  ],
  IMS: [
    { q: 'Walk me through what happens on an unplanned HIS/EMR downtime.', evidence: 'Downtime SOP, paper downtime forms, reconciliation log' },
    { q: 'Show me the data backup and disaster recovery test record.', evidence: 'Backup log, last DR drill report' },
    { q: 'How is access to the EMR restricted by role?', evidence: 'Access control matrix, audit trail of a sample record' },
  ],
};

// ---------- readiness trend (for dashboard) ----------
const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
let trendBase = 58;
const readinessTrend = months.map(() => { trendBase = Math.max(50, Math.min(90, trendBase + int(-3, 5))); return trendBase; });

const out = {
  today: TODAY,
  chapters: CHAPTERS.map(c => ({ code: c.code, name: c.name })),
  departments: DEPTS,
  policies,
  excerpts,
  gaps,
  surveyBank: SURVEY_BANK,
  months, readinessTrend,
};

writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`Wrote ${OUT}`);
console.log(`policies=${policies.length} excerpts=${excerpts.length} gaps=${gaps.length}`);
console.log(`size=${(JSON.stringify(out).length / 1024).toFixed(1)} KB`);
