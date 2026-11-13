# Beyond the Frame

Desktop-only museum role-playing concept landing page, Supabase waitlist, consent-based visit analytics, and a protected research dashboard. Next.js App Router + React + TypeScript + Supabase. Supplied concept screens are in `public/images`.

## Local development

Use Node 22 LTS and npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Landing page: `http://127.0.0.1:3000/`. Dashboard: `http://127.0.0.1:3000/dashboard/`. Without Supabase configuration, the site renders but submission honestly reports that the waitlist is not open. Dashboard numbers are never fabricated.

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env`. The publishable key is public by design; never put a service-role/secret key in a `NEXT_PUBLIC_` variable. Run `npm run build` then `npm run preview` for a production preview.

## Supabase setup

1. Create a Supabase project. Apply `supabase/migrations/202611090001_initial.sql` once in its SQL editor, or use the CLI below.
2. Deploy the `collect` Edge Function and its shared validation module. With the Supabase CLI:

   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push --remote
   supabase secrets set ALLOWED_ORIGINS=https://team-520-access-to-arts.github.io,http://127.0.0.1:3000,http://127.0.0.1:4173
   supabase secrets set RATE_LIMIT_SALT=YOUR_LONG_RANDOM_SECRET
   supabase functions deploy collect --no-verify-jwt --use-api
   ```

   Origins have no repository path. Remove development origins after testing. Generate the salt with a password manager. Supabase supplies server credentials to the function; never copy them into frontend files. Public collection intentionally requires no visitor login. Validation, a honeypot, bounded bodies, atomic rate limits, and database grants constrain writes. CORS is not authentication. Verify trusted proxy headers on the deployed platform; browser counts are approximate and not bot-proof.
3. Create a project-team user in Supabase Authentication with email/password. Disable public signups. Add that user's UUID through the SQL editor:

   ```sql
   insert into public.admin_users(user_id) values ('ADMIN_AUTH_USER_UUID');
   ```

   Only the SQL editor/service role manages this allowlist. Regular authenticated users cannot access metrics or signup records. The dashboard receives aggregates, not the email list. Authorized staff can manage individual signups through the Supabase project console.
4. Copy the project URL and publishable key into `.env`. Restart Next.js. Test a new signup, duplicate signup, qualification response, consented visit, admin login, and unauthorized login.

## GitHub Pages deployment

`.github/workflows/deploy.yml` builds and deploys on pushes to `main` or manual dispatch.

1. Repository **Settings → Pages**: choose **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These are public configuration, not privileged secrets.
3. In the Supabase project hosting `collect`, set the Edge Function secret `ALLOWED_ORIGINS` to `https://team-520-access-to-arts.github.io`. Preserve any other required origins as comma-separated values. Do not include the repository path or a trailing slash. For a custom domain, use that domain's origin instead. Updating this secret takes effect without redeploying the function.
4. Review and merge/push the feature branch to `main`; run the deployment workflow.
5. Open both URLs directly:
   - `https://team-520-access-to-arts.github.io/rpg-landing-page/`
   - `https://team-520-access-to-arts.github.io/rpg-landing-page/dashboard/`

The workflow derives `NEXT_PUBLIC_BASE_PATH` from the current repository name, so rerun **Deploy GitHub Pages** after a repository rename or transfer. Verify the repository Actions variables still point to the Supabase project hosting `collect`. The GitHub workflow deploys the frontend only; it does not update Supabase secrets or deploy Edge Functions.

To verify CORS after an ownership change, inspect the browser Network tab for the `OPTIONS` request to `/functions/v1/collect`. It should return `204` with `Access-Control-Allow-Origin: https://team-520-access-to-arts.github.io` when visiting the default Pages domain. A `403` with `Origin not allowed` indicates that the request origin is missing from `ALLOWED_ORIGINS`.

