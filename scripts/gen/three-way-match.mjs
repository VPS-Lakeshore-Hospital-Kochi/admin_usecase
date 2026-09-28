// Generates data/three-way-match.json — Purchase & Stores: PO-GRN-invoice three-way matcher.
// Node, no dependencies. Seeded PRNG (mulberry32) for reproducible output.
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
const int = (a, b) => a + Math.floor(rng() * (b - a + 1));
const chance = p => rng() < p;
const round2 = n => Math.round(n * 100) / 100;
const dateStr = d => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

/* ---------- item catalog ---------- */
// gst is the correct/applicable slab for the item.
const ITEMS = [
  // pharma distributors
  { id: 'I01', name: 'Paracetamol 650mg (strip of 15)', category: 'pharma', uom: 'strip', base: 9.5, gst: 12 },
  { id: 'I02', name: 'Amoxicillin 500mg (strip of 10)', category: 'pharma', uom: 'strip', base: 23, gst: 12 },
  { id: 'I03', name: 'Insulin glargine (vial)', category: 'pharma', uom: 'vial', base: 640, gst: 5 },
  { id: 'I04', name: 'IV fluid NS 500ml (bottle)', category: 'pharma', uom: 'bottle', base: 39, gst: 12 },
  { id: 'I05', name: 'Pantoprazole 40mg (vial)', category: 'pharma', uom: 'vial', base: 58, gst: 12 },
  { id: 'I06', name: 'Metformin 500mg (strip of 15)', category: 'pharma', uom: 'strip', base: 14, gst: 12 },
  { id: 'I07', name: 'Azithromycin 500mg (strip of 5)', category: 'pharma', uom: 'strip', base: 62, gst: 12 },
  { id: 'I08', name: 'Ceftriaxone 1g (vial)', category: 'pharma', uom: 'vial', base: 74, gst: 12 },
  // implant suppliers
  { id: 'I09', name: 'Titanium hip stem, size 12', category: 'implants', uom: 'pc', base: 42000, gst: 12 },
  { id: 'I10', name: 'Bone cement (40g pack)', category: 'implants', uom: 'pack', base: 3200, gst: 12 },
  { id: 'I11', name: 'Spinal pedicle screw', category: 'implants', uom: 'pc', base: 18500, gst: 12 },
  { id: 'I12', name: 'Knee femoral component', category: 'implants', uom: 'pc', base: 68000, gst: 12 },
  { id: 'I13', name: 'Orthopaedic plate & screw set', category: 'implants', uom: 'set', base: 9800, gst: 12 },
  { id: 'I14', name: 'Bone graft substitute (10cc)', category: 'implants', uom: 'unit', base: 12400, gst: 12 },
  // lab reagents
  { id: 'I15', name: 'HbA1c reagent kit (100 test)', category: 'reagents', uom: 'kit', base: 8200, gst: 12 },
  { id: 'I16', name: 'CBC reagent kit (500 test)', category: 'reagents', uom: 'kit', base: 15600, gst: 12 },
  { id: 'I17', name: 'Blood culture bottle (box of 50)', category: 'reagents', uom: 'box', base: 6400, gst: 12 },
  { id: 'I18', name: 'ELISA kit (96 well)', category: 'reagents', uom: 'kit', base: 9400, gst: 12 },
  { id: 'I19', name: 'Biochemistry calibrator set', category: 'reagents', uom: 'set', base: 11200, gst: 12 },
  { id: 'I20', name: 'Coagulation reagent kit', category: 'reagents', uom: 'kit', base: 7800, gst: 12 },
  // consumables
  { id: 'I21', name: 'Surgical gloves size 7.5 (box)', category: 'consumables', uom: 'box', base: 460, gst: 5 },
  { id: 'I22', name: 'IV cannula 20G (box of 50)', category: 'consumables', uom: 'box', base: 890, gst: 12 },
  { id: 'I23', name: 'Syringe 10ml (box of 100)', category: 'consumables', uom: 'box', base: 520, gst: 12 },
  { id: 'I24', name: 'Gauze roll (pack of 12)', category: 'consumables', uom: 'pack', base: 340, gst: 5 },
  { id: 'I25', name: 'Suture set (box of 12)', category: 'consumables', uom: 'box', base: 2600, gst: 12 },
  { id: 'I26', name: 'Face mask 3-ply (box of 50)', category: 'consumables', uom: 'box', base: 220, gst: 5 },
  { id: 'I27', name: 'N95 respirator (box of 20)', category: 'consumables', uom: 'box', base: 1450, gst: 5 },
  // housekeeping
  { id: 'I28', name: 'Floor cleaner concentrate (5L can)', category: 'housekeeping', uom: 'can', base: 780, gst: 18 },
  { id: 'I29', name: 'Disinfectant concentrate (5L can)', category: 'housekeeping', uom: 'can', base: 920, gst: 18 },
  { id: 'I30', name: 'Hand sanitizer (5L can)', category: 'housekeeping', uom: 'can', base: 650, gst: 18 },
  { id: 'I31', name: 'Garbage bags (roll of 25, XL)', category: 'housekeeping', uom: 'roll', base: 210, gst: 18 },
  { id: 'I32', name: 'Mop set (heavy duty)', category: 'housekeeping', uom: 'set', base: 480, gst: 18 },
  // IT
  { id: 'I33', name: 'Laptop, standard configuration', category: 'it', uom: 'pc', base: 52000, gst: 18 },
  { id: 'I34', name: 'Desktop AIO, standard configuration', category: 'it', uom: 'pc', base: 41000, gst: 18 },
  { id: 'I35', name: 'Network switch, 24-port managed', category: 'it', uom: 'pc', base: 18500, gst: 18 },
  { id: 'I36', name: 'Toner cartridge, laser (black)', category: 'it', uom: 'pc', base: 3400, gst: 18 },
  { id: 'I37', name: 'UPS, 1 KVA line-interactive', category: 'it', uom: 'pc', base: 7200, gst: 18 },
];
const byCategory = cat => ITEMS.filter(i => i.category === cat);

