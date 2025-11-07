# 🚀 Vercel Production Setup Guide

## ❗ Current Issue

Your Vercel build is failing because the Supabase environment variables are not configured. The error occurs during the build process when Next.js tries to prerender pages and the middleware attempts to create a Supabase client.

**Error:**
```
@supabase/ssr: Your project's URL and API key are required to create a Supabase client!
```

---

## 📋 Quick Fix Checklist

### Step 1: Add Required Environment Variables to Vercel

Go to your Vercel project → **Settings** → **Environment Variables** and add the following:

---

## 🔑 Required Environment Variables

### 1️⃣ **Supabase Configuration** (REQUIRED - Build will fail without these)

| Variable Name | Value Source | Required |
|--------------|--------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard | ✅ Yes |

**Where to find these values:**

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project (or create one if you haven't)
3. Click **Settings** → **API**
4. Copy the values:
   - **URL**: Your project URL (e.g., `https://abcdefghijklm.supabase.co`)
   - **anon/public key**: The public API key (starts with `eyJ...`)
   - **service_role key**: The secret service role key (starts with `eyJ...`) - Click "Reveal" to see it

**⚠️ CRITICAL:** These three variables are required for the build to succeed!

---

### 2️⃣ **Stripe Configuration** (REQUIRED for payments)

| Variable Name | Value Source | Required |
|--------------|--------------|----------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard | ✅ Yes |
| `STRIPE_SECRET_KEY` | Stripe Dashboard | ✅ Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhooks | ✅ Yes |
| `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID` | Stripe Products | ✅ Yes |
| `NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID` | Stripe Products | ✅ Yes |

**Where to find these values:**

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. **Publishable Key & Secret Key:**
   - Click **Developers** → **API Keys**
   - Copy **Publishable key** (starts with `pk_live_` or `pk_test_`)
   - Copy **Secret key** (starts with `sk_live_` or `sk_test_`)

3. **Webhook Secret:**
   - Click **Developers** → **Webhooks**
   - Click **Add endpoint**
   - Endpoint URL: `https://your-domain.vercel.app/api/stripe/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Click **Add endpoint**
   - Reveal **Signing secret** (starts with `whsec_`)

4. **Price IDs:**
   - Click **Products** → **Pricing**
   - Create two prices (monthly and yearly) if you haven't
   - Copy each **Price ID** (starts with `price_`)

---

### 3️⃣ **AI Service APIs** (REQUIRED for core functionality)

| Variable Name | Value Source | Required |
|--------------|--------------|----------|
| `OPENAI_API_KEY` | OpenAI Platform | ✅ Yes |
| `REPLICATE_API_TOKEN` | Replicate | ✅ Yes |
| `MESHY_API_KEY` | Meshy AI | ✅ Yes |

**Where to find these values:**

1. **OpenAI:**
   - Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Click **Create new secret key**
   - Copy the key (starts with `sk-`)

2. **Replicate:**
   - Go to [https://replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
   - Create or copy your API token (starts with `r8_`)

3. **Meshy:**
   - Go to [https://www.meshy.ai/](https://www.meshy.ai/)
   - Sign up/login → **API Keys**
   - Copy your API key

---

### 4️⃣ **Redis/Upstash** (REQUIRED for rate limiting & cost protection)

| Variable Name | Value Source | Required |
|--------------|--------------|----------|
| `UPSTASH_REDIS_REST_URL` | Upstash Console | ✅ Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console | ✅ Yes |

**Where to find these values:**

1. Go to [https://console.upstash.com/](https://console.upstash.com/)
2. Create a new Redis database (free tier available)
3. Click on your database
4. Copy:
   - **UPSTASH_REDIS_REST_URL** (e.g., `https://xxxxx.upstash.io`)
   - **UPSTASH_REDIS_REST_TOKEN** (the REST token)

---

### 5️⃣ **App Configuration** (REQUIRED)

| Variable Name | Example Value | Required |
|--------------|---------------|----------|
| `NEXT_PUBLIC_APP_URL` | `https://sizeeasy.com` | ✅ Yes |
| `NEXT_PUBLIC_ANALYTICS_ID` | `G-XXXXXXXXXX` (GA4) | ⚠️ Optional |

**Set these to:**
- `NEXT_PUBLIC_APP_URL`: Your production domain (or Vercel URL)
- `NEXT_PUBLIC_ANALYTICS_ID`: Your Google Analytics 4 Measurement ID (optional)

---

### 6️⃣ **Cost Protection & Rate Limiting** (OPTIONAL - Has defaults)

These have default values in the code but can be customized:

| Variable Name | Default | Description |
|--------------|---------|-------------|
| `MAX_DAILY_SPEND` | `10.00` | Max daily spend in USD |
| `MAX_HOURLY_SPEND` | `2.00` | Max hourly spend in USD |
| `MAX_MONTHLY_SPEND` | `200.00` | Max monthly spend in USD |
| `MAX_USER_DAILY_COST` | `0.50` | Max per-user daily cost |
| `EMERGENCY_SHUTDOWN_LIMIT` | `50.00` | Emergency shutdown threshold |
| `ENABLE_COST_PROTECTION` | `true` | Enable cost protection |
| `FREE_REQUESTS_PER_DAY` | `20` | Free tier daily limit |
| `PREMIUM_REQUESTS_PER_DAY` | `500` | Premium tier daily limit |

**You can skip these** - the app has sensible defaults.

---

## 🎯 Step-by-Step Setup in Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. **Go to your Vercel project**
   - Visit [https://vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your `sizeeasy` project

2. **Navigate to Environment Variables**
   - Click **Settings**
   - Click **Environment Variables** in the sidebar

3. **Add Each Variable**
   - Click **Add New**
   - Enter the **Key** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Enter the **Value** (the actual API key/URL)
   - Select which environments:
     - ✅ **Production** (always check this)
     - ✅ **Preview** (optional but recommended)
     - ✅ **Development** (optional)
   - Click **Save**

4. **Repeat for all required variables** listed above

5. **Redeploy**
   - Go to **Deployments**
   - Click the **⋯** menu on your latest deployment
   - Click **Redeploy**
   - ✅ Check "Use existing Build Cache"
   - Click **Redeploy**

---

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# (paste your value when prompted)

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# (paste your value when prompted)

# Repeat for all required variables...

# Redeploy
vercel --prod
```

---

### Option 3: Using .env File (for bulk import)

1. **Create a `.env.production` file locally** with all your production values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_...

# AI Services
OPENAI_API_KEY=sk-...
REPLICATE_API_TOKEN=r8_...
MESHY_API_KEY=...

# Redis
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# App Config
NEXT_PUBLIC_APP_URL=https://sizeeasy.com
```

2. **Import via Vercel CLI:**

```bash
# Pull existing env vars (if any)
vercel env pull .env.production

# Add your new variables to .env.production
# Then push them to Vercel
vercel env add < .env.production
```

**⚠️ Security Note:** Never commit `.env.production` to git! Add it to `.gitignore`.

---

## ✅ Verification Checklist

After adding all environment variables:

- [ ] Added all **Supabase** variables (3 total)
- [ ] Added all **Stripe** variables (5 total)
- [ ] Added all **AI API** keys (3 total)
- [ ] Added **Redis/Upstash** variables (2 total)
- [ ] Added **App URL** variable
- [ ] Triggered a new deployment in Vercel
- [ ] Build succeeded ✅
- [ ] App loads in browser
- [ ] Can create a comparison
- [ ] Payment flow works (if testing)

---

## 🔍 Testing Your Deployment

After deployment succeeds:

1. **Visit your site:** `https://your-site.vercel.app`
2. **Test basic functionality:**
   - Try creating a size comparison
   - Check that images generate
   - Test 3D model generation (if enabled)
3. **Check browser console** for any errors
4. **Test payment flow** (use Stripe test mode)
5. **Monitor Vercel logs** for any runtime errors

---

## 🐛 Troubleshooting

### Build Still Failing?

**Check the build logs in Vercel:**
1. Go to **Deployments**
2. Click on the failed deployment
3. Read the error message

**Common issues:**

| Error | Solution |
|-------|----------|
| "NEXT_PUBLIC_SUPABASE_URL is required" | Double-check variable name spelling in Vercel |
| "Failed to compile" | Check for TypeScript errors locally first |
| "Module not found" | Run `npm install` locally and commit `package-lock.json` |
| Middleware error during build | Environment variables not set correctly |

### Environment Variables Not Working?

1. **Check variable names** - they are case-sensitive!
2. **Ensure "Production" is selected** when adding variables
3. **Redeploy after adding variables** - changes require a new deployment
4. **Check for typos** - `NEXT_PUBLIC_SUPABASE_URL` not `NEXT_PUBLIC_SUPABASE_URI`

### Redis Connection Issues?

- Use **Upstash Redis** (serverless-friendly)
- Make sure you're using the **REST URL and token**, not the Redis connection string
- Upstash free tier is sufficient for development

---

## 💡 What Happens on Your End vs Vercel

### **What You Need to Do:**

1. ✅ Create accounts (Supabase, Stripe, OpenAI, Replicate, Meshy, Upstash)
2. ✅ Get API keys from each service
3. ✅ Add all environment variables to Vercel
4. ✅ Set up Stripe webhook endpoint
5. ✅ Create Stripe products and prices
6. ✅ Configure your Supabase database (tables, auth, RLS policies)

### **What Vercel Does Automatically:**

- ✅ Builds your Next.js app
- ✅ Deploys to global CDN
- ✅ Provides SSL certificate (HTTPS)
- ✅ Handles serverless functions
- ✅ Auto-scales based on traffic
- ✅ Preview deployments for each git push

---

## 🎓 Next Steps After Successful Deployment

1. **Set up your domain:**
   - Go to Vercel → Settings → Domains
   - Add your custom domain (e.g., `sizeeasy.com`)
   - Follow DNS configuration instructions

2. **Configure Supabase:**
   - Set up database tables (users, subscriptions, comparisons)
   - Configure Row Level Security (RLS) policies
   - Enable authentication providers if needed

3. **Test Stripe integration:**
   - Create a test subscription
   - Verify webhook events are received
   - Check Supabase database updates

4. **Set up monitoring:**
   - Enable Vercel Analytics
   - Set up error tracking (Sentry, LogRocket, etc.)
   - Monitor API costs in each service dashboard

5. **Review the main DEPLOYMENT.md:**
   - Follow the monetization setup (Google AdSense)
   - Configure Google Analytics
   - Set up SEO optimizations

---

## 🆘 Still Having Issues?

**Common Solutions:**

1. **Try a fresh deployment:**
   ```bash
   # Clear Vercel cache
   vercel --prod --force
   ```

2. **Check locally first:**
   ```bash
   # Create .env.local with all variables
   npm run build
   npm run start
   ```

3. **Review Vercel function logs:**
   - Go to Vercel Dashboard → Your Project → Functions
   - Check for runtime errors

4. **Verify API quotas:**
   - Check each service (OpenAI, Replicate, Meshy) for API limits
   - Ensure billing is set up if using paid tiers

---

## 📚 Additional Resources

- **Vercel Docs:** [https://vercel.com/docs](https://vercel.com/docs)
- **Next.js Environment Variables:** [https://nextjs.org/docs/app/building-your-application/configuring/environment-variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- **Supabase Docs:** [https://supabase.com/docs](https://supabase.com/docs)
- **Stripe Webhooks:** [https://stripe.com/docs/webhooks](https://stripe.com/docs/webhooks)

---

## 🎉 You're Ready!

Once all environment variables are set:
1. ✅ Build will succeed
2. ✅ App will be live
3. ✅ All features will work
4. ✅ Ready for production traffic

**Good luck with your deployment! 🚀**

---

**Questions?** Check the troubleshooting section above or review the main [DEPLOYMENT.md](./DEPLOYMENT.md) for more details.
