# Run

Dashboard jadwal Full Marathon GPI. Laporan Google Form + rekam GPS terpisah.

## Jalanin lokal

```bash
npm install
npm run dev
```

http://localhost:5174/

Sheet di-proxy lewat `/gexport` (Vite lokal, Cloudflare Functions di hosting).

## Hosting Cloudflare (gratis)

Project ini disambung sebagai **Worker** `run-gpi` (bukan Pages).

Di Cloudflare → Settings → Build:

- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- **Root directory:** `/`

Setelah sukses, URL biasanya `https://run-gpi.<akun>.workers.dev`