/* ---------- vendors ---------- */
const CATS = [
  { key: 'pharma', label: 'Pharma distributor', n: 5, names: ['Keralon Pharma Distributors', 'Malabar Drug House', 'Greenline Pharma Agencies', 'Sannidhi Pharma Distributors', 'Vasudha Drug Traders'] },
  { key: 'implants', label: 'Implant supplier', n: 5, names: ['Meditrust Surgicals', 'Ashwini Ortho Implants', 'Sunveer Surgical Systems', 'Kairali Implant Traders', 'Pranava Medisurge'] },
  { key: 'reagents', label: 'Lab reagents', n: 4, names: ['Diagnova Reagents Pvt Ltd', 'Labwell Diagnostics Supply', 'Sanchara Biosciences', 'Trivandrum Lab Traders'] },
  { key: 'consumables', label: 'Consumables', n: 5, names: ['Nirmal Surgical Consumables', 'Om Sai Medical Supplies', 'Coastal Hospital Supplies', 'Anjana Healthcare Products', 'Brightway Medi Supplies'] },
  { key: 'housekeeping', label: 'Housekeeping', n: 3, names: ['Suchitha Facility Supplies', 'Clean Kerala Chemicals', 'Aravind Housekeeping Traders'] },
  { key: 'it', label: 'IT & office', n: 3, names: ['Netpoint Systems Kochi', 'Trident Computer Traders', 'Silverline IT Solutions'] },
];
const CITIES = ['Kochi', 'Aluva', 'Kakkanad', 'Tripunithura', 'Angamaly', 'Perumbavoor', 'Thrissur'];
const vendors = [];
let vseq = 1;
for (const c of CATS) {
  for (let i = 0; i < c.n; i++) {
    const id = 'V' + String(vseq++).padStart(2, '0');
    const items = byCategory(c.key);
    const nItems = int(Math.min(3, items.length), Math.min(6, items.length));
    const chosen = [...items].sort(() => rng() - 0.5).slice(0, nItems);
    const factor = 0.94 + rng() * 0.1; // vendor's own contract-rate variance vs base
    const rateCard = {};
    chosen.forEach(it => { rateCard[it.id] = round2(it.base * factor); });
    vendors.push({
      id, name: c.names[i], category: c.key, categoryLabel: c.label,
      gstin: `32${String(int(10000, 99999))}${String.fromCharCode(65 + int(0, 25))}${int(1000, 9999)}Z${int(1, 9)}`,
      city: pick(CITIES), contact: `${pick(['Rejith', 'Anitha', 'Suresh', 'Divya', 'Manoj', 'Sindhu', 'Prakash', 'Lekha'])} ${pick(['Nair', 'Menon', 'Pillai', 'Varghese', 'Kurian', 'Thomas'])}`,
      email: `accounts@${c.names[i].toLowerCase().replace(/[^a-z]+/g, '').slice(0, 14)}.example.in`,
      paymentTerms: pick(['Net 30', 'Net 45', 'Net 30 from GRN', '15% advance, balance Net 30']),
      itemIds: chosen.map(it => it.id), rateCard,
    });
  }
}

