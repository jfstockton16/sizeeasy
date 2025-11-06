# SizeEasy - Viral Size Comparison Platform 🚀

> **The internet's most addictive size comparison tool**
> Compare anything, visualize everything. Built to reach 100,000 users in 12 months.

![SizeEasy](https://img.shields.io/badge/Status-MVP-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🎯 Project Vision

SizeEasy is an interactive size comparison platform designed to go viral through:
- **Instant gratification** - Compare anything in seconds
- **Shareable content** - Every comparison is share-worthy
- **Educational fun** - Learn while being entertained
- **Gamification** - Daily challenges, streaks, and achievements

## ✨ Features

### 🎨 Core Features (MVP)
- ✅ Interactive comparison creator with search
- ✅ Multiple visualization modes (side-by-side, overlay, to-scale)
- ✅ Object database with 15+ pre-loaded objects
- ✅ Real-time size calculations and quirky facts
- ✅ Dark/light theme support
- ✅ Mobile-first responsive design
- ✅ Smooth animations and micro-interactions

### 🎮 Engagement Features
- ✅ Daily Size Challenge preview
- ✅ Trending comparisons showcase
- ✅ Live user statistics
- ✅ Social sharing capabilities
- 🚧 User profiles and achievements (Phase 2)
- 🚧 Leaderboards (Phase 2)
- 🚧 AI-generated comparison images (Phase 2)

### 🚀 Growth Features
- ✅ SEO-optimized pages
- ✅ PWA support
- ✅ Performance optimized (Core Web Vitals)
- 🚧 Dynamic OG images for sharing
- 🚧 Email capture for newsletter
- 🚧 Referral system

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State Management**: Zustand
- **AI Images**: Replicate (Stable Diffusion)
- **Analytics**: Vercel Analytics
- **Deployment**: Vercel

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sizeeasy.git
cd sizeeasy

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your API keys

# Run development server
npm run dev

# Open http://localhost:3000
```

## 🔑 Environment Variables

```env
# Replicate API (for AI image generation)
REPLICATE_API_TOKEN=your_replicate_token_here

# Analytics
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

## 📁 Project Structure

```
sizeeasy/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── compare/           # Dynamic comparison pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Hero.tsx
│   ├── ComparisonCreator.tsx
│   ├── ComparisonViewer.tsx
│   ├── ObjectSelector.tsx
│   └── ...
├── lib/                   # Utilities and logic
│   ├── objects.ts         # Object database
│   ├── store.ts           # Zustand store
│   └── ...
└── public/               # Static assets
```

## 🎯 Growth Strategy

### Phase 1: MVP Launch (Weeks 1-2)
- ✅ Core comparison engine
- ✅ 5 preset categories
- ✅ Basic sharing
- ✅ Mobile-optimized

### Phase 2: Viral Loop (Weeks 3-4)
- 🚧 AI-generated images
- 🚧 User accounts
- 🚧 Achievement system
- 🚧 Daily challenges

### Phase 3: Scale (Months 2-3)
- 🚧 API for embeds
- 🚧 Referral program
- 🚧 Premium features
- 🚧 Mobile app

### Success Metrics
- **Viral Coefficient**: Target K-factor > 1.5
- **Activation Rate**: 60% create first comparison
- **D1 Retention**: 40%
- **Share Rate**: 30% of comparisons shared

## 🎨 Design Principles

1. **Dopamine-Driven**: Every interaction feels rewarding
2. **Thumb-Friendly**: One-handed mobile use
3. **Instant Gratification**: Results in <3 seconds
4. **Share-Worthy**: Built-in viral mechanics
5. **Educational**: Learn while having fun

## 🚀 Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

Deploy to Vercel:
```bash
vercel
```

## 📊 Performance Targets

- **Core Web Vitals**: All green
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1
- **Time to First Comparison**: < 3s

## 🤝 Contributing

We're building the internet's favorite size comparison tool! Contributions welcome:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🎉 Roadmap

- [x] Core comparison engine
- [x] Object database
- [x] Visualization modes
- [x] Dark mode
- [x] Mobile responsive
- [ ] AI-generated images
- [ ] User authentication
- [ ] Achievement system
- [ ] Leaderboards
- [ ] API for developers
- [ ] Mobile app (React Native)

## 💡 Ideas for Future Features

- Voice input for object search
- AR mode for real-world comparisons
- 3D object rotation
- Time-based comparisons (historical sizes)
- Celebrity height comparisons
- Custom object creation
- Comparison stories (chains of comparisons)
- Weekly community challenges

## 📧 Contact

Questions? Feedback? Reach out!

- Website: [sizeeasy.com](https://sizeeasy.com)
- Twitter: [@sizeeasy](https://twitter.com/sizeeasy)
- Email: hello@sizeeasy.com

---

**Built with ❤️ to make size comparisons fun, shareable, and addictive**
