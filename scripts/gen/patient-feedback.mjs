// Generates data/patient-feedback.json — synthetic patient feedback for the
// "Feedback intelligence" prototype (Patient Experience). Node, no deps, seeded.
// Run: node scripts/gen/patient-feedback.mjs
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'patient-feedback.json');
const TODAY = new Date('2026-09-27T00:00:00Z');
const WEEKS = 8;
const N = 300;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260927);
const pick = arr => arr[Math.floor(rng() * arr.length)];
const pickW = list => { // list: [{v, w}]
  const total = list.reduce((s, x) => s + x.w, 0);
  let r = rng() * total;
  for (const x of list) { if ((r -= x.w) <= 0) return x.v; }
  return list[list.length - 1].v;
};
const int = (a, b) => a + Math.floor(rng() * (b - a + 1));

/* ---------- name / detail pools (all fictional) ---------- */
const NURSES = ['Sister Anitha', 'Sister Deepa', 'Sister Reshma', 'Sister Litty', 'Sister Bincy', 'Sister Ancy', 'Sister Jaseela', 'Sister Soumya'];
const DOCTORS = ['Dr. Menon', 'Dr. Nair', 'Dr. Varkey', 'Dr. Thomas', 'Dr. Pillai', 'Dr. Rasheed', 'Dr. Susan Koshy'];
const PATIENTS = ['Anoop', 'Fathima', 'Rahul', 'Sarah', 'Vishnu', 'Ayesha', 'Manoj', 'Nimmy', 'Jaseem', 'Divya', 'Salim', 'Teena', 'Arjun', 'Rincy', 'Faisal', 'Meera'];
const INTL_PLACES = ['Male', 'Hulhumale', 'Addu', 'Muscat', 'Doha', 'Dar es Salaam', 'Nairobi', 'Dubai'];
const FLOORS = ['2nd floor', '3rd floor', 'ground floor', '4th floor'];
const WARDS = ['Cardiology ward', 'Ortho ward', 'General ward', 'ICU', 'Surgery ward', 'Maternity ward'];
const SOURCES = [
  { v: 'Google review', w: 32 },
  { v: 'IP discharge form', w: 20 },
  { v: 'OP kiosk', w: 20 },
  { v: 'WhatsApp', w: 15 },
  { v: 'International patient email', w: 13 },
];

/* ---------- themes ---------- */
// Weights are tuned so the overall average rating lands in a realistic ~3.7-4.0 band
// (mostly satisfied patients, with enough of the four SLA-tracked themes for a live queue).
const THEMES = [
  { key: 'radiology-wait', label: 'Radiology wait times', dept: 'Radiology', weight: 4, sentiment: 'negative' },
  { key: 'billing-delay', label: 'Discharge billing delay', dept: 'Billing & discharge', weight: 5, sentiment: 'negative' },
  { key: 'tpa-delay', label: 'TPA / insurance approval delay', dept: 'Insurance desk (TPA)', weight: 5, sentiment: 'negative' },
  { key: 'parking', label: 'Parking availability', dept: 'Facilities', weight: 2, sentiment: 'negative' },
  { key: 'lift-wait', label: 'Lift waiting time', dept: 'Facilities', weight: 2, sentiment: 'negative' },
  { key: 'food-temp', label: 'Food temperature / quality', dept: 'Dietetics & catering', weight: 7, sentiment: 'mixed' },
  { key: 'nursing-praise', label: 'Nursing care (praise)', dept: 'Nursing', weight: 44, sentiment: 'positive' },
  { key: 'doctor-praise', label: 'Doctor consult (praise)', dept: 'Medical / clinical', weight: 26, sentiment: 'positive' },
  { key: 'intl-coordination', label: 'International patient coordination', dept: 'International patient desk', weight: 5, sentiment: 'mixed' },
  { key: 'front-desk-queue', label: 'Front desk / OP queue', dept: 'Front office / OP', weight: 4, sentiment: 'negative' },
  { key: 'housekeeping', label: 'Housekeeping', dept: 'Housekeeping', weight: 4, sentiment: 'mixed' },
  { key: 'communication-updates', label: 'Family communication during wait', dept: 'Nursing / ward', weight: 1, sentiment: 'negative' },
];
const THEME_BY_KEY = Object.fromEntries(THEMES.map(t => [t.key, t]));

