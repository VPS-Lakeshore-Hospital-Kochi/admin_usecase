// Generates data/hr-screener.json — synthetic recruitment dataset for the HR resume screener demo.
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
const pickN = (arr, n) => { const c = arr.slice(), out = []; while (out.length < n && c.length) out.push(c.splice(Math.floor(rnd() * c.length), 1)[0]); return out; };
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const chance = p => rnd() < p;

const FIRST_F = ['Anjali', 'Bincy', 'Chinnu', 'Divya', 'Elizabeth', 'Fathima', 'Greeshma', 'Hima', 'Indu', 'Jesna', 'Kavya', 'Lekshmi', 'Meera', 'Neethu', 'Parvathy', 'Reshma', 'Sherin', 'Teena', 'Uma', 'Vidya', 'Anju', 'Rincy', 'Soumya', 'Athira', 'Nimisha', 'Devika'];
const FIRST_M = ['Aravind', 'Basil', 'Christo', 'Dennis', 'Ebin', 'Franco', 'Gokul', 'Harish', 'Irfan', 'Jibin', 'Kiran', 'Libin', 'Manu', 'Nithin', 'Om', 'Pranav', 'Renjith', 'Sachin', 'Tibin', 'Varun', 'Akhil', 'Rohan', 'Sreejith', 'Vishnu', 'Anand', 'Deepak'];
const LAST = ['Mathew', 'Thomas', 'Nair', 'Menon', 'Pillai', 'Varghese', 'Jacob', 'Kurian', 'George', 'Joseph', 'Iqbal', 'Rahman', 'Krishnan', 'Suresh', 'Panicker', 'Chacko', 'Abraham', 'Sebastian', 'Rajan', 'Vincent', 'Antony', 'Xavier', 'Balan', 'Warrier'];
const LOCATIONS = ['Kochi', 'Ernakulam', 'Thrissur', 'Kottayam', 'Alappuzha', 'Kollam', 'Kannur', 'Kozhikode', 'Palakkad', 'Thiruvananthapuram', 'Muvattupuzha', 'Angamaly', 'Aluva', 'Perumbavoor', 'Kolenchery'];
const SOURCES = ['Naukri', 'Referral', 'Walk-in', 'LinkedIn', 'Campus drive', 'Consultancy'];

const HOSP_EMPLOYERS = ['Sunrise Multispecialty Hospital', "St. Xavier's Charitable Hospital", 'Coastal Care Hospital', 'Metro Health Institute', 'Riverside Hospital', 'Harbor View Medical Center', 'Palm Grove Hospital', 'Emerald Health City', 'Silver Oak Hospital', 'Greenfield Medical College', 'Backwater Speciality Hospital', 'Hillcrest Nursing Home', 'Lakeview General Hospital'];
const CORP_EMPLOYERS = ['Trident InfoSystems', 'Bluewave Technologies', 'NexaCare TPA Services', 'Meridian Insurance TPA', 'Coral Software Labs', 'Zenith Solutions', 'Orion HealthTech', 'Vertex Systems', 'Everest Business Services', 'Pinnacle Corporate Services', 'Clarity Claims Processors', 'Skyline Digital Pvt Ltd'];
const NURSING_COLLEGES = ['Believers Church Medical College', 'St. James School of Nursing', 'Jubilee Mission Medical College', 'Lourdes College of Nursing', 'Little Flower College of Nursing', 'Believers Institute of Health Sciences', 'Al Salama College of Nursing'];

const name = () => (chance(0.55) ? `${pick(FIRST_F)} ${pick(LAST)}` : `${pick(FIRST_M)} ${pick(LAST)}`);
const today = new Date('2026-09-27');
const daysAgo = n => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const lpa = n => Math.round(n * 100000);

let seq = 1;
const nextId = p => `${p}-${String(seq++).padStart(3, '0')}`;

