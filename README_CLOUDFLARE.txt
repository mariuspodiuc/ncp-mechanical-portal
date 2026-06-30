NCP Mechanical Pro Portal v1.0

DEPLOY ON CLOUDFLARE PAGES, NOT WORKERS.

GitHub repository root must contain:
index.html
style.css
app.js
logo.jpg
manifest.json
sw.js
README_CLOUDFLARE.txt

Cloudflare settings:
Framework preset: None
Build command: leave empty
Build output directory: /
Root directory: /

Current features:
- Professional tablet-first dashboard
- Daily Start Briefing form
- Operative dropdown list
- Admin operative list
- Full-screen tablet signature pad
- Signature inserted directly inside the PDF attendance table row
- Daily PDF export
- Monthly PDF export
- Local storage
- PWA install support
- Offline cache support

PDF export:
Open Daily Start Briefing, add operatives, tap signature box, save signature, then press Daily PDF Export.
Choose Save as PDF from the print screen.
