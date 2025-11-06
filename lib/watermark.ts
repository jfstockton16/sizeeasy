/**
 * Watermark Utility
 * Adds watermark to images for free tier users
 */

/**
 * Add watermark to image URL
 * For now, this is a placeholder that would integrate with your image generation
 * In production, you'd add this to the actual image generation process
 */
export function addWatermarkToImage(
  imageUrl: string,
  isPremium: boolean
): string {
  if (isPremium) {
    return imageUrl // No watermark for premium users
  }

  // For free users, add watermark parameter
  // This would be handled by your image generation service
  // Example: add a query parameter that your image service recognizes
  const url = new URL(imageUrl)
  url.searchParams.set('watermark', 'sizeeasy')
  return url.toString()
}

/**
 * Generate watermark config for image generation
 */
export interface WatermarkConfig {
  enabled: boolean
  text: string
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'
  opacity: number
  size: 'small' | 'medium' | 'large'
  color: string
}

export function getWatermarkConfig(isPremium: boolean): WatermarkConfig | null {
  if (isPremium) {
    return null // No watermark for premium users
  }

  return {
    enabled: true,
    text: 'SizeEasy.com',
    position: 'bottom-right',
    opacity: 0.7,
    size: 'small',
    color: '#ffffff',
  }
}

/**
 * Get image quality based on user tier
 */
export function getImageQuality(isPremium: boolean): {
  resolution: number
  format: 'webp' | 'png'
  quality: number
} {
  if (isPremium) {
    return {
      resolution: 1024, // HD quality
      format: 'png',
      quality: 95,
    }
  }

  return {
    resolution: 512, // Standard quality
    format: 'webp',
    quality: 80,
  }
}

/**
 * CSS watermark overlay (for client-side rendering)
 */
export function getWatermarkStyles(isPremium: boolean): React.CSSProperties | null {
  if (isPremium) return null

  return {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 10,
  }
}