// ---------- requisitions ----------
const requisitions = [
  {
    id: 'REQ-NUR-ICU', title: 'Staff Nurse – ICU', dept: 'Nursing — Critical Care', openings: 6,
    location: 'VPS Lakeshore Hospital, Kochi', minExperienceYears: 1, requiredRegistration: 'KNMC',
    requiredCert: 'BLS', preferredCert: 'ACLS', keySkills: ['ventilator management', 'IABP', 'CRRT', 'HIS/EMR charting', 'post-cardiac-surgery care'],
    budgetMaxLPA: 5.5,
    mustHaves: ['BSc Nursing (or GNM with 3+ yrs ICU experience)', 'Valid Kerala Nurses & Midwives Council (KNMC) registration or eligible for transfer', 'BLS certification mandatory', 'Minimum 1 year ICU/Critical Care experience', 'Willing to work rotational shifts incl. nights'],
    goodToHaves: ['ACLS certification', 'Ventilator, IABP or CRRT exposure', 'Post-cardiac-surgery or transplant ICU experience', 'Basic HIS/EMR charting literacy'],
    jd: `POSITION: Staff Nurse – ICU (Adult & Cardiac) · 6 openings\nDEPARTMENT: Critical Care · REPORTS TO: ICU Nurse Manager · LOCATION: VPS Lakeshore Hospital, Kochi\n\nMust-have:\n- BSc Nursing (or GNM with 3+ yrs ICU experience)\n- Valid KNMC registration or eligible for transfer\n- BLS certification mandatory; ACLS strongly preferred\n- Minimum 1 year ICU/Critical Care experience (post-registration)\n- Willing to work rotational shifts incl. nights\n\nGood to have:\n- Ventilator management, IABP, CRRT exposure\n- Post-cardiac-surgery or transplant ICU care\n- Basic HIS/EMR charting literacy\n\nWe value: patient safety mindset, calm under pressure, teamwork, communication with families of critically ill patients.`,
  },
  {
    id: 'REQ-TPA-SR', title: 'Senior Executive – TPA desk', dept: 'Insurance & TPA Desk', openings: 1,
    location: 'VPS Lakeshore Hospital, Kochi', minExperienceYears: 4, requiredRegistration: null,
    requiredCert: null, preferredCert: 'Certified TPA Claims Associate', keySkills: ['cashless claims', 'pre-authorization', 'TPA coordination', 'insurance reconciliation', 'IRDAI guidelines', 'query resolution with insurers'],
    budgetMaxLPA: 7.5,
    mustHaves: ['Minimum 4 years in a hospital TPA/insurance desk or health insurer', 'Hands-on with cashless pre-authorisation and claims cycle', 'Comfortable with high patient/attendant volumes and escalations', 'Working knowledge of major TPAs and IRDAI guidelines'],
    goodToHaves: ['Team-lead or shift-in-charge experience', 'Exposure to corporate/PSU empanelment desks', 'MS Excel reconciliation skills'],
    jd: `POSITION: Senior Executive – TPA Desk · 1 opening\nDEPARTMENT: Insurance & TPA Desk · REPORTS TO: Manager – Insurance & TPA · LOCATION: VPS Lakeshore Hospital, Kochi\n\nMust-have:\n- Minimum 4 years in a hospital TPA/insurance desk or health insurer\n- Hands-on with cashless pre-authorisation and the full claims cycle\n- Comfortable with high patient/attendant volumes and escalations\n- Working knowledge of major TPAs and IRDAI guidelines\n\nGood to have:\n- Team-lead or shift-in-charge experience\n- Exposure to corporate/PSU empanelment desks\n- MS Excel reconciliation skills\n\nWe value: composure with anxious attendants, accuracy under deadline, plain communication with insurers.`,
  },
  {
    id: 'REQ-DEV-HIS', title: 'Full-stack developer (HIS integration)', dept: 'IT & Digital Health', openings: 1,
    location: 'VPS Lakeshore Hospital, Kochi (hybrid)', minExperienceYears: 3, requiredRegistration: null,
    requiredCert: null, preferredCert: null, keySkills: ['HL7/FHIR', 'React', 'Node.js', 'REST APIs', 'SQL', 'HIS/EMR integration', 'Docker'],
    budgetMaxLPA: 12,
    mustHaves: ['3+ years full-stack development (JavaScript/TypeScript)', 'React or an equivalent modern front-end framework', 'Node.js or similar back-end with REST APIs', 'Working SQL and relational schema design'],
    goodToHaves: ['HL7/FHIR or hospital information system (HIS) integration experience', 'Docker/CI-CD exposure', 'Healthcare or regulated-data domain experience'],
    jd: `POSITION: Full-stack Developer – HIS Integration · 1 opening\nDEPARTMENT: IT & Digital Health · REPORTS TO: Head – IT & Digital Health · LOCATION: VPS Lakeshore Hospital, Kochi (hybrid)\n\nMust-have:\n- 3+ years full-stack development (JavaScript/TypeScript)\n- React or an equivalent modern front-end framework\n- Node.js or similar back-end with REST APIs\n- Working SQL and relational schema design\n\nGood to have:\n- HL7/FHIR or HIS/EMR integration experience\n- Docker/CI-CD exposure\n- Healthcare or regulated-data domain experience\n\nWe value: careful handling of patient data, clear documentation, comfort working with clinical and insurance stakeholders.`,
  },
  {
    id: 'REQ-FO-EXEC', title: 'Front office executive', dept: 'Patient Services', openings: 3,
    location: 'VPS Lakeshore Hospital, Kochi', minExperienceYears: 1, requiredRegistration: null,
    requiredCert: null, preferredCert: null, keySkills: ['patient registration', 'billing coordination', 'multilingual (Malayalam/English/Hindi)', 'HIS front-desk software', 'handling TPA walk-ins'],
    budgetMaxLPA: 4,
    mustHaves: ['Minimum 1 year front-desk/customer-facing role, healthcare preferred', 'Fluent in Malayalam and English; Hindi an advantage', 'Comfortable with computer-based registration/billing systems', 'Poised with anxious patients and attendants'],
    goodToHaves: ['Prior hospital front office or TPA walk-in desk experience', 'Basic billing/insurance documentation familiarity', 'Additional language (Tamil/Kannada/Arabic)'],
    jd: `POSITION: Front Office Executive · 3 openings\nDEPARTMENT: Patient Services · REPORTS TO: Front Office Manager · LOCATION: VPS Lakeshore Hospital, Kochi\n\nMust-have:\n- Minimum 1 year front-desk/customer-facing role, healthcare preferred\n- Fluent in Malayalam and English; Hindi an advantage\n- Comfortable with computer-based registration/billing systems\n- Poised with anxious patients and attendants\n\nGood to have:\n- Prior hospital front office or TPA walk-in desk experience\n- Basic billing/insurance documentation familiarity\n- Additional language (Tamil/Kannada/Arabic)\n\nWe value: warmth under pressure, accuracy in registration data, teamwork across shifts.`,
  },
];

