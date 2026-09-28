// Generates data/contact-centre.json — synthetic call-centre/WhatsApp knowledge base
// and today's conversation queue for the "Call centre & WhatsApp agent" prototype
// (Patient Experience). Node, no deps, seeded. Run: node scripts/gen/contact-centre.mjs
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'contact-centre.json');
const TODAY = '2026-09-28'; // Monday

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
const pickW = list => { const total = list.reduce((s, x) => s + x.w, 0); let r = rng() * total; for (const x of list) { if ((r -= x.w) <= 0) return x.v; } return list[list.length - 1].v; };
const int = (a, b) => a + Math.floor(rng() * (b - a + 1));
const pad = n => String(n).padStart(2, '0');

/* ================= KNOWLEDGE BASE ================= */

const DEPTS = [
  { dept: 'Cardiology', timings: 'Mon–Sat 9:00 AM–1:00 PM & 4:00–7:00 PM' },
  { dept: 'Orthopaedics', timings: 'Mon–Sat 9:00 AM–12:30 PM & 4:30–7:00 PM' },
  { dept: 'Gastroenterology', timings: 'Mon–Sat 10:00 AM–1:00 PM' },
  { dept: 'Nephrology', timings: 'Mon, Wed, Fri 10:00 AM–1:00 PM' },
  { dept: 'Neurology', timings: 'Mon–Sat 9:30 AM–12:30 PM' },
  { dept: 'General Medicine', timings: 'Mon–Sat 8:00 AM–7:00 PM (walk-in)' },
  { dept: 'ENT', timings: 'Mon–Sat 10:00 AM–1:00 PM & 5:00–7:00 PM' },
  { dept: 'Gynaecology', timings: 'Mon–Sat 9:00 AM–1:00 PM' },
  { dept: 'Urology', timings: 'Tue, Thu, Sat 10:00 AM–1:00 PM' },
  { dept: 'Paediatrics', timings: 'Mon–Sat 9:00 AM–1:00 PM & 4:00–6:30 PM' },
  { dept: 'Dermatology', timings: 'Mon–Sat 11:00 AM–2:00 PM' },
  { dept: 'Pulmonology', timings: 'Mon, Wed, Fri 4:00–7:00 PM' },
  { dept: 'Endocrinology', timings: 'Tue, Thu, Sat 9:00 AM–12:00 PM' },
];

const DOCTOR_NAMES = ['Dr. Anjali Nair', 'Dr. Priya Varghese', 'Dr. Anil Menon', 'Dr. Sunil Pillai', 'Dr. Reshma Thomas',
  'Dr. Vijay Kurup', 'Dr. Susan Koshy', 'Dr. Rahul Varkey', 'Dr. Deepa Rasheed', 'Dr. Manoj Panicker',
  'Dr. Lakshmi Iyer', 'Dr. George Mathew', 'Dr. Fathima Beevi', 'Dr. Arun Chandy', 'Dr. Meera Krishnan',
  'Dr. Sajan Jacob', 'Dr. Bindu Raghavan', 'Dr. Naveen Balan', 'Dr. Teena Sebastian', 'Dr. Ratheesh Kumar',
  'Dr. Nisha Abraham', 'Dr. Arjun Pillai', 'Dr. Shalini Warrier', 'Dr. Joseph Alex', 'Dr. Kavya Suresh'];
const DAY_PATTERNS = ['Mon/Wed/Fri', 'Tue/Thu/Sat', 'Mon–Sat', 'Mon/Tue/Thu', 'Wed/Fri/Sat'];
const doctors = DOCTOR_NAMES.map((name, i) => {
  const d = DEPTS[i % DEPTS.length];
  return {
    id: `DR-${pad(i + 1)}`, name, dept: d.dept,
    days: pick(DAY_PATTERNS),
    timings: pick(['9:00–12:30', '10:00–1:00', '4:00–7:00', '9:30–1:00', '5:00–7:30']),
    interest: pick(['general OPD', 'interventional cases', 'diabetic care', 'preventive checks', 'second opinions', 'follow-up reviews']),
  };
});

