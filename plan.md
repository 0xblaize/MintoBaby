# API-ready authentication and subscriptions

1. Remove all browser-fabricated login behavior from `web/src/pages/LoginPage.tsx`.
   - Keep Google OAuth as the only login method.
   - Send the OAuth token through the existing backend auth flow and persist only the returned server user/session.
   - Remove admin shortcuts, dummy emails, generated email tokens, and misleading placeholder text.
   - Use `AuthContext.signInWithGoogle` so auth state and storage stay consistent.

2. Centralize frontend API/auth storage in `web/src/api.ts` and `web/src/context/AuthContext.tsx`.
   - Add typed subscription checkout methods for Stripe and on-chain payment initiation/verification.
   - Include the authenticated activation/session identifier in requests as required by the existing backend contract.
   - Stop treating localStorage flags as proof of payment; use server responses for redirect decisions.

3. Replace demo subscription behavior in `web/src/pages/SubscribePage.tsx`.
   - Keep plan selection and billing UI.
   - Stripe button calls the backend to create a checkout session, then redirects to the returned URL.
   - Crypto option displays backend-provided payment instructions and verifies the submitted transaction hash through the backend.
   - Remove `setTimeout`, local subscription fabrication, and the fallback that accepts any `MINTO-` key when the API is unavailable.
   - Preserve activation-key verification, but require the backend response and store only server-confirmed activation state.

4. Add backend subscription endpoints under `api/routers/`.
   - Typed request models for plan, billing cycle, and payment method.
   - Stripe checkout-session creation using server-side configuration and no secret keys in the frontend.
   - Stripe webhook endpoint with signature verification and server-side subscription persistence.
   - On-chain payment initiation/instructions and transaction verification using the existing payment verifier where possible.
   - Return a consistent subscription status shape for the frontend.

5. Update configuration/dependencies and test the auth/subscription contracts.
   - Add required Stripe backend dependency/configuration without hardcoding secrets.
   - Add focused API tests for invalid requests, Stripe signature handling, and crypto verification boundaries.
   - Run frontend build and backend tests; report any unrelated existing failures separately.
