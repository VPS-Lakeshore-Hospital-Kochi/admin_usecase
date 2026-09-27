# Vendored browser libraries

Loaded on demand by `shared/claude.js` (only when a user uploads a file or downloads a Word document).
Copied unmodified from npm.

| File | Package | Version | Licence | Used for |
|---|---|---|---|---|
| `docx.iife.js` | [docx](https://github.com/dolanmiu/docx) | 9.7.2 | MIT | Branded Word (.docx) downloads |
| `xlsx.full.min.js` | [xlsx (SheetJS CE)](https://github.com/SheetJS/sheetjs) | 0.18.5 | Apache-2.0 | Reading .xlsx/.xls uploads |
| `mammoth.browser.min.js` | [mammoth](https://github.com/mwilliamson/mammoth.js) | 1.13.0 | BSD-2-Clause | Reading .docx uploads |
| `pdf.min.js`, `pdf.worker.min.js` | [pdfjs-dist](https://github.com/mozilla/pdf.js) | 3.11.174 | Apache-2.0 | Reading text-based .pdf uploads |