const PREP = {
  usg: { title: 'USG (ultrasound) abdomen preparation', source: 'Radiology prep sheet, v4',
    text: '6-hour fasting required before the scan; drink 4–5 glasses of water starting 1 hour before the appointment and do not urinate, so the bladder is full for the scan. No fasting needed for a pregnancy (obstetric) USG.' },
  ct: { title: 'CT scan preparation', source: 'Radiology prep sheet, v4',
    text: '4-hour fasting required only if contrast dye is used; plain CT (no contrast) needs no fasting. Inform the desk in advance if the patient is allergic to iodine or contrast dye, or has kidney disease.' },
  mri: { title: 'MRI preparation', source: 'Radiology prep sheet, v4',
    text: 'No fasting needed for most MRI scans (4-hour fasting only for MRCP/abdomen with contrast). Remove all metal objects, jewellery and hearing aids; inform the desk of any implants, pacemaker or history of metal fragments before the scan.' },
  endoscopy: { title: 'Upper GI endoscopy preparation', source: 'Gastroenterology prep sheet, v3',
    text: '8-hour fasting required (no food or water). Blood thinners should be stopped 3 days prior, only on the treating doctor\'s written advice — never stop medication on the patient\'s own decision. Arrange someone to accompany the patient home if sedation is used.' },
  tmt: { title: 'TMT (treadmill stress test) preparation', source: 'Cardiology prep sheet, v2',
    text: 'Light breakfast is fine 2 hours before the test; avoid caffeine and smoking for 4 hours prior. Wear comfortable clothes and walking shoes; bring the referring doctor\'s prescription and any recent ECG.' },
};

const PACKAGES = [
  { id: 'PKG-01', name: 'Basic health check', priceInr: 2500, includes: 'CBC, blood sugar, lipid profile, urine routine, ECG, consultation', prep: 'usg' },
  { id: 'PKG-02', name: 'Executive health check', priceInr: 6500, includes: 'Basic panel + USG abdomen, chest X-ray, thyroid profile, liver & kidney function, consultation', prep: 'usg' },
  { id: 'PKG-03', name: 'Senior citizen package', priceInr: 5500, includes: 'Basic panel + bone density screen, vitamin D & B12, ECG, ophthalmology check, consultation', prep: null },
  { id: 'PKG-04', name: 'Cardiac advanced package', priceInr: 9500, includes: 'Lipid profile, ECG, 2D echo, TMT, cardiology consultation', prep: 'tmt' },
  { id: 'PKG-05', name: "Women's wellness package", priceInr: 7200, includes: 'Basic panel + mammogram, pap smear, pelvic USG, gynaecology consultation', prep: 'usg' },
  { id: 'PKG-06', name: 'Diabetic care package', priceInr: 4200, includes: 'HbA1c, fasting & PP sugar, kidney function, eye screening, dietician consult', prep: null },
];

const TPA_LIST = ['Suraksha TPA', 'MedAssure TPA Services', 'CareLink Health TPA', 'Sanjeevani TPA', 'TrustHealth TPA',
  'Wellcare Insurance TPA', 'Amrutha Mediclaim TPA', 'Paramount Health TPA', 'Universal Health Assurance TPA',
  'Kerala Mediclaim TPA', 'Raksha Health TPA', 'Vidyut Health TPA', 'Star Assist TPA', 'MDCare TPA',
  'Family Shield TPA', 'Nova Health TPA'];

