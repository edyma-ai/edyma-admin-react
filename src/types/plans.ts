/** Plans catalog + school subscription admin (`/api/v1/admin/plans`, built in phase 9B). */

export interface Plan {
  id: string
  name: string
  plan_type: string
  price_inr: number
  billing_cycle: string
  features: string[]
}

export interface SchoolSubscriptionBody {
  plan_id: string
  price_inr?: number
  billing_cycle?: string
  status: 'active' | 'inactive'
}

export interface SchoolEntitlements {
  school_id: string
  plan_id: string | null
  plan_name: string | null
  plan_type: string | null
  base_features: string[]
  overrides: Record<string, boolean>
  effective_features: string[]
  subscription: {
    status: string
    price_inr: number
    billing_cycle: string
  } | null
}
