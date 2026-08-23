/** App-version floor per platform and adoption telemetry (`/api/v1/admin/app-versions`). */

export type AppPlatform = 'android' | 'ios'

export const APP_PLATFORMS: AppPlatform[] = ['android', 'ios']

export interface AppVersionDoc {
  platform: AppPlatform
  /** The release in the store; installs below this are nudged. */
  latest_version: string
  /** The oldest release allowed to run; installs below this are blocked. */
  min_version: string
  /** Store page the app's Update button opens. Empty until the listing exists. */
  update_url: string
  updated_at?: number | null
  updated_by?: string | null
}

export interface AppVersionUpdateBody {
  latest_version: string
  min_version: string
  update_url: string
}

export interface CountedVersion {
  version: string
  count: number
}
export interface CountedOs {
  os: string
  count: number
}
export interface CountedModel {
  model: string
  count: number
}

export interface PlatformAdoption extends AppVersionDoc {
  /** Users whose last app open (`seen_at`) falls inside the window. */
  users_seen: number
  on_latest: number
  below_min: number
  by_version: CountedVersion[]
  by_os: CountedOs[]
  by_model: CountedModel[]
}

export interface BelowMinUser {
  user_id: string
  display_name: string
  role?: string | null
  school_id?: string | null
  platform: AppPlatform
  app_version?: string | null
  os_version?: string | null
  device_model?: string | null
  /** Last cold start or login, ms epoch. */
  seen_at?: number | null
}

export interface AppVersionAdoption {
  range_start: number
  range_end: number
  days: number
  school_id?: string | null
  platforms: PlatformAdoption[]
  below_min_users: BelowMinUser[]
  below_min_users_truncated: boolean
  below_min_total: number
}
