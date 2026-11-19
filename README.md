# EX3D Service

Two-tab luxury storefront for Exaucé X3D / EX3D Service. Visitors can browse the portfolio and services, inquire about an item, and submit an order to WhatsApp and email. Catalog editing is available only in the authenticated owner area at `/admin`.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Configure order delivery

Create `.env.local` in the project root (you can start from `.env.example`):

```env
NEXT_PUBLIC_WHATSAPP_NUMBER=33600000000
NEXT_PUBLIC_WEB3FORMS_KEY=your_access_key
NEXT_PUBLIC_ORDER_EMAIL=contact@ex3d-service.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Use the WhatsApp number in international format with digits only: country code followed by the number, without `+`, spaces, or punctuation. Replace the sample value with the studio's number.

`NEXT_PUBLIC_ORDER_EMAIL` is optional and sets the recipient of the direct `mailto:` fallback link.

To configure email delivery, create a free form at [Web3Forms](https://web3forms.com/) and use its access key as `NEXT_PUBLIC_WEB3FORMS_KEY`. Web3Forms routes submissions to the email address verified for that access key. Without a key, WhatsApp still opens and the confirmation screen offers a direct email link and a copyable order summary.

Both variables use the `NEXT_PUBLIC_` prefix because the order form runs in the browser. The Web3Forms access key is therefore visible to visitors; use the provider's domain restrictions and anti-spam controls for production.

## Owner Login And Cloud Catalog

The public storefront has no catalog editing controls. The private `/admin` route uses Supabase email/password Auth; only the Supabase user whose UUID is registered in `public.ex3d_admins` can manage items. The Supabase anon key is public by design. Row Level Security enforces authorization for database writes and Storage uploads independently of the UI.

1. Create a Supabase project and add its Project URL and anon/public key to `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Restart the dev server after changing environment variables.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor. It creates the catalog, dynamic category and owner tables, RLS policies, public image bucket and Realtime publication. It also migrates the old fixed category constraint to a foreign key that cascades category renames.
3. In Supabase Authentication, create the owner's email/password account for Exaucé X3D. Keep public sign-up disabled for the private dashboard.
4. Copy that user's UUID from Authentication > Users, then run this once in SQL Editor, replacing the example UUID with the owner's actual Auth user ID:

	```sql
	insert into public.ex3d_admins (user_id)
	values ('00000000-0000-0000-0000-000000000000');
	```

5. Open `/admin` and sign in with that account. The five default categories are seeded by the schema; choose “Restaurer les offres initiales” once to seed the cloud table with the eight EX3D offerings. Manage categories in the “Gérer les catégories” section. Renaming a category updates its items; deleting requires reassigning its items to another category. Changes appear in Realtime for visitors.

Without Supabase variables, `/admin` shows setup guidance and the public site uses the default catalog, cached in localStorage. Editing is intentionally disabled until secure authentication and RLS are configured; there is no local-only admin bypass. Supabase image uploads require the `ex3d-assets` bucket/policies created by the schema.

The Web3Forms key is client-visible because the order form submits from the browser; apply provider-side origin restrictions and anti-spam controls. Never put a Supabase service-role key in `NEXT_PUBLIC_*` variables or browser code.

## Customize Defaults

Edit `src/data/services.ts` to change the eight default offerings, categories, descriptions, prices, and deliverables. The category labels are the exact supported filter values. CSS preview styles are `branding`, `audio`, `cinema`, `identity`, `motion`, `space`, `lettering`, and `product`; image URLs or Supabase Storage uploads can replace these previews in owner mode.

## Deploy

Deploy to [Vercel](https://vercel.com/) by importing the repository, or use [Netlify](https://www.netlify.com/) with its Next.js runtime support. Add WhatsApp, Web3Forms, optional order email, Supabase URL and Supabase anon key variables to the hosting provider, then redeploy. Do not commit `.env.local` or service-role credentials.

## Checks

```bash
npm run lint
npm run build
```
