# Vercel Deployment Steps

## Quick Import Guide

1. **Go to Vercel**: https://vercel.com/new

2. **Sign in with GitHub** (if not already)

3. **Import Repository**:
   - Look for `DartonStaker/barcode-label-generator`
   - Click "Import"

4. **Configure Project**:
   - Framework: Next.js (auto-detected)
   - All other settings should be auto-filled

5. **Environment Variables** (Optional - can add later):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   ```
   *Note: Leave empty if Supabase not set up yet - app will work without it*

6. **Click Deploy**

7. **Wait 2-3 minutes** for build to complete

8. **Your app will be live at**: `https://barcode-label-generator.vercel.app` (or similar)

## Troubleshooting

### Project Not Showing in Dashboard

- Check if you're in the correct team/account (top dropdown)
- Make sure you're signed in to the correct GitHub account
- Try refreshing the page

### Build Fails

- Check build logs in Vercel dashboard
- Ensure `package.json` is correct
- Verify all dependencies are listed

### GitHub Not Connected

- Go to Vercel Settings → Integrations
- Connect GitHub account
- Grant necessary permissions