/* ---------- invoices ---------- */
const MONTH_START = new Date('2026-09-01');
const N_INVOICES = 120;
const invoices = [];
let poSeq = 1200, invSeqByVendor = {};
const usedInvoiceNumbers = []; // for duplicate injection: {vendorId, invoiceNumber, used}

// distribute invoice counts roughly proportional to category invoice frequency
const weightFor = v => ({ pharma: 2.2, consumables: 1.8, reagents: 1.3, implants: 1.0, housekeeping: 0.8, it: 0.6 }[v.category]);
const weighted = [];
vendors.forEach(v => { const w = Math.round(weightFor(v) * 10); for (let i = 0; i < w; i++) weighted.push(v); });

const EXC_TYPES = ['short_supply', 'rate_above_contract', 'gst_error', 'freight_not_in_po', 'duplicate_invoice', 'invoice_before_grn', 'partial_delivery'];
let excPlan = [];
// build an exception plan: ~30% of invoices get >=1 exception, cycling through types for coverage
const N_EXC = Math.round(N_INVOICES * 0.32);
for (let i = 0; i < N_EXC; i++) excPlan.push(EXC_TYPES[i % EXC_TYPES.length]);
excPlan = excPlan.sort(() => rng() - 0.5);

for (let n = 0; n < N_INVOICES; n++) {
  const v = pick(weighted);
  const poDate = addDays(MONTH_START, int(-3, 24));
  const poNumber = `PO/LKS/2026/${poSeq++}`;
  const seq = (invSeqByVendor[v.id] = (invSeqByVendor[v.id] || 0) + 1);
  const invoiceNumber = `${v.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4)}/2609/${String(1000 + seq * 7 + int(0, 6))}`;
  const exceptionType = n < excPlan.length ? excPlan[n] : null;

  const availItems = v.itemIds.map(id => ITEMS.find(it => it.id === id));
  const nLines = int(2, Math.min(5, availItems.length));
  const lines = [...availItems].sort(() => rng() - 0.5).slice(0, nLines).map(it => {
    const contractRate = v.rateCard[it.id];
    const poQty = int(1, it.category === 'implants' ? 12 : it.category === 'it' ? 8 : 60) * (it.category === 'pharma' || it.category === 'consumables' ? 10 : 1);
    const poRate = contractRate;
    let grnQty = poQty, grnStatus = 'Complete';
    let invQty = poQty, invRate = poRate, gstPctInv = it.gst;
    const grnDate = addDays(poDate, int(2, 10));
    return { itemId: it.id, item: it.name, uom: it.uom, contractRate, poQty, poRate, gstPctPO: it.gst, grnQty, grnDate: dateStr(grnDate), grnStatus, invQty, invRate, gstPctInv };
  });

  // pick which line (if any) carries the planned exception for this invoice
  const target = lines.length ? pick(lines) : null;
  if (exceptionType && target) {
    if (exceptionType === 'short_supply') {
      target.grnQty = Math.max(0, target.poQty - int(1, Math.max(1, Math.round(target.poQty * 0.3))));
      target.grnStatus = 'Short — closed, vendor cites stock-out';
      target.invQty = target.poQty; // vendor still bills full PO qty
    } else if (exceptionType === 'partial_delivery') {
      target.grnQty = Math.max(1, target.poQty - int(1, Math.max(1, Math.round(target.poQty * 0.25))));
      target.grnStatus = 'Partial — balance expected next week';
      target.invQty = target.poQty;
    } else if (exceptionType === 'rate_above_contract') {
      target.invRate = round2(target.contractRate * (1.05 + rng() * 0.12));
    } else if (exceptionType === 'gst_error') {
      const wrong = [5, 12, 18].filter(g => g !== target.gstPctPO);
      target.gstPctInv = pick(wrong);
    } else if (exceptionType === 'invoice_before_grn') {
      // handled below via invoiceDate
    }
  }

  // freight
  let freightBilled = 0, freightInPO = true;
  const hasFreight = chance(0.35) || exceptionType === 'freight_not_in_po';
  if (hasFreight) {
    freightBilled = int(300, 4500);
    freightInPO = exceptionType === 'freight_not_in_po' ? false : chance(0.8);
  }

  const maxGrnDate = lines.reduce((m, l) => l.grnDate > m ? l.grnDate : m, lines[0] ? lines[0].grnDate : dateStr(poDate));
  let invoiceDate;
  if (exceptionType === 'invoice_before_grn') {
    invoiceDate = dateStr(addDays(new Date(maxGrnDate), -int(1, 4)));
  } else {
    invoiceDate = dateStr(addDays(new Date(maxGrnDate), int(0, 6)));
  }
  const receivedOn = dateStr(addDays(new Date(invoiceDate), int(1, 4)));

  const inv = {
    id: `INV-2026-${String(n + 1).padStart(4, '0')}`,
    vendorId: v.id, poNumber, poDate: dateStr(poDate),
    invoiceNumber, invoiceDate, receivedOn,
    freightBilled, freightInPO, freightGstPct: freightBilled ? 18 : 0,
    lines,
  };
  invoices.push(inv);
}