const URGENT_THEMES = new Set(['radiology-wait', 'billing-delay', 'tpa-delay', 'front-desk-queue']);

/* ---------- text templates per theme; {n} placeholders filled below ---------- */
const T = {
  'radiology-wait': [
    'My {rel} from {place} was made to wait almost {h} hours for ultrasound with full bladder as instructed by staff. Very uncomfortable, nobody updated us on the delay. Doctors were fine but the wait was too much.',
    'Waited {h} hrs for CT scan on {floor}, was told to keep bladder full whole time. Nobody came to explain why it was taking so long. Please improve scheduling for international patients, we had a flight to catch.',
    'Radiology slot given was {time} but scan happened almost {h} hours late. My wife was in a lot of discomfort waiting with full bladder as instructed. Second time this has happened here.',
    'X-ray department is always crowded in the morning. Waited over {h} hour past appointment time, staff was polite but nobody explained the queue.',
    'Booked ultrasound for {time}, actual scan was {h} hours after. This is very difficult for elderly patients who are asked to hold water beforehand. Kindly look into this.',
  ],
  'billing-delay': [
    'Billing team took more than {h} hours to finalise discharge summary and final bill after doctor said we can go home. Overall stay was ok but discharge process needs improvement.',
    'Billing counter at discharge is a mess, no proper queue system, had to wait {h} min after doctor cleared discharge. Staff were polite but process is broken.',
    'Discharge was approved by doctor at {time} but final bill copy was ready only {h} hours later. Had to keep calling billing desk, nobody proactively updated us.',
    'Please streamline discharge billing. We were told 30 min but ended up waiting {h} hours with a tired patient in the room, other family members had to leave for work.',
    'Bill had some duplicate charges which took {h} hours to sort out at discharge. Staff resolved it eventually but this delay could be avoided with better checking beforehand.',
  ],
  'tpa-delay': [
    'TPA approval for my cashless surgery got delayed by almost {h} hours, insurance desk kept saying documents pending but nobody called to say what exactly was missing. Very stressful before surgery.',
    'Insurance pre-auth for my {rel}\'s procedure took {h} hours longer than promised. Please have someone call the family proactively instead of us following up every hour.',
    'Cashless approval process needs work — {h} hours wait and finally had to arrange cash deposit as backup. TPA desk was helpful once we reached them but too hard to reach.',
    'Was told TPA approval usually takes 2 hours, ours took {h}. No update given, we found out only when we asked at the counter directly.',
    'Insurance desk staff is courteous but understaffed in the evenings — my claim query sat pending for {h} hours before anyone picked it up.',
  ],
  'parking': [
    'Parking issue again today. Waited {h}0 min to find parking, valet not available at OP block. This happens almost every time we come for follow up. Please fix.',
    'No parking space near OP block after 10am, had to park far and walk with an elderly patient. Valet counter was unmanned.',
    'Parking is the one thing that needs urgent attention — spent {h}0 minutes circling before finding a spot. Everything else about the visit was fine.',
    'Visitor parking always full by mid-morning. Suggest a token system or overflow lot, current situation is frustrating for follow-up visits.',
  ],
  'lift-wait': [
    'Lift waiting time on {floor} OP block is too much, especially mornings 9-11am. Elderly patients struggling to stand and wait. One lift was out of service for almost a week.',
    'Only one lift working in the OP block today, wait was easily {h} minutes. Please fix the second lift, patients with mobility issues are really affected.',
    'Lift near {ward} was very slow, we waited close to {h}0 min with a wheelchair patient. Staff helped where they could but the lift itself needs servicing.',
  ],
  'food-temp': [
    'Food quality was decent, could be less spicy for post-surgery patients. Housekeeping was prompt. Nursing care was very good throughout.',
    'Food served in {ward} was cold by the time it reached the room, especially dinner. Taste was fine, just needs to be served hot.',
    'Diet food for diabetic patients was repetitive — same items most days. Please vary the menu a bit, otherwise care was good.',
    'Breakfast came almost an hour late two days in a row in {ward}. Rest of the stay was comfortable.',
    'Food temperature is an issue by the time it reaches upper floors, tray covers help but not enough. Suggest hot-case trolleys.',
  ],
  'nursing-praise': [
    'Excellent care from the nursing staff in {ward}, especially {nurse}. She explained everything patiently and checked on my {rel} every 2 hours. Doctors also very good.',
    '{nurse} and the {ward} team were wonderful, always ready to help and explained medication timings clearly. Made a stressful time much easier.',
    'ICU team took amazing care of my {rel} post surgery. Constant updates given to family by {nurse}, very approachable. Grateful to the entire team.',
    'Nursing staff, especially {nurse}, went out of their way to make my {rel} comfortable. Checked vitals on time every single round.',
    'Genuinely impressed with the nursing care in {ward}. {nurse} was kind and patient even at 2am when we had questions.',
  ],
  'doctor-praise': [
    'Robotic surgery team and {doctor} were excellent, explained the whole procedure clearly beforehand. Recovery was smooth. Highly recommend.',
    '{doctor} was very thorough during consult, answered all our questions without rushing. Best experience we have had at any hospital.',
    'Consult with {doctor} was detailed and reassuring, explained the reports line by line. Front desk coordination was smooth too.',
    'Grateful to {doctor} and team for the care during my {rel}\'s cardiac procedure. Clear communication at every step.',
  ],
  'intl-coordination': [
    'Coordinator was helpful with visa letter but currency exchange guidance given was outdated, we had confusion at the bank. Also food options for our diet were limited.',
    'We travelled from {place} for my {rel}\'s consult, the OP appointment got pushed by 90 minutes without any message to us, we were already worried about flight timing. Doctor consult itself was good and thorough.',
    'International patient desk was responsive over email before arrival, but on the ground the same information was not passed to the ward staff, we had to repeat everything.',
    'Overall treatment for my consultation was good, doctor was patient with our questions. Coordination between OP and lab could be smoother, we had to explain our case twice.',
    'Visa support letter took longer than promised, almost {h} days, which delayed our travel booking from {place}. Please speed this up for international patients.',
  ],
  'front-desk-queue': [
    'OP kiosk queue was very long today, token system not working properly, had to ask staff manually which slowed things further.',
    'Front desk had only one counter open during peak hour, waited {h}0 minutes just to register. Please open more counters 9-11am.',
    'Registration kiosk froze twice while I was entering details, had to start over. Staff helped but the machine itself needs maintenance.',
    'Appointment was at {time} but token was called almost {h} hours later, no announcement of the delay at the front desk.',
  ],
  'housekeeping': [
    'Room was clean, AC working fine. Only issue was housekeeping came very early morning 5:30am to clean when patient was sleeping. Otherwise fine stay.',
    'Housekeeping was prompt whenever called, but washroom in {ward} could use more frequent checks during the day.',
    'Room cleaning was good overall, small request — please avoid strong-smelling cleaning agents right after meals.',
  ],
  'communication-updates': [
    'Ultrasound department made my {rel} wait with full bladder for over an hour past the slot time, she was in a lot of discomfort. Nobody came to update the family waiting outside.',
    'During my {rel}\'s procedure we were not given any update for {h} hours, had to keep going to the nursing station ourselves to ask.',
    'Would help a lot if the ward gave periodic updates to waiting family during long procedures — we were anxious with no news for hours.',
  ],
};

