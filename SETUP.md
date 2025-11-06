# SizeEasy - AI-Powered Dynamic Comparison Setup Guide

Welcome to the new and improved SizeEasy! This guide will help you get the application up and running with all AI-powered features.

## 🚀 What's New

Your app now features:
- ✨ **Dynamic AI-Powered Comparisons** - Users can type ANY object and get accurate dimensions
- 🎨 **3D Model Generation** - Meshy API creates photorealistic 3D models
- 📱 **Enhanced AR Support** - View comparisons in augmented reality
- 🎯 **Curiosity-Driven UI** - Redesigned home page with instant comparison inputs
- 🚫 **No Accounts/Leaderboards** - Pure exploration experience

## 📋 Prerequisites

You'll need API keys for:
1. **Meshy API** - For 3D model generation (✅ Already configured!)
2. **OpenAI API** - For fetching object dimensions (⚠️ You need to add this)

## 🔑 API Key Setup

### 1. Meshy API (Already Done! ✅)

Your Meshy API key is already configured in `.env.local`:
```
MESHY_API_KEY=msy_iPJWruyA5g9Ogh2HpcCmisI43gEeB3FxqPSq
```

### 2. OpenAI API Key (Required)

#### Get Your OpenAI API Key:

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-...`)

#### Add It to Your Environment:

Open `.env.local` and replace the placeholder:

```bash
# Before
OPENAI_API_KEY=your_openai_api_key_here

# After (example)
OPENAI_API_KEY=sk-proj-abc123def456...
```

#### Pricing Note:
- Uses GPT-4o-mini model (fast and cost-effective)
- Cost: ~$0.01-0.03 per comparison
- Example: 100 comparisons ≈ $1-3

### 3. Alternative: Run Without OpenAI (Testing Mode)

If you want to test the app without OpenAI:
- The app will use fallback dimension estimation
- Dimensions won't be as accurate
- You'll see a note: "estimated dimensions - connect OpenAI API for accurate data"

## 🛠 Installation & Running

### Install Dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

### Run Development Server

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎮 How to Use the New Features

### 1. Compare Anything

On the home page, you'll see two large input boxes:
1. Type any object in the first box (e.g., "BMW X4")
2. Type another object in the second box (e.g., "Boeing 757")
3. Click "Generate 3D Comparison"

### 2. View Modes

Once the comparison loads, switch between:
- **Side by Side** - See detailed specs and fun facts
- **3D View** - Interactive 3D visualization
- **AR Mode** - Augmented reality (mobile only)

### 3. Examples

Try these interesting comparisons:
- `Eiffel Tower` vs `T-Rex`
- `Blue Whale` vs `School Bus`
- `Empire State Building` vs `Great Pyramid`
- `iPhone 15` vs `Credit Card`

## 🏗 Architecture Overview

### Data Flow

```
User Input (e.g., "BMW X4" vs "Boeing 757")
    ↓
AI Service fetches dimensions (OpenAI GPT-4o-mini)
    ↓
3D Model generation starts (Meshy API - optional)
    ↓
Comparison displayed with interactive 3D viewer
    ↓
AR mode available for mobile exploration
```

### Key Files

- **`/app/page.tsx`** - Main page with new UI
- **`/components/HeroNew.tsx`** - Redesigned hero with comparison inputs
- **`/components/DynamicComparison.tsx`** - Dynamic comparison component
- **`/lib/ai-dimensions.ts`** - AI dimension fetching service
- **`/lib/meshy.ts`** - Meshy 3D model generation service
- **`/app/api/fetch-dimensions/route.ts`** - API endpoint for dimensions
- **`/app/api/generate-3d-model/route.ts`** - API endpoint for 3D models

## 🔧 Configuration

### Environment Variables

All environment variables are in `.env.local`:

```bash
# Meshy API (for 3D model generation) - ✅ Configured
MESHY_API_KEY=msy_iPJWruyA5g9Ogh2HpcCmisI43gEeB3FxqPSq

# OpenAI API (for fetching object dimensions) - ⚠️ Required
OPENAI_API_KEY=your_openai_api_key_here

# App URL (development)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Deployment Environment Variables

When deploying to production (Vercel, Netlify, etc.):

1. Add these environment variables in your hosting dashboard:
   - `MESHY_API_KEY`
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (your production URL)

2. Make sure to set the production URL to HTTPS (required for AR)

## 🎨 Customization

### Disable 3D Model Generation

If you want to save on Meshy API costs during testing:

In `/components/DynamicComparison.tsx`, comment out the `useEffect` that triggers 3D generation:

```typescript
// useEffect(() => {
//   if (object1 && object2 && !generatingModels && viewMode === '3d') {
//     generate3DModels()
//   }
// }, [object1, object2, viewMode])
```

The app will still show 3D visualizations using procedural geometry.

### Change AI Model

To use a different OpenAI model, edit `/lib/ai-dimensions.ts`:

```typescript
// Change from gpt-4o-mini to gpt-4o for better accuracy (higher cost)
model: 'gpt-4o', // or 'gpt-4-turbo'
```

## 🐛 Troubleshooting

### "Failed to fetch dimensions"

**Problem:** OpenAI API key is missing or invalid

**Solution:**
1. Check `.env.local` has the correct `OPENAI_API_KEY`
2. Restart the development server after adding the key
3. Verify the key is valid at [OpenAI Platform](https://platform.openai.com/api-keys)

### "3D generation timeout"

**Problem:** Meshy API is taking too long

**Solution:**
- This is normal for complex models (can take 1-3 minutes)
- The app polls every 3 seconds for up to 5 minutes
- If it times out, try a simpler object or try again

### AR Mode shows "Not Available"

**Problem:** AR requires specific devices/browsers

**Solution:**
- iOS: Use Safari on iPhone/iPad with iOS 12+
- Android: Use Chrome browser
- AR requires HTTPS in production
- Test on a real mobile device (not desktop)

## 📱 Deployment Checklist

Before deploying to production:

- [ ] Add `OPENAI_API_KEY` to hosting environment
- [ ] Add `MESHY_API_KEY` to hosting environment
- [ ] Set `NEXT_PUBLIC_APP_URL` to your production HTTPS URL
- [ ] Enable HTTPS (required for AR features)
- [ ] Test on mobile devices for AR
- [ ] Set up monitoring for API costs
- [ ] Configure rate limiting if needed

## 💰 Cost Considerations

### OpenAI (Dimension Fetching)
- Model: GPT-4o-mini
- Cost per comparison: ~$0.01-0.03
- 1000 comparisons ≈ $10-30

### Meshy (3D Model Generation)
- Preview models: Check Meshy pricing
- Generation time: 1-3 minutes per model
- Consider caching popular comparisons

### Optimization Tips
1. Cache dimension results for common objects
2. Reuse 3D models for repeated comparisons
3. Set up Redis/database for production caching
4. Monitor API usage with alerts

## 🎉 You're All Set!

Your app is now configured for dynamic AI-powered comparisons. Users can type anything and explore size differences in 3D and AR!

### Next Steps:
1. Add your OpenAI API key to `.env.local`
2. Run `npm run dev`
3. Open http://localhost:3000
4. Try comparing "BMW X4" vs "Boeing 757"!

---

Need help? Check the code comments or reach out!