// ---------- applicants ----------
const STAGE_ORDER = ['Applied', 'Screened', 'Shortlisted', 'Interview', 'Offer', 'Rejected'];
function stageFor(i, n, offers) {
  // spread: mostly Applied, some further along; guarantee at least one Offer per requisition.
  if (i === 0) return offers ? 'Offer' : 'Interview';
  if (i === 1) return 'Interview';
  if (i === 2) return 'Shortlisted';
  if (i === 3) return 'Screened';
  if (i === n - 1) return 'Rejected';
  if (i === n - 2) return chance(0.6) ? 'Rejected' : 'Screened';
  return 'Applied';
}

function nurseCandidate(reqId, i, n) {
  const stage = stageFor(i, n, true);
  const college = pick(NURSING_COLLEGES);
  const exp = int(0, 9);
  const degree = exp >= 3 && chance(0.4) ? 'GNM' : 'BSc Nursing';
  const hasKNMC = chance(0.85);
  const certExpired = chance(0.15);
  const hasBLS = chance(0.85);
  const hasACLS = chance(0.4) && hasBLS;
  const skillsPool = ['ventilator management', 'IABP', 'CRRT', 'HIS/EMR charting', 'post-cardiac-surgery care', 'arterial line care', 'wound care', 'paediatric ICU'];
  const skills = pickN(skillsPool, int(1, 4));
  const employer = pick(HOSP_EMPLOYERS);
  const notice = pick([15, 30, 30, 45, 60, 90]);
  const currentCTC = lpa((2.4 + exp * 0.28 + rnd() * 0.4).toFixed(2));
  const expectedCTC = Math.round(currentCTC * (1.15 + rnd() * 0.35));
  const flags = [];
  if (certExpired) flags.push('BLS certification listed as expired');
  if (!hasKNMC) flags.push('KNMC registration pending/not yet transferred');
  if (chance(0.15)) flags.push(`Employment gap of ${int(3, 9)} months noted between roles`);
  if (chance(0.12)) flags.push('Three employers in the last 3 years');
  const nm = name();
  const loc = pick(LOCATIONS);
  const cv = `${nm.toUpperCase()} | ${loc}, Kerala | ${exp} year${exp === 1 ? '' : 's'} experience
EDUCATION: ${degree}, ${college}, ${2024 - exp - int(3, 4)}-${2024 - exp}
REGISTRATION: Kerala Nurses & Midwives Council${hasKNMC ? ` – Reg No. KNMC/${2016 + int(0, 9)}/${int(10000, 99999)} (Active${certExpired ? '' : ', renewed ' + int(2024, 2026)})` : ' – application under transfer from home state council'}
CERTIFICATIONS: ${hasBLS ? `BLS (AHA${certExpired ? ', expired ' + int(2023, 2024) : ', renewed ' + int(2025, 2026)})` : 'BLS not yet certified'}${hasACLS ? ', ACLS (' + int(2024, 2026) + ')' : ''}
EXPERIENCE:
- Staff Nurse, ICU – ${employer}, ${loc} (${exp > 0 ? exp + ' yr' + (exp === 1 ? '' : 's') : 'Fresher — internship only'})
  ${skills.length ? 'Exposure: ' + skills.join(', ') : 'General ward rotation, limited ICU exposure'}
${chance(0.5) ? `- Staff Nurse Intern, Medical ICU – ${college} (rotational, ${2024 - exp - 1}-${2024 - exp})\n` : ''}NOTICE PERIOD: ${notice} days
CURRENT CTC: Rs ${(currentCTC / 100000).toFixed(1)} LPA | EXPECTED: Rs ${(expectedCTC / 100000).toFixed(1)} LPA
${flags.length ? 'NOTE: ' + flags.join('; ') + '.' : 'NOTE: Seeking to relocate closer to family.'}`;
  return {
    id: nextId('APP'), reqId, name: nm, location: loc, experienceYears: exp, currentEmployer: employer,
    noticePeriodDays: notice, currentCTC, expectedCTC,
    registrations: hasKNMC ? ['KNMC'] : [], certifications: [...(hasBLS ? ['BLS'] : []), ...(hasACLS ? ['ACLS'] : [])],
    certExpired: certExpired && hasBLS, skills, education: `${degree}, ${college}`,
    cvText: cv, stage, source: pick(SOURCES), appliedDate: daysAgo(int(3, 60)), flags,
  };
}