const SLA_TEXT = {
  'radiology-wait': dept => `${dept} — call the patient within 2 hours; review morning slot spacing at the next huddle`,
  'billing-delay': dept => `${dept} — send revised bill and apology call within 3 hours; flag for TAT review`,
  'tpa-delay': dept => `${dept} — insurance desk to call patient within 2 hours with a status update`,
  'front-desk-queue': dept => `${dept} — duty manager to open a second counter within 1 hour at peak times`,
};

function fill(tpl) {
  return tpl
    .replace(/\{h\}/g, () => String(int(1, 6)))
    .replace(/\{rel\}/g, () => pick(['mother', 'father', 'wife', 'husband', 'son', 'daughter', 'grandfather', 'grandmother']))
    .replace(/\{place\}/g, () => pick(INTL_PLACES))
    .replace(/\{floor\}/g, () => pick(FLOORS))
    .replace(/\{ward\}/g, () => pick(WARDS))
    .replace(/\{time\}/g, () => `${int(8, 17)}:${pick(['00', '15', '30', '45'])}`)
    .replace(/\{nurse\}/g, () => pick(NURSES))
    .replace(/\{doctor\}/g, () => pick(DOCTORS));
}

function ratingFor(sentiment) {
  if (sentiment === 'negative') return pickW([{ v: 1, w: 45 }, { v: 2, w: 55 }]);
  if (sentiment === 'positive') return pickW([{ v: 4, w: 35 }, { v: 5, w: 65 }]);
  return pickW([{ v: 2, w: 15 }, { v: 3, w: 55 }, { v: 4, w: 30 }]); // mixed
}

