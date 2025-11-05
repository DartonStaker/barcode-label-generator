# Deployment Guide for Vercel

This guide will help you deploy the Barcode Label Generator to Vercel with Supabase integration.

## Prerequisites

1. GitHub account with the repository pushed
2. Vercel account (sign up at https://vercel.com)
3. Supabase account (sign up at https://supabase.com)

## Step 1: Set Up Supabase

### 1.1 Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: barcode-label-generator (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project" (takes 1-2 minutes)

### 1.2 Create the Products Table

1. In your Supabase project, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the contents of `supabase/migrations/001_create_products_table.sql`
4. Click "Run" to execute the migration
5. Verify the table was created by going to **Table Editor** → You should see `products` table

### 1.3 Get Your Supabase Credentials

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

## Step 2: Deploy to Vercel

### 2.1 Import Repository

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click "Import" next to your GitHub repository `barcode-label-generator`
3. If prompted, authorize Vercel to access your GitHub repositories

### 2.2 Configure Project

1. **Project Name**: Keep default or change as needed
2. **Framework Preset**: Should auto-detect "Next.js"
3. **Root Directory**: Leave as `./` (default)
4. **Build Command**: `npm run build` (auto-filled)
5. **Output Directory**: Leave default
6. **Install Command**: `npm install` (auto-filled)

### 2.3 Add Environment Variables

Click "Environment Variables" and add:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Replace with your actual values from Step 1.3**

### 2.4 Deploy

1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Your app will be live at: `https://your-project-name.vercel.app`

## Step 3: Verify Deployment

1. Visit your deployed URL
2. Upload an Excel file to test
3. Check that products are saved to Supabase:
   - Go to Supabase Dashboard → Table Editor → products
   - You should see your uploaded products

## Step 4: Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click **Settings** → **Domains**
3. Add your custom domain
4. Follow DNS configuration instructions

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify `package.json` dependencies are correct

### Supabase Connection Errors

- Verify environment variables in Vercel match Supabase credentials
- Check Supabase project is active (not paused)
- Ensure RLS policies allow operations (check migration file)

### Products Not Saving

- Check browser console for errors
- Verify Supabase table exists and has correct schema
- Check Supabase logs: Dashboard → Logs → API Logs

## Environment Variables Reference

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Supabase Dashboard → Settings → API |

## Next Steps

- Set up authentication if needed (Supabase Auth)
- Configure Row Level Security policies for production
- Set up database backups in Supabase
- Monitor usage in Vercel Analytics

