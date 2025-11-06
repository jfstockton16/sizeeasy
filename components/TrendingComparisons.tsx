'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Heart, Share2, Eye } from 'lucide-react'

interface TrendingComparisonsProps {
  onComparisonClick: () => void
}

const TRENDING_DATA = [
  {
    id: 1,
    title: 'T-Rex vs. Giraffe',
    creator: 'DinoFan2024',
    likes: 15234,
    shares: 3421,
    views: 89234,
    category: 'Animals',
    thumbnail: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 2,
    title: 'Eiffel Tower vs. Empire State',
    creator: 'ArchitectNerd',
    likes: 12891,
    shares: 2876,
    views: 76543,
    category: 'Buildings',
    thumbnail: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: 3,
    title: 'Blue Whale vs. Boeing 747',
    creator: 'OceanExplorer',
    likes: 18765,
    shares: 4123,
    views: 102345,
    category: 'Nature vs Tech',
    thumbnail: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    id: 4,
    title: 'Mount Everest vs. Mariana Trench',
    creator: 'GeologyGeek',
    likes: 9876,
    shares: 1987,
    views: 54321,
    category: 'Geography',
    thumbnail: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  },
  {
    id: 5,
    title: 'Saturn\'s Rings vs. Earth',
    creator: 'SpaceNerd',
    likes: 21543,
    shares: 5432,
    views: 123456,
    category: 'Space',
    thumbnail: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  {
    id: 6,
    title: 'Great Pyramid vs. Statue of Liberty',
    creator: 'HistoryBuff',
    likes: 11234,
    shares: 2345,
    views: 67890,
    category: 'Monuments',
    thumbnail: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  },
]

export default function TrendingComparisons({ onComparisonClick }: TrendingComparisonsProps) {
  return (
    <div id="trending" className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-brand-500" />
            <h2 className="text-3xl font-bold">Trending Comparisons</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            See what the community is loving right now
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TRENDING_DATA.map((comparison, index) => (
            <motion.div
              key={comparison.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={onComparisonClick}
              className="glass rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer group"
            >
              {/* Thumbnail */}
              <div
                className="h-48 relative"
                style={{ background: comparison.thumbnail }}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all" />
                <div className="absolute top-3 right-3 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-xs font-semibold">
                  {comparison.category}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="text-2xl font-bold mb-2">{comparison.title}</div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    by <span className="font-semibold text-brand-500">{comparison.creator}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Eye className="w-4 h-4" />
                    <span>{(comparison.views / 1000).toFixed(1)}k</span>
                  </div>
                  <div className="flex items-center gap-1 text-pink-500">
                    <Heart className="w-4 h-4" />
                    <span>{(comparison.likes / 1000).toFixed(1)}k</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-500">
                    <Share2 className="w-4 h-4" />
                    <span>{(comparison.shares / 1000).toFixed(1)}k</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <button className="px-8 py-3 glass rounded-full font-semibold hover:shadow-xl transition-all hover:scale-105">
            View All Trending →
          </button>
        </motion.div>
      </div>
    </div>
  )
}