function corpCandidate(reqId, i, n, req) {
  const stage = stageFor(i, n, true);
  const exp = int(Math.max(0, req.minExperienceYears - 2), req.minExperienceYears + 6);
  const employer = pick(CORP_EMPLOYERS);
  const notice = pick([0, 15, 30, 30, 45, 60, 90]);
  const baseCTC = req.budgetMaxLPA * (0.55 + exp * 0.06);
  const currentCTC = lpa(baseCTC.toFixed(2));
  const expectedCTC = Math.round(currentCTC * (1.15 + rnd() * 0.4));
  const skillCount = int(1, req.keySkills.length);
  const skills = pickN(req.keySkills, skillCount);
  const hasPreferred = req.preferredCert ? chance(0.35) : false;
  const flags = [];
  if (chance(0.15)) flags.push(`Employment gap of ${int(2, 8)} months noted`);
  if (chance(0.15)) flags.push('Four employers in the last 4 years');
  if (expectedCTC > req.budgetMaxLPA * 100000 * 1.35) flags.push('Expected CTC well above the sanctioned band');
  const nm = name();
  const loc = pick(LOCATIONS);
  const degree = req.id === 'REQ-DEV-HIS' ? pick(['BTech Computer Science', 'BTech Information Technology', 'MCA', 'BSc Computer Science']) : pick(['BCom', 'BBA', 'MBA (Finance)', 'BA Economics', "Bachelor's degree"]);
  const cv = `${nm.toUpperCase()} | ${loc}, Kerala | ${exp} year${exp === 1 ? '' : 's'} experience
EDUCATION: ${degree}
EXPERIENCE:
- ${req.title.split(' – ')[0].split('(')[0].trim()}, ${employer} (${exp > 0 ? exp + ' yr' + (exp === 1 ? '' : 's') : 'Fresher'})
  Key work: ${skills.length ? skills.join(', ') : 'general operations, limited domain exposure'}
${chance(0.5) ? `- Prior role, ${pick(CORP_EMPLOYERS)} (${int(1, 3)} yrs)\n` : ''}${hasPreferred && req.preferredCert ? `CERTIFICATION: ${req.preferredCert}\n` : ''}NOTICE PERIOD: ${notice === 0 ? 'Immediate joiner' : notice + ' days'}
CURRENT CTC: Rs ${(currentCTC / 100000).toFixed(1)} LPA | EXPECTED: Rs ${(expectedCTC / 100000).toFixed(1)} LPA
${flags.length ? 'NOTE: ' + flags.join('; ') + '.' : 'NOTE: Actively interviewing; keen on hospital-sector stability.'}`;
  return {
    id: nextId('APP'), reqId, name: nm, location: loc, experienceYears: exp, currentEmployer: employer,
    noticePeriodDays: notice, currentCTC, expectedCTC, registrations: [], certifications: hasPreferred && req.preferredCert ? [req.preferredCert] : [],
    certExpired: false, skills, education: degree, cvText: cv, stage, source: pick(SOURCES), appliedDate: daysAgo(int(3, 60)), flags,
  };
}

const applicants = [];
requisitions.forEach(req => {
  const n = req.id === 'REQ-NUR-ICU' ? 18 : req.id === 'REQ-TPA-SR' ? 14 : req.id === 'REQ-DEV-HIS' ? 15 : 15;
  for (let i = 0; i < n; i++) {
    applicants.push(req.id === 'REQ-NUR-ICU' ? nurseCandidate(req.id, i, n) : corpCandidate(req.id, i, n, req));
  }
});

// days-to-shortlist for KPI: only for candidates that progressed past Applied/Screened
applicants.forEach(a => {
  if (['Shortlisted', 'Interview', 'Offer', 'Rejected'].includes(a.stage)) {
    a.daysToShortlist = int(3, 14);
  }
});

const out = { requisitions, applicants };
const json = JSON.stringify(out, null, 2);
writeFileSync(new URL('../../data/hr-screener.json', import.meta.url), json);
console.log(`Wrote data/hr-screener.json — ${requisitions.length} requisitions, ${applicants.length} applicants, ${(json.length / 1024).toFixed(1)} KB`);
