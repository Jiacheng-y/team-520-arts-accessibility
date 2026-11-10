# Implementation ledger

Approved scope: museum-focused landing page matching supplied mockups, audience-specific waitlist, optional buyer qualification, consented analytics, protected dashboard at a separate URL, outreach tracking, GitHub Pages deployment, Supabase persistence.

Implemented: presentation and role interactions; validated signup and optional qualification; private deletion receipts; consent-based IDs and source attribution; aggregate metrics behind an admin allowlist; admin-only outreach; deployment workflow and setup instructions.

Ruling: Work in the user's shared checkout on a feature branch, so the implementation is immediately available.
Ruling: No Supabase project was supplied. Show honest unavailable states and document setup; never fabricate successful signups or metrics.
Ruling: Duplicate submissions get an unlinked receipt; existing emails cannot be discovered or overwritten through the public endpoint.
Ruling: Dashboard only reports aggregate data. Anonymous and ordinary authenticated users have no direct table access.
Ruling: Analytics is opt-in; conversions use matched IDs, not total signups divided by visitors.

Verification: input validation tests and initial production build pass. Database test dependency download was declined; live SQL/Auth/Edge Function verification requires a configured project. Further checks in progress.

Review fixes: separated rate-limit buckets by action; preserve signup receipt across same-page retries; explicit duplicate-receipt explanation; preserved image aspect ratios. Local PostgreSQL is installed but cannot start due to missing ICU 74 library, so SQL integration remains unverified.

User scope update: removed responsive tablet/mobile landing layouts. Landing uses a minimum 1200px desktop composition and desktop viewport on phones. Dashboard responsive rules are preserved in its own stylesheet. Removed mobile landing browser project coverage; mobile dashboard coverage remains.

Final verification after desktop-only scope update: 7 validation tests passed; 5 browser tests passed (desktop landing and desktop/mobile dashboard); TypeScript and Vite production build passed; git diff whitespace check passed. Supabase deployment and live integration are still pending project configuration. No emails sent and no site published.


Next.js migration: user requested GitHub hosting with Next.js. Converted both entry points into App Router routes and React components, preserved the Supabase schema/function and desktop landing composition, and switched GitHub Actions to `out/`. Existing Vite-named repository variables remain compatible via workflow fallbacks. Local Next.js settings use `NEXT_PUBLIC_*`. Supabase CLI state found in `supabase/.temp/` is user-owned and excluded from Git without inspection or changes. Browser checks now run against the production static export and repository prefix. Verification in progress.

Next.js migration review: no important new defects; both exported routes use repository-prefixed assets, all 26 inspected asset references resolve, browser APIs run in effects/handlers, and dashboard metrics only appear after authorized RPC success. Nine unit/configuration tests and five exported-site browser checks passed. Live Supabase behavior and production hosting remain unverified.
