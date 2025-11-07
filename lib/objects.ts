// Object database with real-world dimensions
export interface SizeObject {
  id: string
  name: string
  category: string
  height?: number // in meters
  width?: number // in meters
  length?: number // in meters
  weight?: number // in kg
  volume?: number // in cubic meters
  description: string
  funFacts?: string[]
  imagePrompt: string
}

export const OBJECT_DATABASE: SizeObject[] = [
  // Animals
  {
    id: 'blue-whale',
    name: 'Blue Whale',
    category: 'Animals',
    length: 30,
    height: 9,
    weight: 150000,
    description: 'The largest animal ever known to have existed',
    funFacts: [
      'Heart weighs 400 pounds',
      'Can be heard 1,000 miles away',
      'Eats 4 tons of krill per day',
    ],
    imagePrompt: 'majestic blue whale swimming in ocean, photorealistic, detailed',
  },
  {
    id: 't-rex',
    name: 'Tyrannosaurus Rex',
    category: 'Animals',
    length: 12,
    height: 6,
    weight: 9000,
    description: 'One of the largest land carnivores of all time',
    funFacts: [
      'Bite force of 12,800 pounds',
      'Could run 12-17 mph',
      'Teeth up to 12 inches long',
    ],
    imagePrompt: 'realistic T-Rex dinosaur, side view, photorealistic, detailed texture',
  },
  {
    id: 'elephant',
    name: 'African Elephant',
    category: 'Animals',
    height: 3.3,
    length: 6,
    weight: 6000,
    description: 'The largest land animal alive today',
    funFacts: [
      'Pregnancy lasts 22 months',
      'Can hear with their feet',
      'Never forgets',
    ],
    imagePrompt: 'majestic african elephant, side profile, photorealistic, savanna background',
  },
  {
    id: 'giraffe',
    name: 'Giraffe',
    category: 'Animals',
    height: 5.5,
    weight: 1200,
    description: 'The tallest living terrestrial animal',
    funFacts: [
      'Tongue is 20 inches long',
      'Only sleeps 30 minutes per day',
      'Can run 35 mph',
    ],
    imagePrompt: 'tall giraffe standing, full body, photorealistic, African plains',
  },

  // Buildings
  {
    id: 'eiffel-tower',
    name: 'Eiffel Tower',
    category: 'Buildings',
    height: 330,
    description: 'Iconic iron lattice tower in Paris',
    funFacts: [
      'Contains 18,038 metallic parts',
      'Weighs 10,100 tons',
      'Grows 6 inches in summer',
    ],
    imagePrompt: 'Eiffel Tower, full structure, clear sky, photorealistic, detailed ironwork',
  },
  {
    id: 'empire-state',
    name: 'Empire State Building',
    category: 'Buildings',
    height: 443,
    description: 'Iconic Art Deco skyscraper in New York City',
    funFacts: [
      'Has 73 elevators',
      'Lightning strikes it 23 times per year',
      'Built in just 410 days',
    ],
    imagePrompt: 'Empire State Building, full height, clear day, photorealistic, NYC skyline',
  },
  {
    id: 'burj-khalifa',
    name: 'Burj Khalifa',
    category: 'Buildings',
    height: 828,
    description: 'The tallest building in the world',
    funFacts: [
      'Has 163 floors',
      'Took 6 years to build',
      'Uses 250,000 gallons of water daily',
    ],
    imagePrompt: 'Burj Khalifa skyscraper, full height, clear sky, photorealistic, Dubai',
  },

  // Vehicles
  {
    id: 'school-bus',
    name: 'School Bus',
    category: 'Vehicles',
    length: 10.7,
    height: 3.2,
    weight: 11000,
    description: 'Standard yellow school bus',
    funFacts: [
      'Holds 72 passengers',
      'Travels 4.3 billion miles annually in US',
      'Safest vehicle on the road',
    ],
    imagePrompt: 'yellow school bus, side view, photorealistic, detailed',
  },
  {
    id: 'boeing-747',
    name: 'Boeing 747',
    category: 'Vehicles',
    length: 70.6,
    height: 19.4,
    weight: 220000,
    description: 'Iconic jumbo jet aircraft',
    funFacts: [
      'Wings span 211 feet',
      'Holds 524 passengers',
      'Flies at 614 mph',
    ],
    imagePrompt: 'Boeing 747 airplane, side profile, photorealistic, in flight',
  },

  // Monuments
  {
    id: 'statue-liberty',
    name: 'Statue of Liberty',
    category: 'Monuments',
    height: 93,
    description: 'Iconic copper statue in New York Harbor',
    funFacts: [
      'Gift from France in 1886',
      'Made of 300 copper sheets',
      'Crown has 25 windows',
    ],
    imagePrompt: 'Statue of Liberty, full statue with pedestal, clear sky, photorealistic',
  },
  {
    id: 'great-pyramid',
    name: 'Great Pyramid of Giza',
    category: 'Monuments',
    height: 138.8,
    description: 'The oldest of the Seven Wonders of the Ancient World',
    funFacts: [
      'Built around 2560 BC',
      'Contains 2.3 million blocks',
      'Was tallest structure for 3,800 years',
    ],
    imagePrompt: 'Great Pyramid of Giza, full pyramid, desert, photorealistic, detailed limestone',
  },

  // People & Objects
  {
    id: 'human',
    name: 'Average Human',
    category: 'People',
    height: 1.7,
    weight: 70,
    description: 'Average adult human height',
    funFacts: [
      'Made of 7 octillion atoms',
      'Contains 37.2 trillion cells',
      'Brain uses 20% of energy',
    ],
    imagePrompt: 'average person standing, full body, photorealistic, neutral background',
  },
  {
    id: 'basketball',
    name: 'Basketball',
    category: 'Sports',
    height: 0.24,
    weight: 0.62,
    description: 'Standard NBA basketball',
    funFacts: [
      'Invented in 1891',
      'Bounces to 49-54% of drop height',
      'Made of synthetic leather',
    ],
    imagePrompt: 'orange basketball, close-up, photorealistic, detailed texture',
  },
]

