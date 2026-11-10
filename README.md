# Beyond the Frame

Desktop-only museum role-playing concept landing page, Supabase waitlist, consent-based visit analytics, and a protected research dashboard. Vite + TypeScript + Supabase. Supplied concept screens are in `public/images`.

## Local development

Use Node 22 LTS and npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Landing page: `http://127.0.0.1:5173/`. Dashboard: `http://127.0.0.1:5173/dashboard/`. Without Supabase configuration, the site renders but submission honestly reports that the waitlist is not open. Dashboard numbers are never fabricated.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`. The publishable key is public by design; never put a service-role/secret key in a `VITE_` variable. Run `npm run build` then `npm run preview` for a production preview.

## Supabase setup

1. Create a Supabase project. Apply `supabase/migrations/202611090001_initial.sql` once in its SQL editor, or use the CLI below.
2. Deploy the `collect` Edge Function and its shared validation module. With the Supabase CLI:

   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   supabase secrets set ALLOWED_ORIGINS=https://YOUR_OWNER.github.io,http://127.0.0.1:5173,http://127.0.0.1:4173
   supabase secrets set RATE_LIMIT_SALT=YOUR_LONG_RANDOM_SECRET
   supabase functions deploy collect --no-verify-jwt
   ```

   Origins have no repository path. Remove development origins after testing. Generate the salt with a password manager. Supabase supplies server credentials to the function; never copy them into frontend files. Public collection intentionally requires no visitor login. Validation, a honeypot, bounded bodies, atomic rate limits, and database grants constrain writes. CORS is not authentication. Verify trusted proxy headers on the deployed platform; browser counts are approximate and not bot-proof.
3. Create a project-team user in Supabase Authentication with email/password. Disable public signups. Add that user's UUID through the SQL editor:

   ```sql
   insert into public.admin_users(user_id) values ('ADMIN_AUTH_USER_UUID');
   ```

   Only the SQL editor/service role manages this allowlist. Regular authenticated users cannot access metrics or signup records. The dashboard receives aggregates, not the email list. Authorized staff can manage individual signups through the Supabase project console.
4. Copy the project URL and publishable key into `.env`. Restart Vite. Test a new signup, duplicate signup, qualification response, consented visit, admin login, and unauthorized login.

## GitHub Pages deployment

`.github/workflows/deploy.yml` builds and deploys on pushes to `main` or manual dispatch.

1. Repository **Settings → Pages**: choose **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. These are public configuration, not privileged secrets.
3. Add the production origin to Supabase `ALLOWED_ORIGINS`.
4. Review and merge/push the feature branch to `main`; run the deployment workflow.
5. Open both URLs directly:
   - `https://YOUR_OWNER.github.io/team-520-arts-accessibility/`
   - `https://YOUR_OWNER.github.io/team-520-arts-accessibility/dashboard/`

The landing page has no dashboard link. Its static login shell is public; server-side authorization protects the data. `noindex` is not a security boundary. For a custom domain or owner-level Pages repository, change workflow `VITE_BASE_PATH` to `/` and update allowed origins.

## Measurement definitions

- **Waitlist emails:** one row per trimmed, lowercased email, timestamped server-side. Repeat submissions cannot overwrite existing records.
- **Unique visitors:** distinct random browser IDs with accepted landing-page visits in the date range. Analytics is opt-in; different devices, cleared storage, declined consent, and bots affect estimates. No fingerprinting. Dashboard views do not count.
- **Conversion:** distinct tracked browsers that visited and signed up in the filtered period divided by tracked visitors. Both visit and signup must match the campaign filter. Unmatched signups appear separately.
- **Attribution:** `utm_source`, `utm_medium`, `utm_campaign`, opaque `ref`. First-touch attribution persists with consent; otherwise current-link attribution is attached only at signup.
- **Paid-pilot interest:** museum responses of “Yes”, not purchases or proof of budget.
- **Outreach:** manually enter opaque contact codes, channel, original sent date, campaign, and outcome. A meeting also counts as a reply. Filters use original sent date.
- **QA:** `?internal=1` suppresses visits and the consent banner. Delete any test signups made in production.
- Dates use UTC, inclusive start/exclusive next-day end. Trend shows latest 14 days with signups within the selected period, not zero-filled days.

## Privacy and deletion

Privacy information and analytics controls are available from the footer. A new signup receives an unguessable private deletion code; only its hash is stored. The code deletes the signup, qualification response, and linked browser events through **Privacy & data**. Anyone holding it can delete that signup. Retries in the same page preserve the original code. Separate duplicate submissions receive an unlinked code that cannot modify the original record; keep your original code if already registered. The generic acknowledgement avoids disclosing registered emails.

No emails are automatically sent. Before outreach, establish a monitored reply address for unsubscribe/deletion requests and review the privacy copy. Suggested operational policy: review/delete unneeded leads and analytics after 90 days; this is not an automatic deletion promise. Rate-limit records contain daily salted address hashes and are cleaned after one day during subsequent requests.

## Verification

```sh
npm test
npm run build
npm run test:e2e
```

Browser tests use installed Google Chrome by default (set `PLAYWRIGHT_CHANNEL=chromium` to use a separately installed Playwright Chromium). They cover the desktop landing page and desktop/mobile dashboard against an unconfigured local backend; leave Supabase variables empty in `.env` for these tests. They cover layout, image loading, roles, audience requirements, unavailable-backend behavior, consent, and a locked dashboard. Before public deployment, run `supabase/tests/security.sql` in a test project and smoke-test real Auth + Edge Function + database behavior. Live Supabase verification requires project credentials.

## Research round

Contact 30 relevant museum education staff over two weeks, using links such as `?utm_source=outreach&utm_medium=email&utm_campaign=museum_pilot&ref=m017`. Record actual replies and meetings; visits do not imply an email was read. Directional thresholds: six substantive replies, three conversations, two museums willing to discuss paid pilots and budget processes. Keep visitor enthusiasm separate from buyer evidence.

See `docs/outreach.md` for a message template and `docs/progress.md` for implementation decisions.

The landing page uses a desktop layout with a 1200px minimum width and a desktop viewport on phones; there is no separate mobile landing layout. The dashboard retains its responsive layout.
