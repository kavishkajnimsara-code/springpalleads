# Spring Pal — Lead Generation Website

Mobile-first, conversion-focused lead generation web application for **Spring Pal** (Sri Lanka), built to capture Meta (Facebook & Instagram) ad leads **before** mattress size selection so contact information is safely stored in Supabase even if a visitor leaves before picking dimensions.

---

## Customer Journey

1. **Step 1 — Landing & Lead Capture:** Visitor sees the **50% OFF Mattresses** offer, selects **Mattress Only** or **Divan Bed + Mattress**, enters their Name and Sri Lankan mobile number (`07XXXXXXXX` or `+947XXXXXXXX`), and taps **SELECT SIZE**.
2. **Step 2 — Immediate Lead Persistence:** `POST /api/leads` validates, sanitizes, and normalizes the phone number to `+947XXXXXXXX`, saves the lead immediately to Supabase with `lead_status = 'pending_size'` along with all captured UTM parameters, and returns a short-lived HMAC-SHA256 lead-specific authorization token.
3. **Step 3 — Mattress Size Selection:** Visitor selects exact dimensions in inches (`72 × 36` through `75 × 72`, configurable in `src/config/sizes.ts`) or enters a **Custom Size** (Length × Width in inches). `PATCH /api/leads/[id]/size` verifies the signed token and updates the **same** database row (`lead_status = 'completed'`, `completed_at = now()`).
4. **Step 4 — Thank You Confirmation:** Displays the Spring Pal confirmation message and request summary without showing prices or requiring online payment.

---

## Project Structure

```text
├── public/images/
│   ├── spring-pal-logo.png          # Official Spring Pal logo (from springpal.lk)
│   ├── spring-pal-mattress.webp     # Official Spring Pal mattress photo (from springpal.lk)
│   └── divan-bed-placeholder.svg    # Clearly labeled placeholder (replace with official divan photo)
├── supabase/migrations/
│   └── 202611190001_create_leads.sql
├── src/
│   ├── app/
│   │   ├── api/leads/route.ts               # POST /api/leads (Step 2)
│   │   ├── api/leads/[id]/size/route.ts     # PATCH /api/leads/[id]/size (Step 3)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── LeadForm.tsx
│   │   ├── LeadFunnel.tsx
│   │   ├── LoadingState.tsx
│   │   ├── OfferBanner.tsx
│   │   ├── ProductSelector.tsx
│   │   ├── SizeSelector.tsx
│   │   └── ThankYouScreen.tsx
│   ├── config/
│   │   └── sizes.ts                         # Configurable mattress dimensions
│   ├── lib/
│   │   ├── lead-token.ts                    # Short-lived HMAC-SHA256 lead update tokens
│   │   ├── rate-limit.ts                    # Sliding-window IP rate limiter
│   │   ├── supabase-admin.ts                # Server-only Supabase client
│   │   ├── validation.ts                    # Phone normalization, sanitization & validation
│   │   └── __tests__/lead-logic.test.ts     # Unit tests
│   └── types/
│       └── lead.ts
├── .env.example
└── package.json
```

---

## 1. Supabase Setup

1. Create a new project in [Supabase](https://supabase.com/dashboard).
2. Open **SQL Editor** in your Supabase dashboard and run the migration file:
   `supabase/migrations/202611190001_create_leads.sql`
   *(Or if using the Supabase CLI, run `supabase db push`.)*
3. Verify in **Table Editor** that `public.leads` exists and **Row Level Security (RLS)** is enabled.
   - Public `anon` and `authenticated` roles have **zero** access to `public.leads`.
   - All writes go strictly through Next.js server-side Route Handlers using `SUPABASE_SERVICE_ROLE_KEY`.
4. From **Project Settings → API**, copy:
   - **Project URL** (`SUPABASE_URL`)
   - **service_role secret key** (`SUPABASE_SERVICE_ROLE_KEY`)

---

## 2. Local Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` from `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
3. Generate a strong secret for `LEAD_TOKEN_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Fill in `.env.local`:
   ```env
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   LEAD_TOKEN_SECRET=your-generated-64-char-hex-secret
   LEAD_TOKEN_TTL_MINUTES=30
   ```
   > **Security Note:** Never prefix `SUPABASE_SERVICE_ROLE_KEY` or `LEAD_TOKEN_SECRET` with `NEXT_PUBLIC_`. They must remain strictly server-side.
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000/?utm_source=facebook&utm_medium=paid&utm_campaign=november_sale](http://localhost:3000/?utm_source=facebook&utm_medium=paid&utm_campaign=november_sale).

### Running Checks & Tests

```bash
npm run typecheck
npm run test:unit
npm run build
```

### Verifying the Two-Stage Lead Flow in Supabase

1. **Test incomplete lead retention:**
   - Open the site with UTM params, enter a name and Sri Lankan mobile number (e.g. `077 123 4567`), and click **SELECT SIZE**.
   - Close the browser tab without selecting a size.
   - Check `public.leads` in Supabase: confirm the row exists with `phone_number = '+94771234567'`, `lead_status = 'pending_size'`, `mattress_length = null`, `completed_at = null`, and your UTM fields populated.
2. **Test size update (same record):**
   - Submit Step 1, then select a size (e.g. `75 × 60 inches` or a Custom Size) and click **CONFIRM SIZE**.
   - Check `public.leads` in Supabase: confirm **only one row** exists for that submission, now updated with `lead_status = 'completed'`, `mattress_length`, `mattress_width`, `size_label`, and `completed_at`.

---

## 3. Customizing Assets & Mattress Sizes

- **Divan Bed Image:** Replace `public/images/divan-bed-placeholder.svg` with an official Spring Pal divan bed photo (e.g. `.webp` or `.jpg`) and update `imageSrc` in `src/components/ProductSelector.tsx`.
- **Configurable Mattress Sizes:** Edit `MATTRESS_SIZE_OPTIONS` in `src/config/sizes.ts`.

---

## 4. Vercel Deployment Instructions

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Go to [Vercel](https://vercel.com/new) and import the repository.
3. Framework Preset will be auto-detected as **Next.js**.
4. Under **Environment Variables**, add the following for **Production** (and Preview if desired):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LEAD_TOKEN_SECRET`
   - `LEAD_TOKEN_TTL_MINUTES` (optional, defaults to `30`)
5. Click **Deploy**.
6. After deployment, test the live URL with Meta UTM query parameters:
   `https://your-domain.vercel.app/?utm_source=facebook&utm_medium=paid&utm_campaign=test_campaign`
7. Confirm in Supabase that both `pending_size` and `completed` leads record cleanly.