The landing page has no dashboard link. Its static login shell is public; server-side authorization protects the data. `noindex` is not a security boundary. For a custom domain or owner-level Pages repository, change workflow `NEXT_PUBLIC_BASE_PATH` to an empty string and update allowed origins.

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
NEXT_PUBLIC_BASE_PATH=/rpg-landing-page npm run build
NEXT_PUBLIC_BASE_PATH=/rpg-landing-page npm run test:e2e
```

Browser tests use installed Google Chrome by default (set `PLAYWRIGHT_CHANNEL=chromium` to use a separately installed Playwright Chromium). They cover the desktop landing page and desktop/mobile dashboard against the actual static export with an unconfigured backend; leave Supabase variables empty in `.env` for these tests. They cover layout, image loading, roles, audience requirements, unavailable-backend behavior, consent, and a locked dashboard. Before public deployment, run `supabase/tests/security.sql` in a test project and smoke-test real Auth + Edge Function + database behavior. Live Supabase verification requires project credentials.

## Research round

Contact 30 relevant museum education staff over two weeks, using links such as `?utm_source=outreach&utm_medium=email&utm_campaign=museum_pilot&ref=m017`. Record actual replies and meetings; visits do not imply an email was read. Directional thresholds: six substantive replies, three conversations, two museums willing to discuss paid pilots and budget processes. Keep visitor enthusiasm separate from buyer evidence.

See `docs/outreach.md` for a message template and `docs/progress.md` for implementation decisions.

The landing page uses a desktop layout with a 1200px minimum width and a desktop viewport on phones; there is no separate mobile landing layout. The dashboard retains its responsive layout.

## Next.js and GitHub Pages

`next.config.mjs` sets `output: 'export'`, `trailingSlash: true`, and unoptimized local images. `npm run build` produces `out/`; GitHub Actions publishes that directory. There is no Next.js runtime server on GitHub Pages. Supabase remains the backend for all writes, authentication, and aggregate metrics.

Routes are defined in `app/page.tsx` and `app/dashboard/page.tsx`; React interactions live in `components/landing.tsx` and `components/dashboard.tsx`. The desktop landing design and separate dashboard URL are preserved.

`NEXT_PUBLIC_BASE_PATH` is empty for local development and `/rpg-landing-page` for this repository's Pages deployment. Set the same value when building and running the static preview. The public image URLs explicitly include that path. `npm run preview` serves `out/`, not a development server.

For existing deployments, GitHub Actions accepts the old `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` repository variables as fallbacks. New `NEXT_PUBLIC_*` variables take precedence. Local `.env` files must use the new names. Never store service-role keys in either set of public variables.

Hosting policy: GitHub Pages has restrictions on commercial hosting and sensitive transactions, including password submission. Next.js static export does not change those terms. Confirm your intended use is eligible before publishing the password-based dashboard; its database authorization remains enforced by Supabase.

If the initial migration previously failed near `day`, update to the corrected migration and rerun `npx supabase db push --remote`. The initial migration now permits retrying creation of its existing tables, indexes, functions, and outreach policy without deleting stored records. Do not reset the database or mark the failed migration as applied.

## Three-concept landing experiment

`product-format-v1` assigns each new browser with equal probability to:

- `worksheet`: supplied `a.png`, worksheet + audio guide.
- `mobile`: supplied `b.png`, role-playing on visitors’ mobile phones.
- `device`: supplied `c.png`, role-playing on dedicated museum handhelds.

The assignment persists in `localStorage` under `btf:product-format-v1`. Reloading does not reroll. Cleared storage, private browsing, and different devices can produce a new assignment; blocked storage keeps the choice only for the current page. Equal probability does not guarantee exactly equal sample sizes. The initial HTML is a neutral loading shell; JavaScript must run before any product is shown. Only the selected concept's images and copy render, including FAQs and the museum follow-up form. There is no public switcher. As a static site, this is presentation isolation, not secrecy from someone inspecting the downloadable JavaScript or asset files.

Consent remains required for visit analytics. Assignment is a display preference independent of analytics consent. A signup saves the assigned experiment and concept even when analytics is declined. Existing duplicate-email protection preserves the first signup and its original concept. Historical data stays unassigned, never backfilled into this experiment.

The dashboard's **Interest by concept** table separates museum staff, visitors, educators, and other signups; it also reports very interested museums, paid-pilot interest, tracked browsers, and matching tracked conversion. Conversion requires the same browser, experiment, concept, date range, and campaign in visit and signup records. Do not divide all signups by consented visitors. Audience is only collected at signup, so these are audience signup counts, not audience-specific conversion rates. This measures expressed interest, not actual museum implementation or on-site engagement.

### Rollout

1. Apply `supabase/migrations/202611090002_product_experiment.sql` after the initial migration. Existing records and permissions are preserved.
2. Deploy the updated `collect` Edge Function. It accepts both legacy and experiment payloads for compatibility.
3. Build and deploy the landing page/dashboard together.
4. Run `supabase/tests/security.sql` and `supabase/tests/experiment.sql` against a test project, then smoke-test one consented visit and signup for each concept.

For local QA, set `localStorage.setItem('btf:product-format-v1', 'worksheet')` (or `mobile` / `device`) in browser developer tools and reload `?internal=1`. This suppresses analytics visits, not signup submissions; use a test backend. Remove that storage key to test random assignment. There are no variant URLs for ordinary visitors to discover.

## Museum pricing A/B test

Mobile and museum handheld concepts now also participate in `museum-pricing-v1`:

- **A (`inquiry`):** submit the museum form to discuss collaboration and receive a quotation.
- **B (`pilot`):** $1,000 for a 30-day exhibition pilot, with an inquiry form. No payment or booking is taken.

On `/`, each mobile/handheld browser is independently assigned an offer with 50/50 probability. The offer persists under `btf:museum-pricing-v1`; blocked storage retains it only for the page session. Worksheet visitors remain outside the pricing test. The original concept assignment remains unchanged. Compare A and B **within each concept**.

Direct outreach/QA pages (prepend your deployment base path):

| Concept | A: inquiry & quotation | B: $1,000 / 30 days |
| --- | --- | --- |
| Mobile | `/museums/mobile/inquiry/` | `/museums/mobile/pilot/` |
| Museum handheld | `/museums/device/inquiry/` | `/museums/device/pilot/` |

Direct links override the displayed assignment for that page without replacing the browser's random assignment. Visits and signups record the offer actually shown. Use distinct `utm_campaign` values for direct outreach versus randomized root traffic; mixing these can bias the comparison. `?internal=1` suppresses analytics, not form submissions.

Both offers use the same layout and required email, museum, role, and contact consent fields, followed by the existing optional qualification step. B repeats the stated price in its paid-pilot question. The dashboard adds a comparison of museum inquiries, paid-pilot interest, tracked browsers, and matched museum conversion for all four combinations. Visits remain opt-in. Conversion uses all consenting browsers in each cell as its denominator, since audience is unknown before submission. A submission expresses interest, not acceptance of a contract or a purchase. Existing duplicate-email protection preserves the original signup and offer; historical records remain outside this experiment.

Before deploying the frontend:

1. Apply `supabase/migrations/202611100001_museum_pricing.sql` after the two existing migrations.
2. Redeploy the `collect` Edge Function and its shared validation module.
3. Run `supabase/tests/pricing.sql`, `experiment.sql`, and `security.sql` in a disposable test project, then verify real submissions.
4. Build and deploy the static frontend using the existing GitHub Pages workflow.

Without configured Supabase, the forms show the existing unavailable-backend message and never claim to save an inquiry.
