// Generates data/credential-tracker.json — synthetic HR credentialing register for the
// licence & credential tracker demo. Node, no dependencies. Seeded PRNG (mulberry32).
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
const rnd = mulberry32(20260928);
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const chance = p => rnd() < p;

const TODAY = new Date('2026-09-28T00:00:00Z');
const iso = d => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };

const FIRST_F = ['Anjali', 'Bincy', 'Chinnu', 'Divya', 'Elizabeth', 'Fathima', 'Greeshma', 'Hima', 'Indu', 'Jesna', 'Kavya', 'Lekshmi', 'Meera', 'Neethu', 'Parvathy', 'Reshma', 'Sherin', 'Teena', 'Uma', 'Vidya', 'Anju', 'Rincy', 'Soumya', 'Athira', 'Nimisha', 'Devika', 'Priya', 'Sruthi', 'Anita', 'Leena', 'Nisha', 'Rani', 'Sona', 'Tessy', 'Vinaya'];
const FIRST_M = ['Aravind', 'Basil', 'Christo', 'Dennis', 'Ebin', 'Franco', 'Gokul', 'Harish', 'Irfan', 'Jibin', 'Kiran', 'Libin', 'Manu', 'Nithin', 'Om', 'Pranav', 'Renjith', 'Sachin', 'Tibin', 'Varun', 'Akhil', 'Rohan', 'Sreejith', 'Vishnu', 'Anand', 'Deepak', 'Jose', 'Manoj', 'Rajesh', 'Sunil', 'Vinod', 'Abhilash', 'Nandan', 'Sandeep'];
const LAST = ['Mathew', 'Thomas', 'Nair', 'Menon', 'Pillai', 'Varghese', 'Jacob', 'Kurian', 'George', 'Joseph', 'Iqbal', 'Rahman', 'Krishnan', 'Suresh', 'Panicker', 'Chacko', 'Abraham', 'Sebastian', 'Rajan', 'Vincent', 'Antony', 'Xavier', 'Balan', 'Warrier', 'Iype', 'Mani', 'Das', 'Menon'];

const name = () => (chance(0.55) ? `${pick(FIRST_F)} ${pick(LAST)}` : `${pick(FIRST_M)} ${pick(LAST)}`);
const titledName = role => {
  const n = name();
  return (role === 'Consultant' || role === 'Resident') ? `Dr. ${n}` : n;
};

// ---------- department / role plan ----------
// each dept: { dept, roles: [{role, count}], acuity: 'acls'|'pals'|null, radiation: bool }
const DEPTS = [
  { dept: 'Cardiology', acuity: 'acls', roles: [['Consultant', 6], ['Resident', 4], ['Staff Nurse', 10], ['Nurse Manager', 1]] },
  { dept: 'Cath Lab', acuity: 'acls', radiation: true, roles: [['Consultant', 3], ['Staff Nurse', 5], ['Technician', 4]] },
  { dept: 'ICU / Critical Care', acuity: 'acls', roles: [['Consultant', 4], ['Resident', 5], ['Staff Nurse', 16], ['Nurse Manager', 2]] },
  { dept: 'Emergency', acuity: 'acls', roles: [['Consultant', 4], ['Resident', 4], ['Staff Nurse', 12], ['Nurse Manager', 1]] },
  { dept: 'Anaesthesia', acuity: 'acls', roles: [['Consultant', 5], ['Resident', 3]] },
  { dept: 'Nephrology & Transplant', acuity: 'acls', roles: [['Consultant', 3], ['Staff Nurse', 6]] },
  { dept: 'Neurology', acuity: 'acls', roles: [['Consultant', 3], ['Resident', 2], ['Staff Nurse', 5]] },
  { dept: 'General Medicine', acuity: 'acls', roles: [['Consultant', 4], ['Resident', 3], ['Staff Nurse', 10], ['Nurse Manager', 1]] },
  { dept: 'Oncology', acuity: 'acls', roles: [['Consultant', 3], ['Staff Nurse', 6]] },
  { dept: 'Paediatrics', acuity: 'pals', roles: [['Consultant', 3], ['Resident', 3], ['Staff Nurse', 8], ['Nurse Manager', 1]] },
  { dept: 'Orthopaedics', roles: [['Consultant', 4], ['Resident', 2], ['Staff Nurse', 5]] },
  { dept: 'OT Complex', roles: [['Staff Nurse', 8], ['Nurse Manager', 1], ['Technician', 6]] },
  { dept: 'Radiology', radiation: true, roles: [['Consultant', 2], ['Technician', 6]] },
  { dept: 'General Wards', roles: [['Staff Nurse', 10], ['Nurse Manager', 2]] },
  { dept: 'Pharmacy', roles: [['Pharmacist', 12]] },
  { dept: 'Physiotherapy', roles: [['Physiotherapist', 11]] },
  { dept: 'Laboratory & Diagnostics', roles: [['Technician', 9]] },
];

