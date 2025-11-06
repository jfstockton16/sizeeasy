'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, Menu, X, Sparkles, Ruler } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useComparisonStore } from '@/lib/store'

export default function Navigation() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { unitSystem, toggleUnitSystem } = useComparisonStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-6 h-6 text-brand-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-brand-500 to-purple-600 bg-clip-text text-transparent">
              SizeEasy
            </span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#trending" className="text-sm font-medium hover:text-brand-500 transition-colors">
              Trending
            </a>
            <a href="#challenge" className="text-sm font-medium hover:text-brand-500 transition-colors">
              Daily Challenge
            </a>
            <a href="#about" className="text-sm font-medium hover:text-brand-500 transition-colors">
              About
            </a>

            <button
              onClick={toggleUnitSystem}
              className="px-3 py-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5 text-sm font-medium"
              aria-label="Toggle unit system"
              title={`Switch to ${unitSystem === 'imperial' ? 'Metric' : 'Imperial'}`}
            >
              <Ruler className="w-4 h-4" />
              <span className="text-xs font-semibold">{unitSystem === 'imperial' ? 'FT' : 'M'}</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden glass border-t border-gray-200 dark:border-gray-800"
        >
          <div className="px-4 py-4 space-y-3">
            <a href="#trending" className="block text-sm font-medium hover:text-brand-500">
              Trending
            </a>
            <a href="#challenge" className="block text-sm font-medium hover:text-brand-500">
              Daily Challenge
            </a>
            <a href="#about" className="block text-sm font-medium hover:text-brand-500">
              About
            </a>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Units</span>
                <button
                  onClick={toggleUnitSystem}
                  className="px-3 py-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 flex items-center gap-1.5"
                >
                  <Ruler className="w-4 h-4" />
                  <span className="text-xs font-semibold">{unitSystem === 'imperial' ? 'Imperial (ft)' : 'Metric (m)'}</span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Theme</span>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                >
                  {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  )
}