const KB_GENERAL = {
  opdReg: { title: 'OPD registration timings', source: 'Front office SOP', text: 'OPD registration Mon–Sat 8:00 AM–7:00 PM, Sunday 9:00 AM–1:00 PM. Emergency department is open 24x7, every day including Sundays and holidays.' },
  parking: { title: 'Parking', source: 'Facilities notice board', text: 'Basement parking plus an open lot near the main gate; first 30 minutes free, ₹20/hour after that. Valet parking is available at the main entrance for a flat ₹50.' },
  visiting: { title: 'Visiting hours', source: 'Nursing station notice', text: 'General wards: 11:00 AM–12:30 PM and 5:00–6:30 PM, maximum two visitors at a time. ICU: 12:30–1:00 PM and 6:00–6:30 PM only, one visitor, on the treating doctor\'s clearance.' },
  reports: { title: 'Report turnaround time', source: 'Lab & radiology SOP', text: 'Routine lab reports: 4–6 hours, available on the patient portal and app. Specialised/send-out tests: next working day. X-ray/USG/CT/MRI reports: within 24 hours; urgent scans are reported same-day on request.' },
  billing: { title: 'Billing desk hours & process', source: 'Billing SOP', text: 'Billing counters: Mon–Sat 8:00 AM–8:00 PM, Sunday 9:00 AM–2:00 PM. Cashless (TPA) claims: pre-authorisation typically takes 2–4 hours after documents are submitted; final discharge bill is ready within 2 hours of doctor\'s discharge order.' },
  directions: { title: 'Directions to the hospital', source: 'Front office SOP', text: 'VPS Lakeshore Hospital, NH Bypass, Maradu, Kochi — nearest landmark is the Maradu bridge, 400m from the NH Bypass junction. From Kochi airport: approx. 45 minutes via NH66. From Ernakulam Junction railway station: approx. 25 minutes.' },
  erNumber: { title: 'Emergency (ER) number', source: 'Front office SOP', text: 'Emergency line: 0484-2701-234, staffed 24x7. For any chest pain, breathlessness, stroke symptoms, severe bleeding or accident, call this number or come directly to the Emergency entrance — do not wait for an OPD appointment.' },
};

