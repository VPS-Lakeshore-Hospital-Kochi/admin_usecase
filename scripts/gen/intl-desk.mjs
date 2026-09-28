// Generates data/intl-desk.json — synthetic international-patient enquiry pipeline for the
// International Patients desk. Node, no dependencies. Seeded (mulberry32) for reproducibility.
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
const round100 = n => Math.round(n / 100) * 100;
const USD_RATE = 83.5;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TODAY = new Date(2026, 8, 28); // 28-Sep-2026
const fmtDate = d => `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
const daysAgo = n => { const d = new Date(TODAY); d.setDate(d.getDate() - n); return d; };

const COUNTRIES = [
  { name: 'Maldives', langs: ['Dhivehi', 'English'], facilitators: ['MaléCare Connect', 'Direct enquiry'] },
  { name: 'Oman', langs: ['Arabic', 'English'], facilitators: ['Gulf Health Bridge', 'Muscat MedLink', 'Direct enquiry'] },
  { name: 'UAE', langs: ['Arabic', 'English'], facilitators: ['Gulf Health Bridge', 'Direct enquiry'] },
  { name: 'Iraq', langs: ['Arabic', 'English'], facilitators: ['Baghdad CareLink', 'Direct enquiry'] },
  { name: 'Kenya', langs: ['English', 'French'], facilitators: ['Nairobi MedLink', 'Direct enquiry'] },
  { name: 'Tanzania', langs: ['English', 'French'], facilitators: ['Dar MedBridge', 'Direct enquiry'] },
  { name: 'Nigeria', langs: ['English'], facilitators: ['Lagos HealthPath', 'Direct enquiry'] },
  { name: 'Bangladesh', langs: ['English'], facilitators: ['Dhaka MedAssist', 'Direct enquiry'] },
];
const FACILITATOR_COMMISSION = {
  'MaléCare Connect': 12, 'Gulf Health Bridge': 10, 'Muscat MedLink': 11, 'Baghdad CareLink': 14,
  'Nairobi MedLink': 13, 'Dar MedBridge': 13, 'Lagos HealthPath': 12, 'Dhaka MedAssist': 9, 'Direct enquiry': 0,
};

const NAMES = {
  Maldives: ['Ahmed Fahad', 'Aishath Nafeeza', 'Ibrahim Rasheed', 'Mariyam Shifana', 'Hussain Zahid', 'Aminath Reesha'],
  Oman: ['Salim Al-Balushi', 'Fatma Al-Harthy', 'Nasser Al-Kindi', 'Aisha Al-Rawahi', 'Khalid Al-Habsi'],
  UAE: ['Rashid Al-Suwaidi', 'Mariam Al-Nuaimi', 'Omar Al-Zaabi', 'Noura Al-Shamsi', 'Hamdan Al-Marri'],
  Iraq: ['Karim Al-Jubouri', 'Zainab Al-Hilli', 'Mustafa Al-Obaidi', 'Rana Al-Saadi', 'Haidar Al-Tamimi'],
  Kenya: ['Wanjiru Kamau', 'Otieno Ochieng', 'Akinyi Adhiambo', 'Kiptoo Kiprono', 'Njeri Mwangi'],
  Tanzania: ['Juma Mwakasege', 'Neema Kessy', 'Baraka Mushi', 'Furaha Mbwana', 'Godfrey Lyimo'],
  Nigeria: ['Chidinma Okafor', 'Emeka Nwosu', 'Aisha Bello', 'Tunde Adebayo', 'Ngozi Eze'],
  Bangladesh: ['Rafiqul Islam', 'Sultana Begum', 'Kamal Hossain', 'Nasrin Akter', 'Jahangir Alam'],
};

const CHANNELS = ['Email', 'WhatsApp', 'Facilitator', 'Website form'];

const SPECIALTIES = [
  { key: 'cardiac', label: 'Cardiac surgery', bandInr: [450000, 900000] },
  { key: 'liver', label: 'Liver transplant', bandInr: [1800000, 2600000] },
  { key: 'ortho', label: 'Knee/hip replacement', bandInr: [350000, 550000] },
  { key: 'onco', label: 'Oncology', bandInr: [300000, 1200000] },
  { key: 'robotic', label: 'Robotic surgery', bandInr: [400000, 800000] },
  { key: 'ivf', label: 'IVF', bandInr: [150000, 300000] },
  { key: 'spine', label: 'Spine surgery', bandInr: [400000, 700000] },
];

const STAGES = ['New', 'Replied', 'Estimate sent', 'Visa letter', 'Travel booked', 'Admitted', 'Lost'];

const SUMMARY_TEMPLATES = {
  cardiac: n => `My father needs a heart bypass / valve evaluation urgently, doctors here suggested surgery within weeks. Please advise cost, hospital stay and whether a cardiologist can review reports first. — ${n}`,
  liver: n => `We were told a living-donor liver transplant is needed. I (${n}) may donate for my relative. Please share total cost for donor + recipient, stay duration and the visa process.`,
  ortho: n => `Severe knee/hip pain, local doctor recommends replacement surgery. Asking on behalf of my parent. Need cost estimate, how many days to stay in Kochi, and if someone can help at the airport.`,
  onco: n => `Recently diagnosed with cancer, seeking a second opinion and treatment options (surgery/chemo/radiation) at VPS Lakeshore. Please advise cost range and how soon we can get an oncologist's opinion. — ${n}`,
  robotic: n => `Doctor recommended robotic surgery for better recovery time. Would like cost, hospital stay, and whether the surgeon can review reports remotely before we travel. — ${n}`,
  ivf: n => `We have been trying for a baby for some time; local doctor suggested IVF. Please share success rates, cost per cycle and how long we would need to stay. — ${n}`,
  spine: n => `Chronic back pain, an MRI here shows a disc problem; doctor mentioned possible spine surgery. Please advise cost, recovery time and required tests before we travel. — ${n}`,
};
// Non-English sample lines (short, transliterated/native) kept alongside the English gist so the
// desk can see what channel/language a message actually arrived in.
const NATIVE_SAMPLE = {
  Dhivehi: 'Salaam, faraatuge hurihaa test thakaa ekee gulhigen liver transplant eh kurumah beynun. Kihaa dhuvަހަ hospital ga hunnan jeheytha? (please advise cost and stay)',
  Arabic: 'مرحبا، نحتاج إلى استشارة طبية بخصوص العملية المطلوبة وتكلفتها ومدة الإقامة في كوتشي. يرجى الرد بسرعة.',
  French: "Bonjour, mon proche a besoin d'une consultation médicale à l'hôpital VPS Lakeshore. Merci de nous indiquer le coût estimé et la durée du séjour à Kochi.",
  English: null,
};

