# Homepage update: CEO feedback (design & layout)

New page order: Hero → What you get → Roles & pricing → Recruitment → Managed workplace → How to start → FAQ → Contact.
Files changed: `public/index.html`, `public/app.js` (role tabs removed, photo loader added). New: `public/sections.css`, `public/assets/photos/placeholders/*.svg`.
Brand colours, fonts, header, splash, contact page and API are untouched.

## Adding real photos (item 3)
Drop files into `public/assets/photos/` named exactly: `office`, `workstation`, `hr`, `team`, `interview` (.jpg, .webp or .png, ~4:3).
Each placeholder swaps to the real photo automatically; no code change. Replace the hero image (`public/assets/workplace-conversation.webp`) with a real EMSIT photo too; its "illustrative" caption in `index.html` should then be removed.

## Please confirm before launch (not in the original site, so deliberately not claimed)
- Pricing: the three monthly figures and savings % are the site's existing "illustrative" numbers. Add timelines, fees, contract terms or minimums only once confirmed.
- Recruitment: stage descriptions are generic. Add real specifics (assessment formats, shortlist size, turnaround) if wanted.
- Workplace: office/equipment/HR wording is limited to what the FAQ already states (package-dependent items are tagged). Real facts (location, seats, hardware, HR support) would strengthen it.
- Known issue found (pre-existing): `app.js` and `motion.js` both declare `const intro`, so `motion.js` errors and its effects (progress bar, hero tilt) do not run. Not changed here.
