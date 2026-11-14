# Takar Budaya

Tata Kalkulasi Partisipasi Budaya — instrumen penghitungan penonton (Metode Jacobs, P = A × D) dan pelaku seni / pendukung.

Built with Vue 3 + Vite.

```bash
nvm use        # Node 20 (see .nvmrc)
npm install
npm run dev    # local dev server
npm run build  # production build -> dist/
```

## Supabase (riwayat / Simpan)

1. Create a Supabase project, open **SQL Editor**, and run every file in `supabase/migrations/`
   in filename order (each file runs once; later files change the table created by earlier ones).
2. Copy `.env.example` to `.env.local` and fill in the project URL and **publishable** (anon) key
   (Dashboard → Project Settings → API Keys). Never use the secret / service_role key.
3. Create the login accounts (there is no sign-up page): Dashboard → **Authentication → Users → Add user →
   Create new user**, enter email + password and tick **Auto Confirm User**. Share the credentials with each user.
4. Dashboard → **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up", and keep
   "Allow anonymous sign-ins" off. Otherwise anyone could create their own account through the API using the public key.
5. For deployment, add the same two values as repository secrets
   (Settings → Secrets and variables → Actions): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

Login is required (`/login`, email + password via Supabase Auth). Every other page redirects to `/login` until
the user signs in, and the database itself only grants access to the `authenticated` role
(`20261114000000_require_login.sql`), so the public key alone cannot read or change data. To remove someone's
access, delete or ban the user under Authentication → Users. Any signed-in user can read, add, edit and delete records. Edit changes data columns only
(`updated_at` is set by a trigger) and opens the calculator at `/?edit=<id>`. Delete is a **soft delete** through the
`hapus_laporan(p_id)` function (or `hapus_laporan_banyak(p_ids)` for bulk delete of selected rows, max 1000): the row gets `deleted_at` and disappears from the app, but stays in the table.
Restore one in the SQL Editor with `update public.laporan_takar set deleted_at = null where id = <id>;`
Required fields, the Bidang/UPTD values and length limits are enforced by the database.
The Bidang/UPTD list lives in both `src/data/options.js` and the SQL `CHECK` constraint; change both together.

Deployment: pushing to `main` runs `.github/workflows/deploy.yml`, which builds and publishes `dist/` to GitHub Pages
(repo Settings → Pages → Source must be **GitHub Actions**). The build also writes `dist/404.html`
(a copy of `index.html`) so direct links like `/panduan` load the app on GitHub Pages.

## Structure

- `src/router/index.js` — routes (add new pages here) + page titles
- `src/views/` — one component per page: `KalkulatorView.vue` (`/`), `HistoryView.vue` (`/history`), `LoginView.vue` (`/login`)
- `src/services/supabase.js` — the shared Supabase client (lazy-loaded SDK, persisted login session)
- `src/services/laporan.js` — data access (save, paginated + filtered history)
- `src/composables/useAuth.js` — login state, sign in / sign out; the guard in `src/router/index.js` uses it
- `src/composables/useTakarStore.js` — shared state + all calculations (computed)
- `src/components/` — one component per card, plus `PrintSheet.vue` (A4 report, visible only when printing)
- `src/utils/report.js` — report data shared by the WhatsApp text and the PDF sheet, built from the calculator
  (`store.report`) or from a saved row (`reportFromRow`), so both pages produce identical output
- `src/utils/whatsapp.js` — WhatsApp summary text
- `src/utils/excelExport.js` — Excel export (ExcelJS, lazy-loaded): one sheet per Bidang / UPTD in the layout of
  "FORM PERMOHONAN DATA UNTUK PEMENUHAN TARGET DAERAH" (internal → columns C–D, luar dinas → E–F, JUMLAH row)
  plus a `Rekapitulasi` sheet whose formulas sum each sheet's JUMLAH row. Riwayat exports the selected rows,
  or every row matching the current filters when nothing is selected.
- `src/data/options.js` — quick-area buttons and density options
- `src/assets/style.css` — styles (unchanged from the original)