const N = 40;
const enquiries = [];
for (let i = 0; i < N; i++) {
  const c = pick(COUNTRIES);
  const lang = pick(c.langs);
  const sender = pick(NAMES[c.name]);
  const spec = pick(SPECIALTIES);
  const channel = pick(CHANNELS);
  const facilitator = channel === 'Facilitator' ? pick(c.facilitators.filter(f => f !== 'Direct enquiry')) || c.facilitators[0] : (rand() < 0.3 ? pick(c.facilitators) : 'Direct enquiry');
  const commissionPct = FACILITATOR_COMMISSION[facilitator] ?? 0;

  const receivedDays = int(0, 21);
  const receivedDate = daysAgo(receivedDays);

  // stage weighted by how long ago the enquiry came in — older enquiries have progressed further
  let stage;
  const age = receivedDays;
  const roll = rand();
  if (age <= 1) stage = roll < 0.7 ? 'New' : 'Replied';
  else if (age <= 4) stage = pick(['New', 'Replied', 'Replied', 'Estimate sent']);
  else if (age <= 9) stage = pick(['Replied', 'Estimate sent', 'Estimate sent', 'Visa letter', 'Lost']);
  else if (age <= 15) stage = pick(['Estimate sent', 'Visa letter', 'Visa letter', 'Travel booked', 'Lost']);
  else stage = pick(['Visa letter', 'Travel booked', 'Travel booked', 'Admitted', 'Admitted', 'Lost']);

  const reportsAttached = rand() < (stage === 'New' ? 0.35 : 0.65);

  const [lo, hi] = spec.bandInr;
  const estimateInr = round100(lo + rand() * (hi - lo));
  const estimateUsd = Math.round(estimateInr / USD_RATE);

  // last contact: for New, often stale (no reply yet); for later stages, more recent
  const lastContactHoursAgo = stage === 'New'
    ? Math.round(rand() * rand() * 90) // skewed low but some big SLA breaches
    : Math.round(rand() * 36);
  const lastContactDate = new Date(TODAY.getTime() - lastContactHoursAgo * 3600 * 1000);

  const replyHours = stage === 'New' ? null : Math.round(2 + rand() * rand() * 46);

  const nativeLine = NATIVE_SAMPLE[lang];
  const summary = SUMMARY_TEMPLATES[spec.key](sender) + (nativeLine ? `\n\n[Original message, ${lang}]: ${nativeLine}` : '');

  enquiries.push({
    id: `ENQ-${String(2601 + i)}`,
    country: c.name,
    language: lang,
    channel,
    sender,
    specialty: spec.label,
    specialtyKey: spec.key,
    summary,
    reportsAttached,
    stage,
    estimateInr,
    estimateUsd,
    facilitator,
    commissionPct,
    receivedDate: fmtDate(receivedDate),
    receivedDaysAgo: receivedDays,
    lastContactDate: fmtDate(lastContactDate),
    lastContactHoursAgo,
    replyHours,
  });
}