export function searchObjects(query: string): SizeObject[] {
  const lowercaseQuery = query.toLowerCase()
  return OBJECT_DATABASE.filter(
    (obj) =>
      obj.name.toLowerCase().includes(lowercaseQuery) ||
      obj.category.toLowerCase().includes(lowercaseQuery) ||
      obj.description.toLowerCase().includes(lowercaseQuery)
  )
}

export function getObjectById(id: string): SizeObject | undefined {
  return OBJECT_DATABASE.find((obj) => obj.id === id)
}

export function getRandomObjects(count: number): SizeObject[] {
  const shuffled = [...OBJECT_DATABASE].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// Unit conversion utilities
export function metersToFeet(meters: number): number {
  return meters * 3.28084
}

export function metersToInches(meters: number): number {
  return meters * 39.3701
}

export function kgToPounds(kg: number): number {
  return kg * 2.20462
}

export function formatImperialHeight(meters: number): string {
  const totalInches = metersToInches(meters)
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)

  if (feet === 0) {
    return `${inches}"`
  } else if (inches === 0) {
    return `${feet}'`
  } else {
    return `${feet}' ${inches}"`
  }
}

export function formatImperialWeight(kg: number): string {
  const pounds = kgToPounds(kg)
  if (pounds >= 2000) {
    const tons = pounds / 2000
    return `${tons.toLocaleString(undefined, { maximumFractionDigits: 1 })} tons`
  }
  return `${Math.round(pounds).toLocaleString()} lbs`
}

// Get emoji representation for objects
export function getObjectEmoji(obj: SizeObject): string {
  const name = obj.name.toLowerCase()
  const category = obj.category.toLowerCase()

  // Animals
  if (name.includes('whale')) return '🐋'
  if (name.includes('rex') || name.includes('dinosaur')) return '🦖'
  if (name.includes('elephant')) return '🐘'
  if (name.includes('giraffe')) return '🦒'
  if (name.includes('lion')) return '🦁'
  if (name.includes('tiger')) return '🐯'
  if (name.includes('bear')) return '🐻'
  if (name.includes('gorilla')) return '🦍'
  if (name.includes('shark')) return '🦈'
  if (name.includes('octopus')) return '🐙'

  // Buildings & Monuments
  if (name.includes('eiffel')) return '🗼'
  if (name.includes('empire') || name.includes('burj')) return '🏢'
  if (name.includes('statue')) return '🗽'
  if (name.includes('pyramid')) return '🔺'
  if (category.includes('building')) return '🏛️'
  if (category.includes('monument')) return '🗿'

  // Vehicles
  if (name.includes('bus')) return '🚌'
  if (name.includes('747') || name.includes('airplane') || name.includes('plane')) return '✈️'
  if (name.includes('car')) return '🚗'
  if (name.includes('truck')) return '🚚'
  if (name.includes('train')) return '🚂'
  if (name.includes('rocket')) return '🚀'
  if (name.includes('ship') || name.includes('boat')) return '🚢'

  // Sports & Objects
  if (name.includes('basketball')) return '🏀'
  if (name.includes('football')) return '🏈'
  if (name.includes('soccer')) return '⚽'
  if (name.includes('baseball')) return '⚾'

  // People
  if (name.includes('human') || name.includes('person')) return '🧍'

  // Default by category
  if (category.includes('animal')) return '🦁'
  if (category.includes('vehicle')) return '🚗'
  if (category.includes('sport')) return '⚽'

  return '📦'
}

export function calculateSizeRatio(obj1: SizeObject, obj2: SizeObject): {
  ratio: number
  dimension: string
  comparison: string
} {
  // Find the most interesting dimension to compare
  const comparisons = []

  if (obj1.height && obj2.height) {
    const ratio = obj1.height / obj2.height
    comparisons.push({
      ratio: Math.abs(ratio),
      dimension: 'height',
      comparison: ratio > 1
        ? `${obj1.name} is ${ratio.toFixed(1)}x taller than ${obj2.name}`
        : `${obj2.name} is ${(1/ratio).toFixed(1)}x taller than ${obj1.name}`,
    })
  }

  if (obj1.length && obj2.length) {
    const ratio = obj1.length / obj2.length
    comparisons.push({
      ratio: Math.abs(ratio),
      dimension: 'length',
      comparison: ratio > 1
        ? `${obj1.name} is ${ratio.toFixed(1)}x longer than ${obj2.name}`
        : `${obj2.name} is ${(1/ratio).toFixed(1)}x longer than ${obj1.name}`,
    })
  }

  if (obj1.weight && obj2.weight) {
    const ratio = obj1.weight / obj2.weight
    comparisons.push({
      ratio: Math.abs(ratio),
      dimension: 'weight',
      comparison: ratio > 1
        ? `${obj1.name} is ${ratio.toFixed(1)}x heavier than ${obj2.name}`
        : `${obj2.name} is ${(1/ratio).toFixed(1)}x heavier than ${obj1.name}`,
    })
  }

  // Return the comparison with the most interesting ratio (closest to 2-10x for good visualization)
  comparisons.sort((a, b) => {
    const aScore = Math.abs(Math.log10(a.ratio) - 0.5) // Prefer ratios around 3x
    const bScore = Math.abs(Math.log10(b.ratio) - 0.5)
    return aScore - bScore
  })

  return comparisons[0] || {
    ratio: 1,
    dimension: 'size',
    comparison: 'Objects are similar in size',
  }
}
