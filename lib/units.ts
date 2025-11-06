/**
 * Unit Conversion Utilities
 * Handles conversion between metric and imperial measurement systems
 */

export type UnitSystem = 'metric' | 'imperial'

export interface ConvertedDimension {
  value: number
  unit: string
  displayValue: string
}

export interface ImperialLength {
  feet: number
  inches: number
  totalInches: number
}

/**
 * Convert meters to feet and inches
 */
export function metersToFeetInches(meters: number): ImperialLength {
  const totalInches = meters * 39.3701
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)

  return {
    feet,
    inches,
    totalInches: Math.round(totalInches)
  }
}

/**
 * Convert meters to feet (decimal)
 */
export function metersToFeet(meters: number): number {
  return meters * 3.28084
}

/**
 * Convert kilograms to pounds
 */
export function kilogramsToPounds(kg: number): number {
  return kg * 2.20462
}

/**
 * Convert cubic meters to cubic feet
 */
export function cubicMetersToCubicFeet(m3: number): number {
  return m3 * 35.3147
}

/**
 * Format length for display based on unit system
 */
export function formatLength(
  meters: number | undefined,
  unitSystem: UnitSystem = 'imperial',
  options: { precision?: number; showBothUnits?: boolean } = {}
): string {
  if (!meters) return 'N/A'

  const { precision = 2, showBothUnits = false } = options

  if (unitSystem === 'imperial') {
    const imperial = metersToFeetInches(meters)

    // For very large measurements, use feet only
    if (imperial.feet > 100) {
      const formatted = `${imperial.feet.toLocaleString()} ft`
      return showBothUnits ? `${formatted} (${meters.toFixed(1)}m)` : formatted
    }

    // For smaller measurements, show feet and inches
    if (imperial.inches === 0) {
      const formatted = `${imperial.feet} ft`
      return showBothUnits ? `${formatted} (${meters.toFixed(2)}m)` : formatted
    }

    const formatted = `${imperial.feet}' ${imperial.inches}"`
    return showBothUnits ? `${formatted} (${meters.toFixed(2)}m)` : formatted
  }

  // Metric
  return `${meters.toFixed(precision)}m`
}

/**
 * Format weight for display based on unit system
 */
export function formatWeight(
  kg: number | undefined,
  unitSystem: UnitSystem = 'imperial',
  options: { precision?: number; showBothUnits?: boolean } = {}
): string {
  if (!kg) return 'N/A'

  const { precision = 0, showBothUnits = false } = options

  if (unitSystem === 'imperial') {
    const pounds = kilogramsToPounds(kg)

    // For very large weights, use tons
    if (pounds > 10000) {
      const tons = pounds / 2000
      const formatted = `${tons.toLocaleString(undefined, { maximumFractionDigits: 1 })} tons`
      return showBothUnits ? `${formatted} (${kg.toLocaleString()}kg)` : formatted
    }

    const formatted = `${pounds.toLocaleString(undefined, { maximumFractionDigits: precision })} lbs`
    return showBothUnits ? `${formatted} (${kg.toLocaleString()}kg)` : formatted
  }

  // Metric
  return `${kg.toLocaleString()}kg`
}

/**
 * Format volume for display based on unit system
 */
export function formatVolume(
  m3: number | undefined,
  unitSystem: UnitSystem = 'imperial',
  options: { precision?: number; showBothUnits?: boolean } = {}
): string {
  if (!m3) return 'N/A'

  const { precision = 2, showBothUnits = false } = options

  if (unitSystem === 'imperial') {
    const cubicFeet = cubicMetersToCubicFeet(m3)
    const formatted = `${cubicFeet.toFixed(precision)} ft³`
    return showBothUnits ? `${formatted} (${m3.toFixed(2)}m³)` : formatted
  }

  // Metric
  return `${m3.toFixed(precision)}m³`
}

/**
 * Get a human-readable dimension string
 */
export function getDimensionString(
  height: number | undefined,
  width: number | undefined,
  length: number | undefined,
  unitSystem: UnitSystem = 'imperial'
): string {
  const parts: string[] = []

  if (height) parts.push(`H: ${formatLength(height, unitSystem)}`)
  if (width) parts.push(`W: ${formatLength(width, unitSystem)}`)
  if (length) parts.push(`L: ${formatLength(length, unitSystem)}`)

  return parts.join(', ') || 'Dimensions not available'
}

/**
 * Get simplified height/length display (for primary dimension)
 */
export function getPrimaryDimension(
  object: { height?: number; length?: number },
  unitSystem: UnitSystem = 'imperial'
): string {
  const primaryValue = object.height || object.length
  if (!primaryValue) return ''

  const dimension = object.height ? 'tall' : 'long'
  return `${formatLength(primaryValue, unitSystem)} ${dimension}`
}
