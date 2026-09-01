# Run

Dashboard jadwal Full Marathon GPI. Laporan dari Google Form TARGET GPI.

## Stack

- React 19, Vite 8, TypeScript, PapaParse, Chart.js
- `npm run dev` — http://localhost:5174
- `npm run build` — typecheck + build
- `npm run lint` — oxlint

## Alur (opsi A)

1. Jadwal GPI = pacuan yang ditampilkan
2. Google Form = satu-satunya input; menulis otomatis ke sheet jawaban
3. Dashboard menempelkan laporan form ke hari yang cocok

Dua input terpisah:

- Google Form → sheet jawaban (pacuan jadwal)
- GPS HP → `localStorage` di perangkat, tidak masuk form

Hosting produksi: Cloudflare Pages (`run-gpi`). Sheet lewat Function `/gexport`.

## Sumber

- `tampilan/dashboard_lari_interaktif.html` — desain
- `data/spreadsheet.md` — jadwal + sheet jawaban
- `input/google-form.md` — form TARGET GPI