function dateInWindow() {
  const daysAgo = int(0, WEEKS * 7 - 1);
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function maskedContact(i) {
  const kind = pick(['phone', 'phone', 'email']);
  if (kind === 'phone') return `Mobile on file · +91 9${int(1, 9)}${int(1, 9)}xxx-xx${String((100 + i) % 900).padStart(3, '0')}`;
  return `Email on file · p.${1000 + i}@mailmask.example`;
}

const items = [];
for (let i = 0; i < N; i++) {
  const theme = pickW(THEMES.map(t => ({ v: t, w: t.weight })));
  const text = fill(pick(T[theme.key]));
  const rating = ratingFor(theme.sentiment);
  const source = pickW(SOURCES);
  const id = `FB-${String(i + 1).padStart(4, '0')}`;
  const urgentEligible = URGENT_THEMES.has(theme.key) && rating <= 2;
  const urgent = urgentEligible && rng() < 0.7;
  items.push({
    id,
    date: dateInWindow(),
    source,
    rating,
    department: theme.dept,
    text,
    themes: [theme.key],
    sentiment: theme.sentiment === 'mixed' ? (rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral') : theme.sentiment,
    urgent,
    patient: pick(PATIENTS),
    contact: maskedContact(i),
  });
}
items.sort((a, b) => a.date < b.date ? 1 : -1);

// Pick ~20 urgent items (most recent) for the actively-tracked service-recovery queue with owner + SLA.
const urgentPool = items.filter(x => x.urgent);
const tracked = urgentPool.slice(0, Math.min(20, urgentPool.length));
tracked.forEach((it, idx) => {
  const theme = THEME_BY_KEY[it.themes[0]];
  it.owner = theme.dept;
  it.sla = (SLA_TEXT[it.themes[0]] || (d => `${d} — respond within 4 hours`))(theme.dept);
  const due = new Date(it.date + 'T00:00:00Z');
  due.setUTCDate(due.getUTCDate() + 1);
  it.dueDate = due.toISOString().slice(0, 10);
});

const themeDefs = THEMES.map(t => ({ key: t.key, label: t.label, dept: t.dept }));

const out = { generatedAt: TODAY.toISOString().slice(0, 10), weeks: WEEKS, themes: themeDefs, items };
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`Wrote ${items.length} items, ${tracked.length} tracked (owner+SLA) to ${OUT}`);
