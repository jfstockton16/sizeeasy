'use client'

import { motion } from 'framer-motion'
import { Calendar, Award, Users, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function DailyChallengePreview() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [streak, setStreak] = useState(7)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)

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
    correctAnswer: 1, // 1 for option1, 2 for option2
    participants: 12847,
    explanation: 'The Amazon Rainforest covers approximately 5.5 million km², while all of Europe\'s roads combined would only cover about 50,000 km² if laid side by side!'
  }

  const handleAnswerClick = (option: number) => {
    if (showResult) return // Already answered
    setSelectedAnswer(option)
    setShowResult(true)
    if (option === todayChallenge.correctAnswer) {
      setStreak(prev => prev + 1)
    }
  }

  const handleTakeChallenge = () => {
    setShowResult(false)
    setSelectedAnswer(null)
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
                <button
                  onClick={() => handleAnswerClick(1)}
                  disabled={showResult}
                  className={`p-6 rounded-lg border-2 transition-all group ${
                    showResult
                      ? selectedAnswer === 1
                        ? todayChallenge.correctAnswer === 1
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : todayChallenge.correctAnswer === 1
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 opacity-50'
                      : 'border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer'
                  }`}
                >
                  <div className="text-lg font-bold mb-2">{todayChallenge.option1}</div>
                  <div className="text-sm text-gray-500">
                    {showResult
                      ? todayChallenge.correctAnswer === 1
                        ? '✓ Correct!'
                        : selectedAnswer === 1
                        ? '✗ Incorrect'
                        : 'Not selected'
                      : 'Click to guess'}
                  </div>
                </button>
                <button
                  onClick={() => handleAnswerClick(2)}
                  disabled={showResult}
                  className={`p-6 rounded-lg border-2 transition-all group ${
                    showResult
                      ? selectedAnswer === 2
                        ? todayChallenge.correctAnswer === 2
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : todayChallenge.correctAnswer === 2
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 opacity-50'
                      : 'border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer'
                  }`}
                >
                  <div className="text-lg font-bold mb-2">{todayChallenge.option2}</div>
                  <div className="text-sm text-gray-500">
                    {showResult
                      ? todayChallenge.correctAnswer === 2
                        ? '✓ Correct!'
                        : selectedAnswer === 2
                        ? '✗ Incorrect'
                        : 'Not selected'
                      : 'Click to guess'}
                  </div>
                </button>
              </div>

              {/* Show explanation after answering */}
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-left"
                >
                  <strong>Explanation:</strong> {todayChallenge.explanation}
                </motion.div>
              )}
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
          <button
            onClick={handleTakeChallenge}
            className="w-full py-4 bg-gradient-to-r from-brand-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all group flex items-center justify-center gap-2"
          >
            {showResult ? 'Try Another Challenge' : 'Take Today\'s Challenge'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </div>
  )
}
