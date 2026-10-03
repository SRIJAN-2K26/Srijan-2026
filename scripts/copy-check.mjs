// Content guard on dist/index.html: fee text is allowed ONLY as the owner-approved amounts; no payment/QR/UPI/deadline/count/time copy.
import fs from 'fs';
// The problem-statements section is the owner-approved softened list (AML statement says "bank transaction streams"); it is guarded by scripts/ps-check.mjs instead.
const html = fs.readFileSync('dist/index.html', 'utf8').replace(/<section id="problem-statements"[\s\S]*?<\/section>/, ' ');
const text = html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL', m); };
const feeHits = [...text.matchAll(/.{0,40}\bfee\b.{0,60}/gi)].map((m) => m[0].trim());
console.log('fee mentions:', feeHits.length); feeHits.forEach((h) => console.log('  ', h));
if (/\bfees?\b/i.test(text.replace(/Registration fee/gi, ''))) fail('"fee" outside the Registration fee heading');
const t2 = text.replace(/12:00 PM IST/g, ''); // the owner-confirmed close time
for (const [re, why] of [[/\bUPI\b|\bQR\b|scan to|payment|pay (by|via|here|online)|bank|account number|deadline|last date|payment deadline|registration (opens|open from)|opens on/i, 'payment/QR/deadline/opening date'], [/48 hours|24 hours|\btop 75\b|\b75 teams\b/i, 'banned numbers'], [/\b\d{1,2}:\d{2}\s?(am|pm)?\b|\b\d{1,2}\s?(am|pm)\b/i, 'clock times (only the 12:00 PM IST close time is allowed)'], [/\+?\d[\d\s-]{9,}\d/, 'phone-like numbers'], [/1,00,000|₹\s?1,00/, 'sponsor figure']]) if (re.test(t2)) fail(why + ': ' + t2.match(re)[0]);
// dates: only 11 Oct (registration close), 12 Oct (shortlist), 13-14 Oct (event)
const days = new Set(); for (const m of text.matchAll(/\b(\d{1,2})(?:\s?[–-]\s?(\d{1,2}))?\s+(?:Oct\b|October\b)/g)) { days.add(+m[1]); if (m[2]) days.add(+m[2]); }
console.log('Oct days on page:', [...days].sort((a, b) => a - b).join(' '));
for (const d of days) if (![11, 12, 13, 14].includes(d)) fail('unexpected date: ' + d + ' Oct');
if (/\b(Sep|Sept|September|Nov|November)\b/.test(text)) fail('other month');
if (!text.includes('Registration closes 11 Oct 2026, 12:00 PM IST')) fail('missing static close line');
const amounts = [...text.matchAll(/₹\s?[\d,.]+(?:\s?Lakh\+?)?/g)].map((m) => m[0].replace(/\s/g, ''));
const allowed = new Set(['₹50', '₹100', '₹150', '₹200', '₹1.5Lakh+']);
const unexpected = [...new Set(amounts)].filter((a) => !allowed.has(a));
console.log('amounts on page:', [...new Set(amounts)].join(' '));
if (unexpected.length) fail('unexpected amounts: ' + unexpected.join(' '));
// owner-approved reward wording: "Rewards worth ₹1.5 Lakh+" (never "in rewards", cash, prize pool, goodies/vouchers)
if (!text.includes('Rewards worth ₹1.5 Lakh+')) fail('missing approved reward wording');
if (/Lakh\+?\s+in rewards|\bcash\b|prize pool|goodies|voucher/i.test(text)) fail('old/forbidden reward wording');
if ((html.match(/@/g) || []).length && /[\w.]+@(?!gmail\.com)/.test(text)) fail('unexpected email');
// venue: one maps link (defined once in event.json), exact photo caption, no embed
const maps = html.match(/https:\/\/maps\.app\.goo\.gl\/P6yhEmcQWCVMKETi7/g) || [];
if (maps.length !== 1) fail('directions href should appear exactly once, found ' + maps.length);
if (!/<figcaption[^>]*>SRMCEM Campus, Lucknow<\/figcaption>/.test(html)) fail('venue photo caption must be exactly "SRMCEM Campus, Lucknow"');
if (/<iframe/i.test(html)) fail('no map embed');
process.exit(bad ? 1 : 0);
