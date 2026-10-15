export type { Database, OrderStatus, UserRole } from './database'

export type Profile = import('./database').Database['public']['Tables']['profiles']['Row']
export type LaundryBag = import('./database').Database['public']['Tables']['laundry_bags']['Row']
export type LaundryOrder = import('./database').Database['public']['Tables']['laundry_orders']['Row']
export type Notification = import('./database').Database['public']['Tables']['notifications']['Row']
export type AuditLog = import('./database').Database['public']['Tables']['audit_logs']['Row']
export type AppSetting = import('./database').Database['public']['Tables']['app_settings']['Row']

export interface AppSettings {
  delay_threshold_hours: number
  monthly_bag_limit: number
  min_clothes: number
  max_clothes: number
}
