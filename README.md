# Finance PWA

Mobile-first personal finance tracker. Next.js 16 App Router, Clerk auth, Supabase database, deploys to Vercel.

## Tech

- **Next.js 16** with App Router & Turbopack (default)
- **Clerk** for auth — note: middleware is now `proxy.ts` in Next 16
- **Supabase** (Postgres) accessed via service-role key from server-only route handlers
- **Tailwind v4** (CSS-first config in `app/globals.css`)
- **Recharts** for charts
- **PWA**: native `app/manifest.ts` + hand-rolled service worker (`public/sw.js`). Registered only in production.

## Setup

1. **Create a Clerk app** at https://dashboard.clerk.com and copy the publishable + secret keys.
2. **Create a Supabase project** at https://supabase.com and copy the project URL + **service_role** key (Settings → API).
3. **Run the SQL** in `supabase/setup.sql` via the Supabase SQL editor.
4. Fill `.env.local`:

   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

5. Install and run:

   ```bash
   pnpm install
   pnpm dev
   ```

   Visit http://localhost:3000 — you'll be redirected to `/sign-in`, then `/add`.

## Scripts

- `pnpm dev` — dev server (Turbopack)
- `pnpm build` — production build
- `pnpm start` — run production build locally
- `pnpm icons` — regenerate placeholder PWA icons (uses `scripts/generate-icons.mjs`)

## Project structure

```
app/
  layout.tsx              ClerkProvider, PWA meta, BottomNav
  page.tsx                redirect → /add
  manifest.ts             native Next 16 PWA manifest
  add/                    primary view (amount → category bottom sheet)
  expenses/               list grouped by month, collapsible
  analytics/              donut + daily bar + top expenses + MoM
  settings/               income management, sign-out
  sign-in/[[...sign-in]]/ Clerk SignIn
  sign-up/[[...sign-up]]/ Clerk SignUp
  api/
    expenses/route.ts          GET, POST
    expenses/[id]/route.ts     DELETE
    incomes/route.ts           GET, POST
    incomes/[id]/route.ts      DELETE

components/   BottomNav, Header, CategoryGrid, ExpenseItem, MonthSwitcher, Toast, ServiceWorkerRegister
lib/          supabase (server-only admin client), categories, format, types, client (browser API helpers)
proxy.ts      Clerk auth gate (Next 16's renamed middleware)
public/sw.js  service worker (shell cache + runtime cache)
public/icons/ placeholder PWA icons — swap for branded ones any time, then run `pnpm icons` to regenerate
supabase/setup.sql  database schema
```

## Notes

- **Service worker is dev-disabled.** It only registers in production builds so it never caches dev HMR.
- **RLS is enabled with no policies** — meaning anon/authenticated access is denied; only `service_role` (used server-side) can read/write. Defense-in-depth in case the anon key is ever exposed.
- **Currency is locked to RSD** (Serbian Dinar). All amounts formatted via `formatRSD`.
- **No webpack-based PWA plugin.** Next 16 builds with Turbopack by default and refuses unknown webpack config, so we hand-roll the small SW + manifest instead. This is also the official Next 16 PWA recommendation.

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import on Vercel.
3. Add all `.env.local` vars in the Vercel project settings → Environment Variables.
4. Deploy. No special config needed.

Once deployed, in Clerk dashboard add your Vercel URL to allowed origins and update sign-in URL to your production domain.
