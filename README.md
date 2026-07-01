# Lim Resale Shop

A simple, free-to-run online shop for listing **used goods and jewelry**. Customers can browse, add items to cart, and pay with **Stripe (credit card)** or **PayPal**.

No monthly Shopify fee — you host it yourself (locally or on [Vercel](https://vercel.com) free tier).

## Features

- Product catalog with photos, descriptions, and pricing
- Categories: used goods, jewelry, other
- Admin page to add/remove listings (`/admin`)
- Shopping cart
- Checkout with **required** shipping fields: name, email, phone, street, city, state, ZIP, country
- **$5 flat shipping** on every order
- Prominent notice: *we pack your order and ship it to your address*
- Stripe and PayPal checkout
- **Alipay** via Stripe Checkout (enable in [Stripe Dashboard](https://dashboard.stripe.com/settings/payment_methods) → Payment methods)
- **Guest checkout** — no account required
- **Accounts** — username/password or Google sign-in
- **Saved carts** — logged-in users' carts persist in SQLite (`data/shop.db`)

## Quick start

```bash
cd shop
npm install
cp .env.example .env.local
# Edit .env.local with your admin password and payment keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Shop:** `/`
- **Sign in:** `/login` · **Register:** `/register` · **Account:** `/account`
- **Admin:** `/admin` (password from `ADMIN_PASSWORD`)

## Environment variables

Copy `.env.example` to `.env.local`:

| Variable | Description |
|----------|-------------|
| `ADMIN_PASSWORD` | Password for the admin page |
| `STRIPE_SECRET_KEY` | Stripe secret key ([dashboard](https://dashboard.stripe.com/apikeys)) |
| `PAYPAL_CLIENT_ID` | PayPal app client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal app secret |
| `PAYPAL_MODE` | `sandbox` (test) or `live` (production) |
| `AUTH_SECRET` | Session secret — run `openssl rand -base64 32` |
| `AUTH_URL` | `http://localhost:3000` (or your production URL) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret (optional) |

### Google sign-in setup (optional)

1. Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local`

Payment providers only charge per transaction — there is no platform subscription.

## How shipping works

- Every order adds a **$5 flat shipping fee** at checkout.
- The site tells customers: **we pack your order and ship it to the address you provide** ($5 flat shipping on every order).

## Data storage

- **Products & orders:** JSON files in `data/`
- **Users & carts:** SQLite database at `data/shop.db` (created automatically)
- **Sessions:** encrypted JWT cookies (30-day sign-in)

Guests keep their cart in the browser. Signed-in users sync carts to the database and merge with any guest cart on login.

## Shipping & tracking (Shippo)

**Shippo vs Pirate Ship:** Pirate Ship is **free** (you only pay postage). Shippo adds ~**$0.05/label** (or a monthly plan) but gives you **API automation** — one-click labels, tracking emails, and webhooks.

### Automated flow

1. Customer pays (Stripe / PayPal / Alipay)
2. You open **`/admin/orders`** → **Create USPS label (Shippo)**
3. Label PDF opens; tracking is saved; customer gets a **shipped** email (Resend)
4. When USPS scans the package, Shippo webhook fires → **in transit** / **delivered** emails

### Setup

**Shippo** ([goshippo.com](https://goshippo.com)):
1. Create account → Settings → API → copy **API token** → `SHIPPO_API_TOKEN`
2. Add your **ship-from address** env vars (`SHIPPO_FROM_*`)
3. Settings → Webhooks → add `track_updated` → URL shown in `/admin/orders`

**Resend** ([resend.com](https://resend.com)):
1. Verify your domain (required to email customers — `onboarding@resend.dev` only works for your own email)
2. `RESEND_API_KEY` + `SHOP_EMAIL_FROM=Lim Resale <orders@yourdomain.com>`

### Manual fallback

Under each order, **Manual tracking** still works if you prefer Pirate Ship for a specific package.

## Deploy to Vercel (free)

1. Push this repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add the environment variables from `.env.example`
4. Deploy

## Project structure

```
src/app/          Pages and API routes
src/components/   UI components
src/lib/          Products, orders, constants
data/             products.json, orders.json
public/uploads/   Product images
```

## License

Private use — your shop, your listings.
