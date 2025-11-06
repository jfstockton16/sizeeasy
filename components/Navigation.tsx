'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, Menu, X, Sparkles } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import UserMenu from './UserMenu'
import CreditDisplay from './CreditDisplay'
import AuthModal from './AuthModal'
import PremiumUpgradeModal from './PremiumUpgradeModal'

export default function Navigation() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <>
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

              {/* Credit Display */}
              <CreditDisplay onUpgradeClick={() => setUpgradeModalOpen(true)} />

              {/* User Menu */}
              <UserMenu
                onAuthClick={() => setAuthModalOpen(true)}
                onUpgradeClick={() => setUpgradeModalOpen(true)}
              />
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
              {/* Mobile Auth/User Menu */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
                <UserMenu
                  onAuthClick={() => setAuthModalOpen(true)}
                  onUpgradeClick={() => setUpgradeModalOpen(true)}
                />
                <CreditDisplay onUpgradeClick={() => setUpgradeModalOpen(true)} />
              </div>

              <a href="#trending" className="block text-sm font-medium hover:text-brand-500">
                Trending
              </a>
              <a href="#challenge" className="block text-sm font-medium hover:text-brand-500">
                Daily Challenge
              </a>
              <a href="#about" className="block text-sm font-medium hover:text-brand-500">
                About
              </a>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
                <span className="text-sm font-medium">Theme</span>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                >
                  {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
      <PremiumUpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
      />
    </>
  )
}
