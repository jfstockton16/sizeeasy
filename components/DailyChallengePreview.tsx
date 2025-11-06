'use client'

import { motion } from 'framer-motion'
import { Calendar, Award, Users, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function DailyChallengePreview() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [streak, setStreak] = useState(7)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      const diff = tomorrow.getTime() - now.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds })
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(interval)
  }, [])

  const todayChallenge = {
    question: 'Which is bigger?',
    option1: 'Amazon Rainforest',
    option2: 'All of Europe\'s Roads',
    participants: 12847,
  }

  return (
    <div id="challenge" className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-2xl p-8 relative overflow-hidden"
        >
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-purple-600/10 -z-10" />

          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-brand-500" />
                <h2 className="text-2xl font-bold">Daily Size Challenge</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Test your size knowledge and compete with the community!
              </p>
            </div>

            {/* Timer */}
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">New challenge in</div>
              <div className="flex gap-1 text-2xl font-bold font-mono">
                <span>{String(timeLeft.hours).padStart(2, '0')}</span>:
                <span>{String(timeLeft.minutes).padStart(2, '0')}</span>:
                <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          {/* Challenge Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-4">{todayChallenge.question}</h3>
              <div className="grid grid-cols-2 gap-4">
                <button className="p-6 rounded-lg border-2 border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all group">
                  <div className="text-lg font-bold mb-2">{todayChallenge.option1}</div>
                  <div className="text-sm text-gray-500">Click to guess</div>
                </button>
                <button className="p-6 rounded-lg border-2 border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group">
                  <div className="text-lg font-bold mb-2">{todayChallenge.option2}</div>
                  <div className="text-sm text-gray-500">Click to guess</div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4" />
                <span>{todayChallenge.participants.toLocaleString()} participants today</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-brand-500">{streak} day streak! 🔥</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button className="w-full py-4 bg-gradient-to-r from-brand-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all group flex items-center justify-center gap-2">
            Take Today's Challenge
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </div>
  )
}
