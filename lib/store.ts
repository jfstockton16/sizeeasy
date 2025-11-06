import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SizeObject } from './objects'
import { UnitSystem } from './units'

interface Comparison {
  id: string
  object1: SizeObject
  object2: SizeObject
  createdAt: Date
  likes: number
  shares: number
  views: number
}

interface UserStats {
  xp: number
  level: number
  comparisonsCreated: number
  streak: number
  achievements: string[]
}

interface ComparisonStore {
  // Current comparison being created
  selectedObject1: SizeObject | null
  selectedObject2: SizeObject | null
  setObject1: (obj: SizeObject | null) => void
  setObject2: (obj: SizeObject | null) => void
  swapObjects: () => void
  clearComparison: () => void

  // User stats
  userStats: UserStats
  addXP: (amount: number) => void
  incrementComparisons: () => void

  // Saved comparisons
  savedComparisons: Comparison[]
  saveComparison: (comparison: Omit<Comparison, 'id' | 'createdAt'>) => void

  // View mode
  viewMode: 'side-by-side' | 'overlay' | 'scale' | '3d'
  setViewMode: (mode: 'side-by-side' | 'overlay' | 'scale' | '3d') => void

  // Unit system preference (imperial by default)
  unitSystem: UnitSystem
  setUnitSystem: (system: UnitSystem) => void
  toggleUnitSystem: () => void
}

export const useComparisonStore = create<ComparisonStore>((set) => ({
  selectedObject1: null,
  selectedObject2: null,

  setObject1: (obj) => set({ selectedObject1: obj }),
  setObject2: (obj) => set({ selectedObject2: obj }),

  swapObjects: () =>
    set((state) => ({
      selectedObject1: state.selectedObject2,
      selectedObject2: state.selectedObject1,
    })),

  clearComparison: () =>
    set({
      selectedObject1: null,
      selectedObject2: null,
    }),

  userStats: {
    xp: 0,
    level: 1,
    comparisonsCreated: 0,
    streak: 0,
    achievements: [],
  },

  addXP: (amount) =>
    set((state) => {
      const newXP = state.userStats.xp + amount
      const newLevel = Math.floor(newXP / 100) + 1
      return {
        userStats: {
          ...state.userStats,
          xp: newXP,
          level: newLevel,
        },
      }
    }),

  incrementComparisons: () =>
    set((state) => ({
      userStats: {
        ...state.userStats,
        comparisonsCreated: state.userStats.comparisonsCreated + 1,
      },
    })),

  savedComparisons: [],

  saveComparison: (comparison) =>
    set((state) => ({
      savedComparisons: [
        {
          ...comparison,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date(),
        },
        ...state.savedComparisons,
      ],
    })),

  viewMode: 'side-by-side',
  setViewMode: (mode) => set({ viewMode: mode }),

  // Default to imperial system
  unitSystem: 'imperial',
  setUnitSystem: (system) => set({ unitSystem: system }),
  toggleUnitSystem: () =>
    set((state) => ({
      unitSystem: state.unitSystem === 'metric' ? 'imperial' : 'metric',
    })),
}))
