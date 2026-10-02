// One-off: crops/trims the raw materials in /workspace/srijan into src/assets.
// Only whitelisted public-safe images are read (poster, logos). Never chat/PDF/entry-pass.
import sharp from 'sharp';
const RAW = process.env.RAW || '/workspace/srijan';
const out = new URL('../src/assets/', import.meta.url).pathname;
await sharp(`${RAW}/IMG-20260923-WA0029.jpg`).extract({ left: 0, top: 470, width: 1024, height: 380 }).jpeg({ quality: 88 }).toFile(out + 'venue.jpg');
await sharp(`${RAW}/IMG-20260923-WA0029.jpg`).resize({ width: 780 }).jpeg({ quality: 90 }).toFile(out + 'poster.jpg');
await sharp(`${RAW}/paytm-logo-2d4c.png`).trim().resize({ width: 320 }).png().toFile(out + 'paytm.png');
await sharp(`${RAW}/MacroVision AI Logo.png`).resize({ width: 320 }).png().toFile(out + 'macrovision.png');
console.log('ok');
