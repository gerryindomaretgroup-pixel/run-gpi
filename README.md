# Run

Dashboard jadwal Full Marathon GPI. Laporan Google Form + rekam GPS terpisah.

## Jalanin lokal

```bash
npm install
npm run dev
```

http://localhost:5174/

Sheet di-proxy lewat `/gexport` (Vite lokal, Cloudflare Functions di hosting).

## Hosting Cloudflare Pages (gratis)

1. Repo GitHub publik
2. [dash.cloudflare.com](https://dash.cloudflare.com) → **Sign in with GitHub** (gratis, tanpa kartu)
3. **Workers & Pages** → **Create** → **Pages** → Connect repository `run-gpi`
4. Build: `npm run build` · Output: `dist` · Node: `22`

Setelah itu link tetap, contoh: `https://run-gpi.pages.dev`

