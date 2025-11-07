/**
 * Admin Authentication & Authorization
 *
 * Provides utilities for protecting admin routes and checking admin permissions.
 *
 * Usage in API routes:
 *   import { requireAdmin } from '@/lib/auth/admin'
 *   const user = await requireAdmin()
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/**
 * Admin user emails
 * TODO: Move to database table for better management
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean)

// Fallback for development
if (ADMIN_EMAILS.length === 0 && process.env.NODE_ENV !== 'production') {
  logger.warn('No admin emails configured. Set ADMIN_EMAILS environment variable.')
}

/**
 * Check if an email is an admin
 */
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase().trim())
}

/**
 * Check if the current user is an admin
 * Returns the user object if admin, null otherwise
 */
export async function checkAdmin() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      logger.debug('Admin check failed: No authenticated user')
      return null
    }

    if (!user.email) {
      logger.warn('Admin check failed: User has no email', { userId: user.id })
      return null
    }

    if (!isAdminEmail(user.email)) {
      logger.warn('Admin check failed: User is not an admin', {
        userId: user.id,
        email: user.email,
      })
      return null
    }

    logger.info('Admin access granted', {
      userId: user.id,
      email: user.email,
    })

    return user
  } catch (error) {
    logger.error('Error checking admin status', error)
    return null
  }
}

/**
 * Require admin authentication
 * Throws an error response if not authenticated as admin
 *
 * Usage:
 *   const adminUser = await requireAdmin()
 */
export async function requireAdmin() {
  const user = await checkAdmin()

  if (!user) {
    logger.warn('Unauthorized admin access attempt')
    return null
  }

  return user
}

/**
 * Check if user is admin based on user profile
 * This checks the is_admin flag in the user_profiles table
 *
 * NOTE: This requires a database migration to add the is_admin column:
 *
 * ALTER TABLE user_profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
 * CREATE INDEX idx_user_profiles_admin ON user_profiles(is_admin) WHERE is_admin = TRUE;
 *
 * Uncomment this function after running the migration.
 */
// export async function checkAdminFromProfile() {
//   try {
//     const supabase = await createClient()

//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser()

//     if (authError || !user) {
//       return null
//     }

//     // Check if user has admin flag in profile
//     const { data: profile, error: profileError } = await supabase
//       .from('user_profiles')
//       .select('is_admin')
//       .eq('id', user.id)
//       .single()

//     if (profileError) {
//       logger.error('Error fetching user profile for admin check', profileError, {
//         userId: user.id,
//       })
//       return null
//     }

//     if (!profile?.is_admin) {
//       return null
//     }

//     logger.info('Admin access granted via profile', {
//       userId: user.id,
//       email: user.email,
//     })

//     return user
//   } catch (error) {
//     logger.error('Error checking admin status from profile', error)
//     return null
//   }
// }

/**
 * Combined admin check: checks both email list and database flag
 *
 * NOTE: Database flag check is commented out until migration is run.
 * Currently only uses email-based authentication.
 */
export async function checkAdminCombined() {
  // First check email list (fastest)
  const emailCheck = await checkAdmin()
  if (emailCheck) {
    return emailCheck
  }

  // Database flag check - uncomment after running migration
  // const profileCheck = await checkAdminFromProfile()
  // if (profileCheck) {
  //   return profileCheck
  // }

  return null
}

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(
  action: string,
  details?: Record<string, unknown>
) {
  const user = await checkAdminCombined()

  if (!user) {
    logger.warn('Admin action attempted without authentication', { action, details })
    return
  }

  logger.info('Admin action performed', {
    action,
    adminId: user.id,
    adminEmail: user.email,
    ...details,
  })

  // TODO: Save to database audit log
  // This can be useful for compliance and security audits
}