// shuffle so the queue doesn't read as sorted by age
for (let i = enquiries.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [enquiries[i], enquiries[j]] = [enquiries[j], enquiries[i]];
}

// weekly trend (last 3 weeks + current partial week), oldest first
const weekLabels = ['3 weeks ago', '2 weeks ago', 'Last week', 'This week'];
const weekCounts = [0, 0, 0, 0];
enquiries.forEach(e => {
  const idx = e.receivedDaysAgo >= 21 ? 0 : e.receivedDaysAgo >= 14 ? 1 : e.receivedDaysAgo >= 7 ? 2 : 3;
  weekCounts[idx]++;
});

const hospitalFacts = {
  packages: SPECIALTIES.map(s => ({ specialty: s.label, bandInr: `₹${(s.bandInr[0] / 100000).toFixed(1)}–${(s.bandInr[1] / 100000).toFixed(1)} lakh`, bandUsd: `$${Math.round(s.bandInr[0] / USD_RATE).toLocaleString('en-IN')}–${Math.round(s.bandInr[1] / USD_RATE).toLocaleString('en-IN')}` })),
  visaProcess: [
    'Hospital issues a signed medical visa invitation letter (patient + one attendant) within 24 hours of a confirmed booking and advance.',
    'Letter is emailed as a scanned PDF plus couriered original on request; carries hospital registration number, treating doctor and estimated stay.',
    'Patient submits the letter with passport, photos and the visa application form at the Indian Mission/e-Visa portal for their country.',
    'Typical Indian medical visa turnaround: 3–5 working days once the invitation letter and documents are submitted; e-Medical Visa available for several of our source countries.',
    'Visa validity is usually issued for the estimated treatment duration plus a buffer; extensions are handled through the FRRO in Kochi if treatment runs long.',
  ],
  airportPickup: 'Complimentary pickup from Cochin International Airport (COK) for confirmed international bookings; a hospital coordinator meets the family at arrivals with a name board.',
  interpreters: ['Arabic', 'Dhivehi', 'French', 'Swahili (on request, 48h notice)'],
  accommodation: [
    { name: 'Lakeshore Guest House', distance: '5 min walk', rate: '₹1,800–2,500/night', note: 'family discount for stays over 2 weeks' },
    { name: 'Harbour View Service Apartments', distance: '10 min drive', rate: '₹2,200–3,200/night', note: 'kitchenette, preferred for longer transplant stays' },
    { name: 'Palm Residency', distance: '15 min drive', rate: '₹1,500–2,000/night', note: 'budget option, shuttle provided' },
  ],
  paymentOptions: [
    'International wire transfer (SWIFT) to the hospital\'s designated account, advance of 25–30% to confirm booking',
    'International debit/credit card at the International Desk billing counter',
    'Forex/travel card top-up accepted at admission',
    'Corporate or government sponsorship letters of guarantee (embassy/ministry cases) accepted with prior finance approval',
    'Facilitator-collected payments are reconciled against the commission agreement before hospital disbursement',
  ],
  general: 'VPS Lakeshore Hospital, Kochi — 350-bed NABH-accredited multi-specialty hospital. International revenue is currently ~14% of total revenue; leadership goal is to grow this toward 20%.',
};

const out = {
  generatedAt: '2026-09-28',
  hospital: 'VPS Lakeshore Hospital, Kochi',
  stages: STAGES,
  weekLabels, weekCounts,
  hospitalFacts,
  enquiries,
};

const file = fileURLToPath(import.meta.url);
const dataPath = join(dirname(file), '..', '..', 'data', 'intl-desk.json');
mkdirSync(dirname(dataPath), { recursive: true });
writeFileSync(dataPath, JSON.stringify(out, null, 1));
console.log(`Wrote ${enquiries.length} enquiries to ${dataPath}`);
