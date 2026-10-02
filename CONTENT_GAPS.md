# Content gaps and open items (SRIJAN 2K26 home page v1)

Source of truth: Data Digger brief (`/workspace/srijan/brief/brief.md` + `brief.json`, draft 1). Anything below is **left off the page** (no empty cards, no "TBD" shown) until an organizer confirms it.

## Needs organizer confirmation before launch
- [ ] **Register link** `https://forms.gle/6yS5wjADebhmvPpZA` is provisional (source: chat, 2 Oct). The payment QR is still pending college approval and the form may be replaced. One-line swap: `register.href` in `src/data/event.json`.
- [ ] **Registration open/close dates**: chat says opens ~4–5 Oct (a CSI email says 5th, 10 PM) and closes 11 Oct. Not on the page; add a "Registrations open on …" line once final.
- [x] **Team size**: confirmed by Vineet as 1–4 members; shown as a hero chip and in the FAQ.
- [x] **Registration fee**: owner override (3 Oct): ₹50 per team member (1 = ₹50, 2 = ₹100, 3 = ₹150, 4 = ₹200). Shown in the "How it works" fee block and the FAQ ("How much does it cost?"). Still NOT shown: how/where to pay, payment QR, UPI ids, any payment deadline.
- [ ] **Prizes**: only the TOTAL is confirmed by Vineet: "Rewards worth ₹1.5 Lakh+" (one string, `prizes.total` in event.json, used in hero chip, frame 6, How-it-works step 5). Breakdown shown as "Breakdown announced soon"; no per-prize/track/place split anywhere. Also unconfirmed: best-idea award, certificates, swag.
- [ ] **Problem statements**: the 15-statement PDF is a draft (to be final ~4 Oct). Page shows "Problem statements announced soon". The PDF's "Score x/10" values must never be shown. When final, add a `problemStatements.list` to the JSON and render it.
- [ ] **Open Innovation domain list** (IMG-20261002-WA0038.jpg, not transcribed).
- [x] **Schedule** trimmed to what the brief supports: 13 Oct online screening, 14 Oct offline finale (demos, judging, prizes). No hacking start, sessions or clock times are implied. Still open: detailed times (page says "Detailed times coming soon").
- [x] **Shortlist date**: owner says shortlisted teams are announced on 12 Oct based on the submitted ideas (shown in the steps and FAQ only). Still open: **shortlist size** ("top 75", chat, never shown) and **judges** ("2 judges from CSI Lucknow chapter", chat; no names): not shown.
- [x] **Sponsors**: MacroVision AI, .xyz, Paytm (in that order, from the owner's banner); owner confirmed logo permission (3 Oct). Sponsor tier is still unknown and not shown. OSEN/Sprite/Campa were talks only. Partner button uses the sponsor form `https://forms.gle/CJGvo1dniUA4MumSA`.

## Missing content
- [x] **Public contact** resolved: Vineet supplied two public contacts, now in the footer "Questions? Contact us" block (`contact.questions` in `src/data/event.json`): Ankit Yadav (GFG SRMCEM Lead, gfg.campusbody.srmcem@gmail.com) and Abhay Shanker Tiwari (CSI SRMCEM Lead, Lead.csidcoders@gmail.com; address taken from the brief's sponsorship proposal). Still open: phone numbers (intentionally none) and a shared org inbox, if the organizers prefer one.
- [ ] **Social URLs** (Instagram/LinkedIn): none in the sources.
- [ ] **Official SRIJAN logo**: none exists (chat, 2 Oct). Header uses a text wordmark; `public/favicon.svg` is a plain monogram, not an official mark.
- [ ] **Organizer logos** (CSI, SRMCEM, D'CODERS, GFG) as standalone files: only present inside posters. Organizers are named in text.
- [ ] **Original high-res campus photo**: the venue image is cropped from the final poster (IMG-20260923-WA0029.jpg), 1024 px wide.
- [ ] **Venue street address**: not sourced (the mockup address is unconfirmed).
- [ ] **FAQ answers** still missing: cross-college teams, what to bring for the offline finale, rules, and eligibility details beyond "students from SRMCEM and other colleges".
- [ ] **Open Graph image**: none yet (needs an approved image and the production URL).

## Deliberately not on the page (per brief + parent instructions)
Headcount stats and "24h/36h" claims, mockup times/dates/fees/per-prize amounts, Day 0–3 schedule, "Gigabit LAN / Chai Bar", Mind You Infotech, Hacker Pass generator, free stay & food, WhatsApp chat content and group links, the entry-pass PDF, phone numbers and personal emails.
