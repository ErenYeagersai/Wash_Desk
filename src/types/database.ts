export type OrderStatus =
  | 'SUBMITTED'
  | 'RECEIVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PICKED_UP'
  | 'CANCELLED'

export type UserRole = 'student' | 'staff' | 'admin'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          registration_id: string
          name: string
          hostel: string
          room_number: string
          phone: string
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          registration_id: string
          name: string
          hostel: string
          room_number: string
          phone: string
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          registration_id?: string
          name?: string
          hostel?: string
          room_number?: string
          phone?: string
          role?: UserRole
          updated_at?: string
        }
      }
      laundry_bags: {
        Row: {
          id: string
          bag_id: string
          student_id: string | null
          qr_token: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bag_id: string
          student_id?: string | null
          qr_token?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          bag_id?: string
          student_id?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      laundry_orders: {
        Row: {
          id: string
          order_id: string
          student_id: string
          bag_id: string
          clothes_count: number
          notes: string | null
          status: OrderStatus
          submitted_at: string
          received_at: string | null
          processing_at: string | null
          completed_at: string | null
          picked_up_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          student_id: string
          bag_id: string
          clothes_count: number
          notes?: string | null
          status?: OrderStatus
          submitted_at?: string
          received_at?: string | null
          processing_at?: string | null
          completed_at?: string | null
          picked_up_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: OrderStatus
          notes?: string | null
          received_at?: string | null
          processing_at?: string | null
          completed_at?: string | null
          picked_up_at?: string | null
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          student_id: string
          laundry_order_id: string
          title: string
          message: string
          type: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          laundry_order_id: string
          title: string
          message: string
          type?: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          laundry_order_id: string
          action: string
          old_status: string | null
          new_status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          laundry_order_id: string
          action: string
          old_status?: string | null
          new_status: string
          created_at?: string
        }
        Update: Record<string, never>
      }
      app_settings: {
        Row: {
          key: string
          value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          value?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
    }
    Functions: {
      get_my_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
      submit_laundry_order: {
        Args: {
          p_bag_id: string
          p_clothes_count: number
          p_notes?: string | null
        }
        Returns: Database['public']['Tables']['laundry_orders']['Row']
      }
      advance_order_status: {
        Args: {
          p_order_id: string
          p_new_status: OrderStatus
        }
        Returns: Database['public']['Tables']['laundry_orders']['Row']
      }
      mark_all_notifications_read: {
        Args: Record<string, never>
        Returns: void
      }
    }
  }
}
