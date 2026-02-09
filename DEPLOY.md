# Deploy Bid Estimator to the Web

## Step 1: Create a Free Turso Database (2 minutes)

1. Go to [turso.tech](https://turso.tech) and sign up (free - no credit card)
2. Install the Turso CLI:
   - Windows: `winget install ChiselStrike.Turso` or download from turso.tech
3. Login: `turso auth login`
4. Create database: `turso db create bid-estimator`
5. Get your database URL: `turso db show bid-estimator --url`
   - It will look like: `libsql://bid-estimator-yourname.turso.io`
6. Create an auth token: `turso db tokens create bid-estimator`
   - Save this token securely

## Step 2: Seed the Turso Database

Set the environment variables and run the seed:

```bash
set TURSO_DATABASE_URL=libsql://bid-estimator-yourname.turso.io
set TURSO_AUTH_TOKEN=your-token-here
npm run db:seed
```

## Step 3: Deploy to Vercel (2 minutes)

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub (free)
2. Click "Import Project" or "New Project"
3. Select the `carlosmacineira/bid-estimator` repository
4. In the **Environment Variables** section, add:
   - `TURSO_DATABASE_URL` = your Turso database URL
   - `TURSO_AUTH_TOKEN` = your Turso auth token
   - `DATABASE_URL` = `file:./dev.db` (needed for Prisma schema)
5. Click **Deploy**

Your site will be live at `https://bid-estimator-xxx.vercel.app`!

## Optional: Custom Domain

In Vercel dashboard > Settings > Domains, you can add a custom domain.

## Environment Variables Summary

| Variable | Description | Example |
|----------|-------------|---------|
| `TURSO_DATABASE_URL` | Turso database URL | `libsql://bid-estimator-user.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso authentication token | `eyJhbG...` |
| `DATABASE_URL` | Local SQLite (for Prisma CLI) | `file:./dev.db` |
