'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Sparkles } from 'lucide-react'
import { OBJECT_DATABASE, searchObjects, SizeObject } from '@/lib/objects'

interface ObjectSelectorProps {
  onSelect: (obj: SizeObject) => void
}

const CATEGORIES = ['All', 'Animals', 'Buildings', 'Vehicles', 'Monuments', 'People', 'Sports']

export default function ObjectSelector({ onSelect }: ObjectSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const filteredObjects = searchQuery
    ? searchObjects(searchQuery)
    : selectedCategory === 'All'
    ? OBJECT_DATABASE
    : OBJECT_DATABASE.filter((obj) => obj.category === selectedCategory)

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for any object..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 glass rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
              selectedCategory === category
                ? 'bg-brand-500 text-white shadow-lg scale-105'
                : 'glass hover:shadow-md'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Object Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredObjects.map((obj, index) => (
          <motion.button
            key={obj.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect(obj)}
            className="glass rounded-xl p-6 text-left hover:shadow-xl hover:scale-105 transition-all duration-300 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg mb-1 group-hover:text-brand-500 transition-colors">
                  {obj.name}
                </h3>
                <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full inline-block">
                  {obj.category}
                </div>
              </div>
              <Sparkles className="w-5 h-5 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {obj.description}
            </p>

            <div className="space-y-1 text-xs">
              {obj.height && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Height:</span>
                  <span className="font-semibold">{obj.height}m</span>
                </div>
              )}
              {obj.length && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Length:</span>
                  <span className="font-semibold">{obj.length}m</span>
                </div>
              )}
              {obj.weight && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Weight:</span>
                  <span className="font-semibold">{obj.weight.toLocaleString()}kg</span>
                </div>
              )}
            </div>

            {obj.funFacts && obj.funFacts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-brand-500 font-semibold mb-1">Fun Fact:</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {obj.funFacts[0]}
                </div>
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {filteredObjects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-bold mb-2">No objects found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try a different search term or category
          </p>
        </div>
      )}
    </div>
  )
}
