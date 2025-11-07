# SizeEasy - AI-Powered Size Comparison Platform 🚀

> **Compare anything in the universe with AI-powered accuracy**
> Dynamic size comparisons • 3D visualization • AR exploration

![SizeEasy](https://img.shields.io/badge/Status-Production%20Ready-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🎯 Project Vision

SizeEasy is an AI-powered interactive size comparison platform that lets users compare **any two objects in the universe**. From atoms to galaxies, cars to buildings, animals to spacecraft - just type it in and get instant, accurate comparisons with stunning 3D visualizations.

## ✨ Core Features

### 🤖 AI-Powered Dynamic Comparisons
- **Type Anything**: No pre-loaded database - compare ANY two objects
- **OpenAI Integration**: Fetches accurate real-world dimensions using GPT
- **Smart Caching**: Intelligent comparison cache reduces API costs by 60%+
- **Imperial Units**: All measurements in feet/inches and pounds/tons for accessibility

### 🎨 Rich Visualizations
- **Side-by-Side Comparison**: Vivid gradient boxes with emojis and animations
- **3D Interactive Viewer**: Rotate, zoom, and explore comparisons in real-time 3D
  - Built with Three.js and React Three Fiber
  - Dynamic lighting and shadows
  - Touch controls for mobile
  - Auto-orbit mode
- **AR Exploration** (WebXR): View comparisons in your real environment
- **Mind-Blowing Facts**: Real-world analogies (Statue of Liberty, basketball courts, school buses)

### 💰 Monetization System
- **Credit-Based**: Free users get 5 credits/day (resets at midnight)
- **First-Time Bonus**: 10 free credits for new users
- **Premium Subscriptions**:
  - $3.99/month or $29.99/year
  - Unlimited comparisons
  - Higher quality 3D models
  - No watermarks
- **Viral Growth Mechanics**:
  - +2 credits for sharing comparisons
  - +10 credits for successful referrals
  - +1 credit when your comparison gets 100+ views

### 🔒 Cost Protection System
- **5-Layer Defense**: Prevents runaway API costs
  - Pre-request validation with spending limits
  - Token bucket rate limiting (Upstash Redis)
  - Smart request queueing
  - Circuit breaker for cost spikes
  - Abuse detection and auto-blocking
- **Real-Time Monitoring**: Admin dashboard for cost tracking
- **Emergency Kill Switches**: Manual controls for instant shutdown

### 🎮 User Experience
- **Authentication**: Supabase Auth with email/password
- **Real-Time Credits**: Live credit counter with daily reset timer
- **Shareable Links**: Every comparison gets a unique URL
- **Dark/Light Theme**: Full theme support
- **Mobile-First**: Responsive design with touch controls
- **Smooth Animations**: Framer Motion for delightful interactions

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **3D Engine**: Three.js + React Three Fiber + Drei

### Backend & Infrastructure
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe (subscriptions + one-time purchases)
- **AI**: OpenAI GPT-4 (dimension fetching)
- **3D Models**: Meshy AI (text-to-3D generation)
- **Rate Limiting**: Upstash Redis
- **Deployment**: Vercel

### APIs & Services
- `/api/comparison/create` - Create/fetch comparison with caching
- `/api/credits/check` - Check user credit balance
- `/api/credits/share-reward` - Award sharing credits
- `/api/credits/referral-signup` - Handle referral signups
- `/api/stripe/create-checkout` - Create Stripe checkout session
- `/api/stripe/webhook` - Handle Stripe webhooks
- `/api/generate-3d-model` - Generate 3D models via Meshy
- `/api/admin/costs` - Real-time cost monitoring dashboard
- `/api/admin/controls` - Emergency controls and circuit breaker

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sizeeasy.git
cd sizeeasy

# Install dependencies
npm install --legacy-peer-deps

# Set up environment variables (see .env.example)
cp .env.example .env
# Edit .env and add your API keys

# Run development server
npm run dev

# Open http://localhost:3000
```

## 🔑 Required Environment Variables

See `.env.example` for the complete list. Critical variables:

```env
# OpenAI (for AI-powered dimensions)
OPENAI_API_KEY=sk-...

# Supabase (database + auth)
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Admin Configuration
ADMIN_EMAILS=admin@example.com,admin2@example.com

# Meshy AI (3D model generation - optional)
MESHY_API_KEY=...

# Cost Protection Limits (see config/costProtection.ts for all options)
MAX_DAILY_SPEND=10
MAX_HOURLY_SPEND=2
MAX_REQUEST_COST=0.10
```

## 📁 Project Structure

```
sizeeasy/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── comparison/create/    # Main comparison API
│   │   ├── credits/              # Credit management
│   │   ├── stripe/               # Stripe integration
│   │   └── admin/                # Admin dashboards
│   ├── compare/[slug]/           # Dynamic comparison pages
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── HeroNew.tsx               # Landing page hero
│   ├── DynamicComparison.tsx     # Main comparison component
│   ├── Comparison3DViewer.tsx    # 3D viewer
│   ├── ComparisonARViewer.tsx    # AR viewer
│   ├── Navigation.tsx            # Top navigation
│   ├── AuthModal.tsx             # Login/signup modal
│   ├── CreditDisplay.tsx         # Credit counter
│   ├── UserMenu.tsx              # User dropdown menu
│   ├── PremiumUpgradeModal.tsx   # Premium upgrade UI
│   ├── ShareButtons.tsx          # Social sharing
│   ├── ErrorBoundary.tsx         # Error boundary components
│   └── ThemeProvider.tsx         # Dark/light theme provider
├── lib/                          # Utilities and logic
│   ├── ai-dimensions.ts          # OpenAI dimension fetching
│   ├── comparison-cache.ts       # Comparison caching logic
│   ├── credits.ts                # Credit system
│   ├── objects.ts                # Object utilities & emojis
│   ├── analytics.ts              # Event tracking
│   ├── watermark.ts              # Free tier watermarks
│   ├── redis-client.ts           # Redis client (with mock)
│   ├── meshy.ts                  # 3D model generation
│   ├── logger.ts                 # Centralized logging system
│   ├── env.ts                    # Environment validation
│   ├── costProtection/           # 5-layer cost protection
│   ├── auth/                     # Authentication utilities
│   │   └── admin.ts              # Admin authentication
│   ├── supabase/                 # Supabase clients
│   └── types/                    # TypeScript types
├── config/                       # Configuration
│   └── costProtection.ts         # Cost limit settings
├── supabase/                     # Database
│   └── migrations/               # SQL migrations
├── scripts/                      # Utility scripts
│   └── cost-simulator.ts         # Test cost protection
└── public/                       # Static assets
```

## 🏗️ Infrastructure Components

### Logging System (`lib/logger.ts`)
Production-ready centralized logging with structured output:
```typescript
import { logger } from '@/lib/logger'

logger.info('User logged in', { userId: '123' })
logger.error('API failed', error, { endpoint: '/api/comparison' })

// Module-specific logger
const compareLogger = logger.child({ module: 'comparison' })
```

### Environment Validation (`lib/env.ts`)
Validates all environment variables at startup:
- Required vs optional variable checking
- URL format validation
- Type-safe access to env vars
- Environment-specific requirements (dev vs prod)

### Error Boundaries (`components/ErrorBoundary.tsx`)
React error boundaries for graceful error handling:
- Full-page error boundary
- API-specific error fallbacks
- Component-level error recovery
- Integration with logging system

### Admin Authentication (`lib/auth/admin.ts`)
Secure admin route protection:
- Email-based admin authentication
- Database flag support (`is_admin` column)
- Audit logging for admin actions
- Used in `/api/admin/*` routes

## 🎯 How It Works

### 1. User Flow
1. User types any two objects (e.g., "BMW X4" vs "Boeing 757")
2. App checks cache for existing comparison
3. If not cached, OpenAI fetches accurate dimensions
4. Result is displayed with side-by-side visualization
5. User can switch to 3D or AR mode
6. User can share (earn credits) or upgrade to premium

### 2. Credit System
- Free users: 5 credits/day (auto-reset at midnight UTC)
- Each comparison costs 1 credit
- Premium users: Unlimited (bypasses credit checks)
- Bonus credits for sharing, referrals, viral content

### 3. Cost Protection
- Hard spending limits ($10/day, $2/hour)
- Rate limiting (2 req/min for free, 10 req/min for premium)
- Circuit breaker auto-shutdown on anomalies
- Request queue with priority (premium > free)
- Abuse detection (blocks rapid-fire, spam, API sharing)

## 🚀 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Database Setup (Supabase)

1. Create a new Supabase project
2. Run the migration: `supabase/migrations/001_initial_monetization_schema.sql`
3. Enable Row Level Security (RLS)
4. Add environment variables to Vercel

### Stripe Setup

1. Create Stripe account
2. Create products for monthly/yearly subscriptions
3. Set up webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
4. Add webhook secret to environment variables

### Upstash Redis Setup

1. Create Upstash account
2. Create a Redis database (Edge-compatible)
3. Copy REST URL and token to environment variables

## 📊 Performance & Monitoring

### Key Metrics
- **Cache Hit Rate**: Target 40%+ after 1 month
- **API Cost Savings**: 60%+ through caching
- **Response Time**: <100ms for cached, <3s for new
- **Core Web Vitals**: All green
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1

### Admin Dashboards
- **Cost Dashboard**: `GET /api/admin/costs`
  - Real-time spend tracking
  - Budget utilization
  - Cache statistics
  - Circuit breaker status
- **Controls**: `POST /api/admin/controls`
  - Emergency shutdown
  - Circuit breaker trigger/reset
  - Cache-only mode
  - Maintenance mode

## 🧪 Testing

### Cost Protection Testing
```bash
# Run cost simulator (no real API calls)
npm run cost-simulator -- normal      # Normal load
npm run cost-simulator -- surge        # Traffic surge
npm run cost-simulator -- abuse        # Abuse detection
npm run cost-simulator -- cost-spike   # Cost anomaly
```

## 📝 Documentation

- **CODEBASE_AUDIT_REPORT.md** - Comprehensive audit & refactoring report
- **MONETIZATION_IMPLEMENTATION.md** - Complete monetization system docs
- **MONETIZATION_SETUP.md** - Step-by-step setup guide
- **COST_PROTECTION_SYSTEM.md** - Cost protection architecture
- **COST_PROTECTION_AUDIT.md** - Initial audit findings
- **SETUP.md** - General setup instructions
- **DEPLOYMENT.md** - Production deployment guide
- **VERCEL_SETUP_GUIDE.md** - Vercel-specific instructions

## 🎯 Roadmap

### ✅ Completed
- [x] Dynamic AI-powered comparison generator
- [x] OpenAI integration for dimensions
- [x] 3D interactive viewer (Three.js)
- [x] AR exploration (WebXR)
- [x] User authentication (Supabase)
- [x] Credit system with daily limits
- [x] Premium subscriptions (Stripe)
- [x] Comparison caching
- [x] Multi-layer cost protection
- [x] Rate limiting
- [x] Social sharing rewards
- [x] Referral system
- [x] Dark mode
- [x] Mobile responsive design
- [x] Centralized logging system
- [x] Environment validation
- [x] Error boundaries
- [x] Admin authentication

### 🚧 In Progress
- [ ] User dashboard with comparison history
- [ ] Popular/trending comparisons feed
- [ ] Email notifications
- [ ] Advanced analytics

### 📅 Future
- [ ] AI-generated comparison images (DALL-E/Midjourney)
- [ ] Voice input for comparisons
- [ ] Collaborative comparisons
- [ ] Achievement/badge system
- [ ] Community challenges
- [ ] API for developers
- [ ] Mobile app (React Native)
- [ ] Multi-language support

## 💡 Key Architecture Decisions

### Why Dynamic vs Database?
Originally used a fixed object database, but switched to **dynamic AI-powered lookups** to enable comparing ANYTHING. This creates unlimited content possibilities and better user experience.

### Why Credits vs Freemium?
Credits create urgency and value perception while preventing API abuse. The daily reset encourages return visits (engagement).

### Why 5-Layer Cost Protection?
After initial audit showed potential for $5,000+ surprise bills, implemented defense-in-depth approach. Better to have angry users than massive AWS bills.

### Why Supabase?
PostgreSQL + Auth + RLS + Edge Functions in one platform. Scales from 0 to millions without infrastructure management.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 📧 Contact

Questions? Feedback? Reach out!

- Website: [sizeeasy.com](https://sizeeasy.com)
- Twitter: [@sizeeasy](https://twitter.com/sizeeasy)
- Email: hello@sizeeasy.com

---

**Built with ❤️ to make size comparisons fun, accurate, and accessible to everyone**
