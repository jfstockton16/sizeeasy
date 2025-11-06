'use client'

import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'

interface AdPlacementProps {
  slot: 'hero' | 'sidebar' | 'comparison' | 'footer'
  className?: string
}

export default function AdPlacement({ slot, className = '' }: AdPlacementProps) {
  // In production, replace with actual ad network code (Google AdSense, etc.)
  const adConfig = {
    hero: {
      width: 'w-full max-w-4xl',
      height: 'h-24',
      label: 'Advertisement - 728x90',
    },
    sidebar: {
      width: 'w-full',
      height: 'h-64',
      label: 'Advertisement - 300x250',
    },
    comparison: {
      width: 'w-full',
      height: 'h-20',
      label: 'Advertisement - Native',
    },
    footer: {
      width: 'w-full',
      height: 'h-16',
      label: 'Advertisement - 468x60',
    },
  }

  const config = adConfig[slot]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${config.width} ${config.height} ${className}`}
    >
      {/* Placeholder - Replace with actual ad network code */}
      <div className="w-full h-full glass rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center">
          <ExternalLink className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <div className="text-xs text-gray-500 font-medium">{config.label}</div>
          <div className="text-xs text-gray-400 mt-1">Insert Google AdSense Here</div>
        </div>
      </div>

      {/* Production Ad Code Example:
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot="XXXXXXXXXX"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
      */}
    </motion.div>
  )
}

// Sponsor Card Component for Sponsored Comparisons
interface SponsorCardProps {
  sponsorName: string
  sponsorLogo?: string
  comparisonTitle: string
  onClick?: () => void
}

export function SponsorCard({ sponsorName, sponsorLogo, comparisonTitle, onClick }: SponsorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="glass rounded-xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-yellow-400/30"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">
          SPONSORED
        </span>
        {sponsorLogo && (
          <img src={sponsorLogo} alt={sponsorName} className="h-6 object-contain" />
        )}
      </div>

      <h3 className="text-lg font-bold mb-2">{comparisonTitle}</h3>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Brought to you by {sponsorName}
        </span>
        <ExternalLink className="w-4 h-4 text-brand-500" />
      </div>
    </motion.div>
  )
}
