#!/usr/bin/env node
// Generates data/marketing-studio.json — Marketing & Comms content calendar + studio.
// Node, no dependencies. Seeded PRNG (mulberry32) for reproducible synthetic data.
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

const OWNERS = ['Ananya Pillai', 'Rahul Varma', 'Divya Menon'];
const APPROVER = 'Meera Krishnan';

const BANNED_PHRASES = ['world-class', 'state-of-the-art', 'compassionate care', 'patient-centric', 'miracle', 'best-in-class', 'cutting-edge'];
const CLAIM_KEYWORDS = ['guaranteed', '100%', 'zero risk', 'completely safe', 'risk-free', 'no side effects', 'always works', 'cures'];
const ALLCAPS_WHITELIST = new Set(['VPS', 'LHRC', 'NABH', 'ASCI', 'NMC', 'ECG', 'ICU', 'CSR', 'KPI', 'OT', 'TPA', 'GCC', 'WHO', 'FAQ', 'IST', 'CT', 'MRI', 'BP', 'GI']);

const CHANNELS = ['Instagram', 'LinkedIn', 'Facebook', 'WhatsApp broadcast', 'Press note', 'Website'];
const STATUSES = ['Brief', 'Drafted', 'In review', 'Approved', 'Scheduled'];

// --- 18 October 2026 calendar items -----------------------------------------------------
const ITEMS_RAW = [
  {
    id: 'CS-101', date: '2026-10-01', title: 'World Heart Day camp — thank-you recap', category: 'awareness',
    brief: 'World Heart Day cardiac screening camp (29–30 Sept, hospital atrium) closed with 412 people screened over two days — BP and ECG free, lipid profile at concessional rate. 61 people were flagged and offered a same-day cardiologist consult; 9 were found to need further evaluation and have since booked follow-up appointments. Want a thank-you recap post crediting attendees and the cardiology team, with a soft nudge for anyone who missed it to book a check-up.',
    audience: 'Kochi residents 40+ who attended or heard about the camp, their families', channels: ['Instagram', 'Facebook', 'WhatsApp broadcast'], languages: ['English'],
    owner: 'Ananya Pillai', status: 'Scheduled', requiresConsent: false, requiresImageRights: true, requiresDoctorApproval: true,
  },
  {
    id: 'CS-102', date: '2026-10-02', title: '500th robotic surgery milestone', category: 'milestone',
    brief: 'VPS Lakeshore has completed its 500th robotic surgery (da Vinci platform), spanning urology, gynaecology, GI and cardiac cases over 4 years. Milestone crossed this week with a robotic-assisted nephrectomy performed by Dr. Arjun Menon\'s team. Tone should be measured, credit the whole team, avoid overclaiming outcomes.',
    audience: 'Existing patients, referring doctors, Kochi general public, prospective international patients', channels: ['Instagram', 'LinkedIn', 'Press note', 'Website'], languages: ['English'],
    owner: 'Rahul Varma', status: 'Approved', requiresConsent: false, requiresImageRights: true, requiresDoctorApproval: true,
  },
  {
    id: 'CS-103', date: '2026-10-03', title: 'Doctor profile — Dr. Arjun Menon, robotic surgery', category: 'doctor',
    brief: 'Doctor profile for Dr. Arjun Menon, lead of the robotic surgery programme, to run alongside the 500th-surgery milestone. Covers his training in minimally invasive and robotic urology, his approach to patient counselling before surgery, and one line on the team he works with (anaesthesia, OT, nursing). Keep it grounded — no "best surgeon" language.',
    audience: 'Prospective surgical patients, referring doctors, LinkedIn medical network', channels: ['Instagram', 'LinkedIn', 'Website'], languages: ['English'],
    owner: 'Divya Menon', status: 'In review', requiresConsent: false, requiresImageRights: true, requiresDoctorApproval: true,
  },
  {
    id: 'CS-104', date: '2026-10-05', title: 'International Patient Lounge opens for Maldives patients', category: 'lounge',
    brief: 'New International Patient Lounge opens this week — dedicated waiting area near the international desk with a Dhivehi-speaking coordinator, prayer room access, tea/refreshments, and help with visa extension letters and currency exchange guidance. Aimed at patients travelling from Maldives for cardiology, orthopaedics and fertility treatment. Warm, reassuring tone, not a hard sell.',
    audience: "Maldivian patients and families, Male' referral clinics, medical travel facilitators", channels: ['Instagram', 'WhatsApp broadcast', 'Press note'], languages: ['English', 'Dhivehi'],
    owner: 'Ananya Pillai', status: 'Drafted', requiresConsent: false, requiresImageRights: true, requiresDoctorApproval: false,
  },
  {
    id: 'CS-105', date: '2026-10-06', title: 'Breast Cancer Awareness Month kickoff', category: 'awareness',
    brief: 'October is Breast Cancer Awareness Month. Kickoff post to explain self-examination basics, who should get a mammogram and when, and to announce the free screening camp later in the month (see CS-109). Should be plain and factual — no fear-based language, no guarantees about early detection outcomes.',
    audience: 'Women 35+ in Kochi and nearby districts, their families', channels: ['Instagram', 'Facebook', 'LinkedIn'], languages: ['English', 'Malayalam'],
    owner: 'Rahul Varma', status: 'Scheduled', requiresConsent: false, requiresImageRights: false, requiresDoctorApproval: true,
  },
  {
    id: 'CS-106', date: '2026-10-08', title: 'Pink light building photo', category: 'awareness',
    brief: 'The hospital facade will be lit pink on the evening of 8 October to mark Breast Cancer Awareness Month, alongside the oncology team on the front steps. Simple visual post, one caption line, tag the oncology department.',
    audience: 'General public, staff and their families, past oncology patients', channels: ['Instagram', 'Facebook'], languages: ['English'],
    owner: 'Divya Menon', status: 'Approved', requiresConsent: false, requiresImageRights: true, requiresDoctorApproval: false,
  },
  {
    id: 'CS-107', date: '2026-10-10', title: 'Doctor profile — Dr. Priya Nair, oncology', category: 'doctor',
    brief: 'Doctor profile for Dr. Priya Nair, consultant oncologist, to run during Breast Cancer Awareness Month. Focus on her approach to explaining a diagnosis to a patient calmly, and the tumour board process (multiple specialists reviewing each case together) rather than any single-handed "expert" framing.',
    audience: 'Patients newly referred to oncology, LinkedIn medical network', channels: ['LinkedIn', 'Website'], languages: ['English'],
    owner: 'Ananya Pillai', status: 'Drafted', requiresConsent: false, requiresImageRights: true, requiresDoctorApproval: true,
  },
  {
    id: 'CS-108', date: '2026-10-12', title: 'Festive health check package promo', category: 'promo',
    brief: 'Festive-season health check package (basic blood work, ECG, BP, BMI, consultation) at a bundled price through end of November, timed around Onam/Diwali family visits home. Needs a price mention, package inclusions listed plainly, and a line clarifying the package is a screening, not a diagnosis.',
    audience: 'Working professionals visiting family for the festive season, their parents', channels: ['Instagram', 'Facebook', 'WhatsApp broadcast'], languages: ['English', 'Malayalam'],
    owner: 'Rahul Varma', status: 'Brief', requiresConsent: false, requiresImageRights: false, requiresDoctorApproval: false,
  },
  {
    id: 'CS-109', date: '2026-10-14', title: 'Breast cancer screening camp — registration open', category: 'camp',
    brief: 'Free breast cancer screening camp on 24–25 October: clinical breast exam and risk-assessment questionnaire, with a mammogram at concessional rate for those the doctor recommends it for. Registration by phone or WhatsApp, 150 slots across two days. Announce dates and how to register.',
    audience: 'Women 35+ in Kochi, corporate HR wellness contacts, community groups', channels: ['Instagram', 'WhatsApp broadcast', 'Press note'], languages: ['English', 'Malayalam'],
    owner: 'Divya Menon', status: 'In review', requiresConsent: false, requiresImageRights: false, requiresDoctorApproval: true,
  },
  {
    id: 'CS-110', date: '2026-10-15', title: 'Doctor profile — Dr. Faisal Rahman, cardiology', category: 'doctor',
    brief: 'Doctor profile for Dr. Faisal Rahman, consultant cardiologist who sees a significant share of Gulf-based patients on their India visits. Include his language comfort (English, Arabic, Malayalam) and how he coordinates with a patient\'s home-country cardiologist for continuity of care.',
    audience: 'GCC-based patients and their families, corporate wellness contacts', channels: ['Instagram', 'LinkedIn'], languages: ['English', 'Arabic'],
    owner: 'Ananya Pillai', status: 'Drafted', requiresConsent: false, requiresImageRights: true, requiresDoctorApproval: true,
  },
  {
    id: 'CS-111', date: '2026-10-18', title: 'CSR rural health camp recap — Kuttanad', category: 'csr',
    brief: 'CSR general health camp held in Kuttanad on 11 October in partnership with a local panchayat: 340 people screened for BP, blood sugar and general check-up; 28 referred for further tests at concessional CSR rates. Recap post to thank the panchayat and volunteers, and state the referral numbers plainly without dramatising the need.',
    audience: 'Kuttanad community, panchayat officials, CSR partners, LinkedIn network', channels: ['Facebook', 'LinkedIn', 'Press note'], languages: ['English'],
    owner: 'Rahul Varma', status: 'Approved', requiresConsent: true, requiresImageRights: true, requiresDoctorApproval: false,
  },
  {
    id: 'CS-112', date: '2026-10-20', title: 'Breast cancer screening camp recap', category: 'camp',
    brief: 'Recap post for the 24–25 October screening camp (posted ahead as a placeholder for the comms calendar; will be finalised with real attendance numbers after the camp runs). Draft should mark where the real count goes and avoid inventing a number now.',
    audience: 'Women 35+ in Kochi, attendees and their families', channels: ['Instagram', 'Facebook'], languages: ['English'],
    owner: 'Divya Menon', status: 'Scheduled', requiresConsent: false, requiresImageRights: true, requiresDoctorApproval: false,
  },
  {
    id: 'CS-113', date: '2026-10-22', title: 'International patient services — Arabic-language desk', category: 'lounge',
    brief: 'Reminder post that the international patient desk has Arabic-speaking coordinators on all weekdays, for GCC patients arriving for planned procedures. Include how to reach the desk before arrival (WhatsApp number, email) and what help is available (airport pickup coordination, accommodation guidance, insurance paperwork).',
    audience: 'GCC-based patients, medical travel facilitators in the Gulf', channels: ['Instagram', 'WhatsApp broadcast'], languages: ['Arabic', 'English'],
    owner: 'Ananya Pillai', status: 'Brief', requiresConsent: false, requiresImageRights: false, requiresDoctorApproval: false,
  },
  {
    id: 'CS-114', date: '2026-10-24', title: 'Stroke awareness — spot the signs (FAST)', category: 'awareness',
    brief: 'Ahead of World Stroke Day (29 Oct), an awareness post on the FAST signs (Face, Arms, Speech, Time) and why calling for help within the first hour matters. Should state the "golden hour" framing carefully — treatment window varies by case — and avoid implying a guaranteed recovery if care is sought quickly.',
    audience: 'General public, families of older adults, corporate wellness contacts', channels: ['Instagram', 'Facebook', 'LinkedIn'], languages: ['English', 'Malayalam'],
    owner: 'Rahul Varma', status: 'Drafted', requiresConsent: false, requiresImageRights: false, requiresDoctorApproval: true,
  },
  {
    id: 'CS-115', date: '2026-10-27', title: 'World Stroke Day camp announcement', category: 'camp',
    brief: 'World Stroke Day (29 Oct) free screening camp: BP, blood sugar and a basic neurological risk checklist, with a neurologist consult for anyone flagged. 29 Oct only, hospital atrium, 100 slots, registration by phone or WhatsApp.',
    audience: 'Kochi residents 45+, families with a history of stroke', channels: ['Instagram', 'WhatsApp broadcast', 'Press note'], languages: ['English', 'Malayalam'],
    owner: 'Divya Menon', status: 'In review', requiresConsent: false, requiresImageRights: false, requiresDoctorApproval: true,
  },
  {
    id: 'CS-116', date: '2026-10-29', title: 'World Stroke Day camp — on the day', category: 'camp',
    brief: 'Same-day post while the World Stroke Day camp is running: a short update post with a photo from the atrium, encouraging walk-ins for the remaining slots, and a reminder of the FAST signs.',
    audience: 'Kochi residents nearby, social media followers checking for real-time updates', channels: ['Instagram', 'Facebook'], languages: ['English'],
    owner: 'Ananya Pillai', status: 'Brief', requiresConsent: false, requiresImageRights: true, requiresDoctorApproval: false,
  },
  {
    id: 'CS-117', date: '2026-10-30', title: 'Onam outreach — thank-you note', category: 'greeting',
    brief: 'A late thank-you recap for September\'s Onam outreach: a blood donation drive that collected 96 units, and an Onam sadya served to long-stay patients and their attendants in the wards. Warm, low-key tone — this is a thank-you, not a promotion.',
    audience: 'Donors, ward patients and families, staff', channels: ['Instagram', 'Facebook'], languages: ['English', 'Malayalam'],
    owner: 'Rahul Varma', status: 'Approved', requiresConsent: true, requiresImageRights: true, requiresDoctorApproval: false,
  },
  {
    id: 'CS-118', date: '2026-10-31', title: 'Diwali greetings', category: 'greeting',
    brief: 'Diwali greeting post for the hospital\'s social channels, going out a week ahead of Diwali (8 Nov). Warm, simple, no hard sell — a line about the emergency department and pharmacy staying open through the holiday is useful information, not an ad.',
    audience: 'General public, patients, staff and their families', channels: ['Instagram', 'LinkedIn', 'Facebook', 'WhatsApp broadcast'], languages: ['English', 'Malayalam'],
    owner: 'Divya Menon', status: 'Brief', requiresConsent: false, requiresImageRights: false, requiresDoctorApproval: false,
  },
];

