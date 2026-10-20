# Website reviews

Production endpoint: `https://kfxhmjbdyovododkndpu.supabase.co/functions/v1/alexandra-reviews`.

This feature uses the existing Free Supabase project `kfxhmjbdyovododkndpu` and isolated `alexandra_*` tables/functions. No new project, subscription, auth users or email delivery are required.

- `GET` lists 20 public reviews at a time, with the total and average rating; `before` loads the next page.
- `POST` accepts name, rating, text, explicit publication consent and an idempotent submission UUID.
- Reviews publish immediately. The client renders content with `textContent` and collects no phone number or email.
- The Edge Function authenticates its public endpoint using the publishable API key, validates input and restricts browser CORS to the production domain. Therefore its gateway JWT setting is false; no user sign-in is needed.
- Database access is server-only: RLS is enabled, anon/authenticated have no table or RPC grants, and the service key is read only from the Edge runtime environment. No service key is present in source or client files.
- A transaction-safe database limit allows one new review per minute and three per 24 hours for a salted IP fingerprint. Plain IPs are not stored or returned. The hash is not exposed. Duplicate retries do not create another review.

For owner moderation, use the Supabase table editor on `public.alexandra_reviews`: set `visible=false` to hide an identified review. Never enable browser update/delete access. Existing unrelated project schemas, auth and functions were not modified.

`reviews.sql` records the applied migration. `reviews-edge.ts` is the deployed Edge source. Use `node --experimental-strip-types tests/reviews-edge-check.mjs` for a network-free handler contract test. The database submit/read/retry/rate-limit path was also checked inside a rolled-back transaction. No fabricated testimonials remain in the database.