// inject duplicate invoice numbers: pick ~5 invoices and clone their invoiceNumber onto another invoice from the same vendor
const dupCandidates = invoices.filter((inv, idx) => excPlan[idx] === 'duplicate_invoice' || false);
// since excPlan cycles through types, find invoices flagged duplicate_invoice by index position
let dupCount = 0;
excPlan.forEach((t, idx) => {
  if (t === 'duplicate_invoice' && invoices[idx]) {
    const src = invoices[idx];
    const sameVendor = invoices.filter(o => o.vendorId === src.vendorId && o.id !== src.id);
    if (sameVendor.length) {
      const target = pick(sameVendor);
      target.invoiceNumber = src.invoiceNumber;
      target.duplicateOf = src.id;
      dupCount++;
    }
  }
});

const vendorNames = Object.fromEntries(vendors.map(v => [v.id, v.name]));
const data = {
  generatedAt: new Date().toISOString(),
  month: 'September 2026',
  vendors, items: ITEMS, invoices,
  meta: { totalInvoices: invoices.length, exceptionsPlanned: N_EXC, duplicatesInjected: dupCount },
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', '..', 'data', 'three-way-match.json');
writeFileSync(outPath, JSON.stringify(data));
console.log(`Wrote ${outPath} — ${vendors.length} vendors, ${invoices.length} invoices, ~${N_EXC} planned exceptions, ${dupCount} duplicate invoice numbers.`);
