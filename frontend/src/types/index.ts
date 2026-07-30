export type UserRole = 'admin' | 'hub_manager' | 'rider'

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  phone_number: string
  is_active: boolean
  date_joined: string
}

export interface Zone {
  id: number
  name: string
  pincode_range_start: string
  pincode_range_end: string
}

export type ParcelStatus =
  | 'registered' | 'sorted' | 'assigned' | 'in_transit'
  | 'delivered' | 'failed' | 'reattempt_scheduled'

export type ParcelPriority = 'express' | 'standard'

export interface Parcel {
  tracking_id: string
  sender_name: string
  sender_address: string
  receiver_name: string
  receiver_address: string
  receiver_phone: string
  pincode: string
  zone: number | null
  zone_name?: string | null
  priority: ParcelPriority
  weight: number
  status: ParcelStatus
  qr_code?: string | null
  created_at: string
  updated_at: string
}

export interface ParcelList {
  tracking_id: string
  sender_name: string
  receiver_name: string
  receiver_phone: string
  pincode: string
  zone_name: string | null
  priority: ParcelPriority
  weight: number
  status: ParcelStatus
  created_at: string
}

export interface Rider {
  id: number
  user: number
  user_name: string
  username: string
  capacity: number
  current_load: number
  remaining_capacity: number
  zone: number | null
  zone_name: string | null
  is_available: boolean
  vehicle_type: string
}

export interface Assignment {
  id: number
  parcel: string
  parcel_tracking_id: string
  rider: number
  rider_name: string
  rider_username: string
  assigned_at: string
  status: string
}

export interface DeliveryAttempt {
  id: number
  parcel: string
  parcel_tracking_id: string
  attempt_number: number
  status: string
  status_display: string
  failure_reason: string | null
  failure_reason_display: string | null
  attempted_at: string
  notes: string
}

export interface AssignmentResult {
  assigned: Array<{ parcel_id: string; rider_id: number; rider_name: string; zone: string }>
  unassigned: Array<{ parcel_id: string; reason: string }>
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}