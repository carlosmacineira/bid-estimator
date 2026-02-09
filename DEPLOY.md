# Deploy Bid Estimator

## One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/carlosmacineira/bid-estimator&env=DATABASE_URL,DIRECT_DATABASE_URL&envDescription=Neon%20Postgres%20connection%20strings&envLink=https://neon.tech&project-name=bid-estimator&repository-name=bid-estimator)

## Manual Setup

### Step 1: Create a Free Neon Database

1. Go to [neon.tech](https://neon.tech) and sign up (free, no credit card)
2. Create a new project (name it `bid-estimator`)
3. Copy the connection string from the dashboard

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Import the `carlosmacineira/bid-estimator` repository
3. Add environment variables:
   - `DATABASE_URL` = your Neon pooled connection string
   - `DIRECT_DATABASE_URL` = your Neon direct (non-pooled) connection string
4. Click Deploy

### Step 3: Set Up Database Tables & Seed Data

After deploying, run locally:

```bash
# Set your Neon connection string
set DATABASE_URL=postgresql://...
set DIRECT_DATABASE_URL=postgresql://...

# Push schema to Neon
npx prisma db push

# Seed materials and sample data
npx tsx prisma/seed.ts
```

Your site will be live at `https://your-project.vercel.app`!

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_DATABASE_URL` | Neon direct connection string (for migrations) |
