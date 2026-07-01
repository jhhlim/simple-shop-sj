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

Payment providers only charge per transaction — there is no platform subscription.

## How shipping works

- Every order adds a **$5 flat shipping fee** at checkout.
- The site tells customers: **we pack your order and ship it to the address you provide** ($5 flat shipping on every order).

## Data storage

Products and orders are stored as JSON files in `data/`. Uploaded images go to `public/uploads/`. This keeps the setup simple and free — no database required for small catalogs.

> **Note:** On serverless hosts (e.g. Vercel), the filesystem is ephemeral. For production, consider mounting persistent storage or switching to a database. For local or VPS hosting, file storage works as-is.

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
