NCP Mechanical Web Portal

Files included:
- index.html
- style.css
- app.js
- logo.jpg

Improvements included:
- More professional dashboard design
- Better responsive mobile layout
- Cleaner forms and tables
- Status badges
- Local browser storage
- JSON backup export
- Section PDF exports
- Daily PDF report export
- Monthly PDF report export
- CIS invoice PDF export
- Daily briefing PDF export

How to publish on Cloudflare Pages:
1. Create a free GitHub account.
2. Create a new repository.
3. Upload index.html, style.css, app.js and logo.jpg.
4. Create a free Cloudflare account.
5. Go to Workers & Pages > Create > Pages.
6. Connect your GitHub repository.
7. Build command: leave blank.
8. Output folder: leave blank or use /.
9. Click Deploy.

Important:
PDF export uses jsPDF and jsPDF AutoTable from CDN links, so the PDF buttons need internet access.
Data is saved only in the user's browser. For multi-user live database storage, add Cloudflare D1 or Firebase.
