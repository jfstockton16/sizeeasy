'use client'

import { motion } from 'framer-motion'
import { Eye, Share2, Heart, Trophy } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function StatsBar() {
  const [stats, setStats] = useState({
    views: 2847293,
    shares: 187423,
    likes: 456891,
    topCreator: 'SizeMaster3000',
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        views: prev.views + Math.floor(Math.random() * 10),
        shares: prev.shares + (Math.random() > 0.7 ? 1 : 0),
        likes: prev.likes + (Math.random() > 0.5 ? 1 : 0),
      }))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const statItems = [
    { icon: Eye, label: 'Total Views', value: stats.views.toLocaleString(), color: 'text-blue-500' },
    { icon: Share2, label: 'Shares Today', value: stats.shares.toLocaleString(), color: 'text-green-500' },
    { icon: Heart, label: 'Total Likes', value: stats.likes.toLocaleString(), color: 'text-pink-500' },
    { icon: Trophy, label: 'Top Creator', value: stats.topCreator, color: 'text-yellow-500' },
  ]

  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {statItems.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-center gap-3 mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
