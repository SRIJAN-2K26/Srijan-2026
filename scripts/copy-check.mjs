// Content guard on dist/index.html: fee text is allowed ONLY as the owner-approved amounts; no payment/QR/UPI/deadline/count/time copy.
import fs from 'fs';
const html = fs.readFileSync('dist/index.html', 'utf8');
const text = html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL', m); };
const feeHits = [...text.matchAll(/.{0,40}\bfee\b.{0,60}/gi)].map((m) => m[0].trim());
console.log('fee mentions:', feeHits.length); feeHits.forEach((h) => console.log('  ', h));
if (/\bfees?\b/i.test(text.replace(/Registration fee/gi, ''))) fail('"fee" outside the Registration fee heading');
for (const [re, why] of [[/\bUPI\b|\bQR\b|scan to|payment|pay (by|via|here|online)|bank|account number|deadline|last date|closes|closing/i, 'payment/QR/deadline'], [/48 hours|24 hours|\btop 75\b|\b75 teams\b/i, 'banned numbers'], [/\b\d{1,2}:\d{2}\s?(am|pm)?\b|\b\d{1,2}\s?(am|pm)\b/i, 'clock times'], [/\+?\d[\d\s-]{9,}\d/, 'phone-like numbers'], [/1,00,000|₹\s?1,00/, 'sponsor figure']]) if (re.test(text)) fail(why + ': ' + text.match(re)[0]);
const amounts = [...text.matchAll(/₹\s?[\d,.]+(?:\s?Lakh\+?)?/g)].map((m) => m[0].replace(/\s/g, ''));
const allowed = new Set(['₹50', '₹100', '₹150', '₹200', '₹1.5Lakh+']);
const unexpected = [...new Set(amounts)].filter((a) => !allowed.has(a));
console.log('amounts on page:', [...new Set(amounts)].join(' '));
if (unexpected.length) fail('unexpected amounts: ' + unexpected.join(' '));
if ((html.match(/@/g) || []).length && /[\w.]+@(?!gmail\.com)/.test(text)) fail('unexpected email');
process.exit(bad ? 1 : 0);