/* ---------- slot availability, next 5 days ---------- */
const SLOT_TIMES = ['9:00', '9:30', '10:00', '10:30', '11:00', '4:00', '4:30', '5:00'];
const SLOT_DEPTS = ['Cardiology', 'Orthopaedics', 'Gastroenterology', 'General Medicine', 'Gynaecology', 'Paediatrics'];
function addDays(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
const slots = [];
for (let day = 0; day < 5; day++) {
  const date = addDays(TODAY, day);
  for (const dept of SLOT_DEPTS) {
    const n = int(3, 6);
    const times = [];
    const used = new Set();
    for (let k = 0; k < n; k++) {
      let t; do { t = pick(SLOT_TIMES); } while (used.has(t)); used.add(t);
      times.push({ time: t, available: int(1, 4) });
    }
    slots.push({ date, dept, times: times.sort((a, b) => a.time.localeCompare(b.time)) });
  }
}

/* ---------- flattened searchable KB table ---------- */
const kbEntries = [];
let kid = 0;
const addKb = (category, title, detail, source) => kbEntries.push({ id: `KB-${pad(++kid)}`, category, title, detail, source });
DEPTS.forEach(d => addKb('OPD timings', d.dept, d.timings, 'OPD schedule board'));
doctors.forEach(d => addKb('Doctor schedule', `${d.name} — ${d.dept}`, `${d.days}, ${d.timings} · focus: ${d.interest}`, 'Consultant roster'));
Object.values(PREP).forEach(p => addKb('Procedure prep', p.title, p.text, p.source));
PACKAGES.forEach(p => addKb('Health check package', p.name, `₹${p.priceInr.toLocaleString('en-IN')} — includes ${p.includes}`, 'Health check price list'));
Object.values(KB_GENERAL).forEach(g => addKb('General info', g.title, g.text, g.source));
addKb('Insurance (TPA)', 'Cashless TPA list', TPA_LIST.join(', '), 'Insurance desk TPA list, current');

/* ================= CONVERSATIONS ================= */

const INTENTS = ['Appointment booking', 'Reschedule', 'Report status', 'Package price', 'Directions', 'Bill query', 'Complaint'];
const PATIENTS = ['Anoop Varma', 'Fathima Rasheed', 'Rahul Menon', 'Sarah Thomas', 'Vishnu Pillai', 'Ayesha Khan',
  'Manoj Kurian', 'Nimmy Jacob', 'Jaseem Basheer', 'Divya Nair', 'Salim Ismail', 'Teena George', 'Arjun Balan',
  'Rincy Abraham', 'Faisal Rahim', 'Meera Suresh', 'Bindu Chandran', 'Noufal Latheef', 'Sreeja Kumari', 'Aleena Sabu',
  'Prakash Iyer', 'Reshma Salim', 'Vinod Panicker', 'Sania Firoz', 'Anu Mathew', 'Kiran Raj', 'Leyah Varghese',
  'Sudheer Kartha', 'Farha Nizar', 'Cibi Thankachan'];

const LANGS = [{ v: 'English', w: 40 }, { v: 'Malayalam', w: 20 }, { v: 'Manglish', w: 40 }];
const CHANNELS = [{ v: 'WhatsApp', w: 65 }, { v: 'Phone', w: 35 }];

// message templates by intent + language; {dept}/{doc}/{time}/{pkg} filled in
const MSG = {
  'Appointment booking': {
    English: ['Hi, I need to book an appointment with {dept} this week, is there a slot available?', 'Can I get an appointment with a {dept} specialist soon, preferably morning?'],
    Manglish: ['Hi, {dept}il oru appointment venam ee week, slot undo?', 'enikku {dept} doctor kaanan appointment venam, morning slot undenkil parayamo'],
    Malayalam: ['ഹലോ, {dept} ഡിപ്പാർട്ട്മെന്റിൽ ഈ ആഴ്ച ഒരു അപ്പോയിന്റ്മെന്റ് വേണം, സ്ലോട്ട് ഉണ്ടോ?'],
  },
  'Reschedule': {
    English: ['I had an appointment with {dept} on {time} but need to reschedule, is that possible?', 'Need to postpone my {dept} appointment to a later slot this week.'],
    Manglish: ['ente {dept} appointment {time}nu undayirunnu, reschedule cheyyan pattumo?', 'appointment maattenam next week aayirikkumo, doctor busy anu ee week'],
    Malayalam: ['എന്റെ {dept} അപ്പോയിന്റ്മെന്റ് മാറ്റണം, അടുത്ത ആഴ്ചയിലേക്ക് ആക്കാമോ?'],
  },
  'Report status': {
    English: ['I did a scan two days back, has the report come? Haven\'t received anything on the portal.', 'When will my blood test results be ready, it\'s been almost a day.'],
    Manglish: ['scan cheythittu 2 divasam aayi, report vannille? portal-il onnum kaanunnilla', 'blood test result eppo varum, innale aanu edutthe'],
    Malayalam: ['സ്കാൻ ചെയ്തിട്ട് രണ്ട് ദിവസമായി, റിപ്പോർട്ട് വന്നോ? പോർട്ടലിൽ ഒന്നും കാണുന്നില്ല'],
  },
  'Package price': {
    English: ['What is the price of the {pkg}? Does it include consultation?', 'Can you tell me the cost and what all tests are there in the {pkg}?'],
    Manglish: ['{pkg} price ethra aanu? consultation include aano', '{pkg}il enthokke tests undu, price parayamo'],
    Malayalam: ['{pkg} വില എത്രയാണ്? ഏതൊക്കെ ടെസ്റ്റുകൾ ഉൾപ്പെടും?'],
  },
  'Directions': {
    English: ['Can you send directions to the hospital from Ernakulam junction? Also is parking available?', 'How do I reach VPS Lakeshore from the airport, and is there valet parking?'],
    Manglish: ['hospital ethu vazhikku varam Ernakulam junction ninnu? parking undo athil', 'airport ninnu ethra time aavum hospital ethaan, valet undo'],
    Malayalam: ['ഹോസ്പിറ്റലിലേക്ക് വരാൻ വഴി പറയാമോ? പാർക്കിംഗ് ഉണ്ടോ?'],
  },
  'Bill query': {
    English: ['My discharge bill has some extra charges I don\'t understand, can someone explain?', 'How long does cashless TPA approval usually take? We are waiting since morning.'],
    Manglish: ['bill-il oru extra charge kaanunnu, ithinte explanation venam', 'TPA cashless approval eppo varum, morning muthal wait cheyyunnu'],
    Malayalam: ['ബില്ലിൽ ചില എക്സ്ട്രാ ചാർജുകൾ കാണുന്നു, വിശദീകരണം വേണം'],
  },
  'Complaint': {
    English: ['I am extremely unhappy — we have been waiting for over 3 hours with no update from anyone, this is unacceptable for a hospital of this reputation.', 'Very disappointed with today\'s experience, nobody at the front desk was willing to help us and we were sent from counter to counter.'],
    Manglish: ['valare disappointed aanu, 3 mani kootyaayi wait cheyyunnu ninnu ninnu, arum onnum update cheyyunnilla', 'staff okke rude aayirunnu ee counter-il, ee kind of service accept cheyyan pattilla'],
    Malayalam: ['ഇന്ന് വളരെ മോശം അനുഭവം ആയിരുന്നു, മൂന്ന് മണിക്കൂർ കാത്തിരുന്നിട്ടും ആരും ഒന്നും പറഞ്ഞില്ല'],
  },
};

const URGENT_MSG = {
  English: 'My father is having severe chest pain and sweating heavily right now, what should we do??',
  Manglish: 'appante nenjuvedana kooduthal aanu ippo, viyarkkunnundu, enthu cheyyanam pettannu parayamo',
};
const MEDADVICE_MSG = {
  English: 'I have been having a mild fever and body ache for two days, can you tell me which tablet I should take and the dosage?',
  Manglish: 'randu divasam aayi mild fever undu body pain-um, ethu tablet edukkanam ennu parayamo dosage-um',
};

function fillTpl(tpl, ctx) {
  return tpl.replace(/\{dept\}/g, ctx.dept || '').replace(/\{time\}/g, ctx.time || '').replace(/\{pkg\}/g, ctx.pkg || '');
}

function pickDept() { return pick(SLOT_DEPTS); }
function pickPkg() { return pick(PACKAGES).name; }

const conversations = [];
let convId = 0;
function newId() { return `CC-${pad(++convId)}`; }

function makeTime(idx, total) {
  // spread across today's working hours 8:00–20:00
  const startMin = 8 * 60, endMin = 20 * 60;
  const m = Math.round(startMin + (endMin - startMin) * (idx / total) + int(-15, 15));
  const hh = Math.floor(m / 60), mm = m % 60;
  return `${pad(Math.max(8, Math.min(20, hh)))}:${pad(Math.max(0, Math.min(59, mm)))}`;
}

function buildTranscript(intent, lang, ctx, resolved) {
  const bank = MSG[intent][lang] || MSG[intent].English;
  const patientMsg = fillTpl(pick(bank), ctx);
  const msgs = [];
  if (rng() < 0.4) msgs.push({ role: 'patient', text: pick(['Hi', 'Hello', 'namaskaram', 'Good morning']) });
  msgs.push({ role: 'patient', text: patientMsg });
  if (resolved) {
    msgs.push({ role: 'agent', text: pick([
      'Thank you for reaching out — here are the details you asked for. Let us know if you need anything else.',
      'Noted, and this has been arranged. Please reach out again if there is any issue.',
      'Confirmed on our end — you will get a message shortly with the details.',
    ]) });
  }
  return msgs;
}

const AGENT_NAMES = ['Ashwin', 'Divya', 'Renjith', 'Sneha', 'Kiran'];

const plan = [];
// 14 appointment booking, 8 reschedule, 8 report status, 8 package price, 6 directions, 8 bill query, 4 complaint (general)
const counts = { 'Appointment booking': 15, 'Reschedule': 8, 'Report status': 8, 'Package price': 8, 'Directions': 6, 'Bill query': 8, 'Complaint': 4 };
Object.entries(counts).forEach(([intent, n]) => { for (let i = 0; i < n; i++) plan.push(intent); });
const TOTAL_NORMAL = plan.length; // 57
const TOTAL = TOTAL_NORMAL + 3; // + urgent, angry complaint, medical advice

plan.forEach((intent, i) => {
  const lang = pickW(LANGS);
  const channel = pickW(CHANNELS);
  const patient = pick(PATIENTS);
  const dept = pickDept();
  const pkg = pickPkg();
  const time = makeTime(i, TOTAL);
  const ctx = { dept, pkg, time: pick(['9:00 AM', '10:30 AM', '4:00 PM', '5:30 PM']) };
  // resolution mix: bot handling / needs agent / resolved
  const statusRoll = rng();
  const isComplaint = intent === 'Complaint';
  const status = isComplaint ? 'Needs agent' : (statusRoll < 0.4 ? 'Resolved' : statusRoll < 0.75 ? 'Bot handling' : 'Needs agent');
  const messages = buildTranscript(intent, lang, ctx, status === 'Resolved');
  const waitingMinutes = status === 'Resolved' ? 0 : (status === 'Needs agent' ? int(20, 190) : int(0, 12));
  const escalation = { flag: isComplaint, reason: isComplaint ? 'Angry/dissatisfied patient — needs a human apology and service-recovery follow-up, not a bot reply.' : null };
  let suggestedSlot = null;
  if (intent === 'Appointment booking' || intent === 'Reschedule') {
    const daySlot = slots.find(s => s.dept === dept && s.date === TODAY) || slots.find(s => s.dept === dept);
    const t = daySlot.times.find(x => x.available > 0);
    if (t) suggestedSlot = { date: daySlot.date, dept, time: t.time };
  }
  conversations.push({
    id: newId(), channel, time, patient, language: lang, status, intent, waitingMinutes,
    escalation, dept, pkg: intent === 'Package price' ? pkg : null, messages, suggestedSlot,
    agent: status === 'Resolved' ? pick(AGENT_NAMES) : null,
  });
});

// the three required singleton scenarios
function pushSingleton(intent, lang, text, escalationReason, dept) {
  const time = makeTime(TOTAL_NORMAL + conversations.length - TOTAL_NORMAL, TOTAL);
  conversations.push({
    id: newId(), channel: pickW(CHANNELS), time, patient: pick(PATIENTS), language: lang, status: 'Needs agent', intent,
    waitingMinutes: int(1, 8), escalation: { flag: true, reason: escalationReason }, dept: dept || null, pkg: null,
    messages: [{ role: 'patient', text }], suggestedSlot: null, agent: null,
  });
}
pushSingleton('Urgent — chest pain', 'English', URGENT_MSG.English, 'Red-flag symptom (chest pain + sweating) — possible acute cardiac event. Bot must never answer clinically; route to Emergency immediately.', 'Cardiology');
pushSingleton('Complaint', 'Manglish', 'ivide ulla service ee kondu enikku ippo vare kandittulla worst experience aanu, arum onnum ceyyunnilla, refund venam ini!!', 'Angry, dissatisfied patient threatening to escalate — needs immediate human callback from the duty manager, not a bot reply.', null);
pushSingleton('Medical advice (escalate)', 'Manglish', MEDADVICE_MSG.Manglish, 'Patient is asking for a specific medicine name and dosage — this is a clinical/prescription question. The bot must never prescribe or suggest medication; route to a nurse callback or OPD consult.', null);

// shuffle lightly by interleaving so escalations aren't all at the end, but keep ids stable
conversations.sort((a, b) => a.time.localeCompare(b.time));

const out = {
  generatedAt: TODAY, today: TODAY, erNumber: KB_GENERAL.erNumber.text,
  opd: DEPTS, doctors, prep: PREP, packages: PACKAGES, tpaList: TPA_LIST, general: KB_GENERAL,
  slots, kbEntries, conversations,
};
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`Wrote ${conversations.length} conversations, ${kbEntries.length} KB entries, ${doctors.length} doctors, ${slots.length} slot-rows to ${OUT}`);