const items = ITEMS_RAW.map(it => ({
  ...it,
  compliance: { consentOnFile: false, imageRights: false, doctorApproval: false },
}));

// --- 8 weeks of synthetic engagement, per channel ---------------------------------------
const ENG_CHANNELS = ['Instagram', 'LinkedIn', 'Facebook', 'WhatsApp broadcast'];
const weekLabels = [];
{
  const end = new Date('2026-09-27');
  for (let i = 7; i >= 0; i--) {
    const d = new Date(end); d.setDate(d.getDate() - i * 7);
    weekLabels.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
  }
}
const baseReach = { Instagram: 9200, LinkedIn: 3400, Facebook: 6100, 'WhatsApp broadcast': 5200 };
const basePosts = { Instagram: 5, LinkedIn: 2, Facebook: 3, 'WhatsApp broadcast': 2 };
const engagement = { weeks: weekLabels, postsByChannel: {}, engagementByChannel: {}, reachTotal: [] };
ENG_CHANNELS.forEach(c => { engagement.postsByChannel[c] = []; engagement.engagementByChannel[c] = []; });
for (let w = 0; w < 8; w++) {
  let totalReach = 0;
  ENG_CHANNELS.forEach(c => {
    const posts = Math.max(1, basePosts[c] + int(-1, 2));
    const growth = 1 + w * 0.018; // gentle upward drift over 8 weeks
    const reach = Math.round(baseReach[c] * growth * (0.85 + rnd() * 0.3));
    const rate = { Instagram: 0.055, LinkedIn: 0.03, Facebook: 0.035, 'WhatsApp broadcast': 0.11 }[c];
    const eng = Math.round(reach * rate * (0.8 + rnd() * 0.4));
    engagement.postsByChannel[c].push(posts);
    engagement.engagementByChannel[c].push(eng);
    totalReach += reach;
  });
  engagement.reachTotal.push(totalReach);
}

const out = {
  meta: {
    dept: 'Marketing & Comms', month: 'October 2026',
    bannedPhrases: BANNED_PHRASES, claimKeywords: CLAIM_KEYWORDS, allcapsWhitelist: [...ALLCAPS_WHITELIST],
    owners: OWNERS, approver: APPROVER, channels: CHANNELS, statuses: STATUSES,
    voiceNote: 'VPS Lakeshore brand voice: plain, observed, specific. "In good hands" is used only where it is earned — not as a slogan bolted onto every post. NMC and ASCI advertising norms apply: no outcome guarantees, no comparative superiority claims, no patient testimonials without documented written consent.',
  },
  items,
  engagement,
};

const json = JSON.stringify(out);
if (json.length > 250_000) throw new Error(`Output too large: ${json.length} bytes`);
const dest = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'marketing-studio.json');
writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(`Wrote ${dest} (${json.length} bytes, ${items.length} items, ${weekLabels.length} weeks)`);