const REG_COUNCIL = {
  Consultant: 'Kerala Medical Council (KMC)', Resident: 'Kerala Medical Council (KMC)',
  'Staff Nurse': 'Kerala Nurses & Midwives Council (KNMC)', 'Nurse Manager': 'Kerala Nurses & Midwives Council (KNMC)',
  Pharmacist: 'Kerala Pharmacy Council', Technician: 'Travancore-Cochin Paramedical Council (TCMC)',
  Physiotherapist: 'Kerala State Physiotherapy Council',
};
const REG_ABBR = { Consultant: 'KMC', Resident: 'KMC', 'Staff Nurse': 'KNMC', 'Nurse Manager': 'KNMC', Pharmacist: 'KPC', Technician: 'TCMC', Physiotherapist: 'KSPC' };
const VALIDITY_YEARS = { reg: 5, bls: 2, acls: 2, pals: 2, fire: 1, radiation: 1, privileging: 1 };
const CRED_LABEL = { bls: 'BLS', acls: 'ACLS', pals: 'PALS', fire: 'Fire safety training', radiation: 'Radiation safety badge', privileging: 'Clinical privileging review' };

// Status bucket distribution across every credential instance we generate:
// ~8% expired, ~12% due <=30d, ~15% due <=90d, rest (65%) current.
function bucketDays() {
  const r = rnd();
  if (r < 0.08) return -int(3, 260); // expired
  if (r < 0.20) return int(1, 30); // due <=30d
  if (r < 0.35) return int(31, 90); // due <=90d
  return int(91, 700); // current, plenty of runway
}

function credential(key, empSeed) {
  const days = bucketDays();
  const expiry = addDays(TODAY, days);
  const validityDays = Math.round(VALIDITY_YEARS[key] * 365);
  const issue = addDays(expiry, -validityDays);
  return { key, label: CRED_LABEL[key], issue: iso(issue), expiry: iso(expiry) };
}
function regCredential(role) {
  const days = bucketDays();
  const expiry = addDays(TODAY, days);
  const issue = addDays(expiry, -Math.round(VALIDITY_YEARS.reg * 365));
  return { key: 'reg', label: `Professional registration — ${REG_ABBR[role]}`, council: REG_COUNCIL[role], issue: iso(issue), expiry: iso(expiry) };
}

let seq = 1;
const staff = [];
for (const d of DEPTS) {
  for (const [role, count] of d.roles) {
    for (let i = 0; i < count; i++) {
      const empId = `EMP-${String(seq).padStart(4, '0')}`; seq++;
      const creds = [];
      creds.push(regCredential(role));
      creds.push(credential('bls'));
      if (d.acuity === 'acls' && ['Consultant', 'Resident', 'Staff Nurse', 'Nurse Manager'].includes(role)) creds.push(credential('acls'));
      if (d.acuity === 'pals' && ['Consultant', 'Resident', 'Staff Nurse', 'Nurse Manager'].includes(role)) creds.push(credential('pals'));
      if (role === 'Consultant') creds.push(credential('privileging'));
      creds.push(credential('fire'));
      if (d.radiation && ['Consultant', 'Resident', 'Technician'].includes(role)) creds.push(credential('radiation'));
      staff.push({
        id: empId, name: titledName(role), dept: d.dept, role,
        yearsOfService: int(1, 18), phone: `+91 9${int(400000000, 899999999)}`,
        credentials: creds,
      });
    }
  }
}

const departments = DEPTS.map(d => d.dept);
const roles = ['Consultant', 'Resident', 'Staff Nurse', 'Nurse Manager', 'Technician', 'Pharmacist', 'Physiotherapist'];

const out = {
  today: iso(TODAY),
  departments,
  roles,
  credentialTypes: Object.keys(CRED_LABEL).length ? ['reg', 'bls', 'acls', 'pals', 'privileging', 'fire', 'radiation'] : [],
  staff,
};

writeFileSync(new URL('../../data/credential-tracker.json', import.meta.url), JSON.stringify(out));
console.log(`Wrote ${staff.length} staff, ${staff.reduce((a, s) => a + s.credentials.length, 0)} credential instances.`);
