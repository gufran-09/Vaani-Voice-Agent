export type IndustryType = 'cafe' | 'restaurant' | 'hotel' | 'resort' | 'bakery' | 'cloud_kitchen' | 'hotel_group';

export type UserRole = 'owner' | 'org_admin' | 'property_manager' | 'front_desk' | 'restaurant_manager' | 'kitchen_staff' | 'analyst';

export type SubscriptionPlan = 'starter' | 'professional' | 'enterprise' | 'trial';

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';

export type OrderStatus = 'draft' | 'received' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export type OrderChannel = 'voice' | 'phone' | 'web' | 'app' | 'counter';

export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';

export type GuestRequestStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export type GuestRequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export type CallStatus = 'answered' | 'missed' | 'transferred' | 'failed' | 'completed';

export type CallOutcome = 'order_placed' | 'reservation_made' | 'info_provided' | 'human_transfer' | 'unresolved' | 'callback_requested';

export type ConversationRole = 'caller' | 'agent' | 'system' | 'staff';

export type NotificationChannel = 'sms' | 'whatsapp' | 'email';
export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'failed';

export type MenuAvailability = 'available' | 'unavailable' | 'limited';

export type EntityType = 'organization' | 'property' | 'department' | 'menu' | 'order' | 'reservation' | 'guest_request' | 'call' | 'user' | 'subscription' | 'integration';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          industry: IndustryType;
          branding: Record<string, unknown> | null;
          default_timezone: string;
          default_currency: string;
          default_language: string;
          supported_languages: string[];
          subscription_plan: SubscriptionPlan;
          subscription_status: SubscriptionStatus;
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          industry: IndustryType;
          branding?: Record<string, unknown> | null;
          default_timezone?: string;
          default_currency?: string;
          default_language?: string;
          supported_languages?: string[];
          subscription_plan?: SubscriptionPlan;
          subscription_status?: SubscriptionStatus;
          trial_ends_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
      };
      properties: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          property_type: IndustryType;
          address: string | null;
          city: string | null;
          phone: string | null;
          email: string | null;
          timezone: string;
          currency: string;
          operating_hours: Record<string, unknown> | null;
          status: 'active' | 'inactive' | 'setup';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          property_type: IndustryType;
          address?: string | null;
          city?: string | null;
          phone?: string | null;
          email?: string | null;
          timezone?: string;
          currency?: string;
          operating_hours?: Record<string, unknown> | null;
          status?: 'active' | 'inactive' | 'setup';
        };
        Update: Partial<Database['public']['Tables']['properties']['Insert']>;
      };
      departments: {
        Row: {
          id: string;
          property_id: string;
          name: string;
          description: string | null;
          contact_phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          name: string;
          description?: string | null;
          contact_phone?: string | null;
        };
        Update: Partial<Database['public']['Tables']['departments']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: UserRole;
        };
        Update: Partial<Database['public']['Tables']['memberships']['Insert']>;
      };
      property_assignments: {
        Row: {
          id: string;
          property_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['property_assignments']['Insert']>;
      };
      menu_categories: {
        Row: {
          id: string;
          property_id: string;
          name: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          name: string;
          display_order?: number;
        };
        Update: Partial<Database['public']['Tables']['menu_categories']['Insert']>;
      };
      menu_items: {
        Row: {
          id: string;
          category_id: string;
          property_id: string;
          name: string;
          description: string | null;
          price: number;
          availability: MenuAvailability;
          spoken_aliases: string[];
          allergens: string[];
          prep_time_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          property_id: string;
          name: string;
          description?: string | null;
          price: number;
          availability?: MenuAvailability;
          spoken_aliases?: string[];
          allergens?: string[];
          prep_time_minutes?: number;
        };
        Update: Partial<Database['public']['Tables']['menu_items']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          property_id: string;
          order_number: string;
          status: OrderStatus;
          channel: OrderChannel;
          customer_name: string | null;
          customer_phone: string | null;
          total_amount: number;
          notes: string | null;
          prep_eta_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          order_number: string;
          status?: OrderStatus;
          channel: OrderChannel;
          customer_name?: string | null;
          customer_phone?: string | null;
          total_amount?: number;
          notes?: string | null;
          prep_eta_minutes?: number | null;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          name: string;
          price: number;
          quantity: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id: string;
          name: string;
          price: number;
          quantity: number;
          notes?: string | null;
        };
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
      };
      reservations: {
        Row: {
          id: string;
          property_id: string;
          customer_name: string;
          customer_phone: string | null;
          party_size: number;
          reservation_date: string;
          reservation_time: string;
          status: ReservationStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          customer_name: string;
          customer_phone?: string | null;
          party_size: number;
          reservation_date: string;
          reservation_time: string;
          status?: ReservationStatus;
          notes?: string | null;
        };
        Update: Partial<Database['public']['Tables']['reservations']['Insert']>;
      };
      guest_requests: {
        Row: {
          id: string;
          property_id: string;
          department_id: string | null;
          request_type: string;
          description: string;
          priority: GuestRequestPriority;
          status: GuestRequestStatus;
          assigned_to: string | null;
          room_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          department_id?: string | null;
          request_type: string;
          description: string;
          priority?: GuestRequestPriority;
          status?: GuestRequestStatus;
          assigned_to?: string | null;
          room_number?: string | null;
        };
        Update: Partial<Database['public']['Tables']['guest_requests']['Insert']>;
      };
      calls: {
        Row: {
          id: string;
          property_id: string;
          caller_phone: string | null;
          status: CallStatus;
          outcome: CallOutcome | null;
          duration_seconds: number;
          language: string | null;
          transcript_available: boolean;
          recording_available: boolean;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          property_id: string;
          caller_phone?: string | null;
          status: CallStatus;
          outcome?: CallOutcome | null;
          duration_seconds?: number;
          language?: string | null;
          transcript_available?: boolean;
          recording_available?: boolean;
          started_at: string;
          ended_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['calls']['Insert']>;
      };
      conversation_messages: {
        Row: {
          id: string;
          call_id: string;
          role: ConversationRole;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          role: ConversationRole;
          content: string;
        };
        Update: Partial<Database['public']['Tables']['conversation_messages']['Insert']>;
      };
      knowledge_documents: {
        Row: {
          id: string;
          property_id: string;
          title: string;
          content: string;
          category: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          title: string;
          content: string;
          category: string;
        };
        Update: Partial<Database['public']['Tables']['knowledge_documents']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          property_id: string;
          channel: NotificationChannel;
          recipient: string;
          subject: string | null;
          body: string;
          status: NotificationStatus;
          related_entity_type: string | null;
          related_entity_id: string | null;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          property_id: string;
          channel: NotificationChannel;
          recipient: string;
          subject?: string | null;
          body: string;
          status?: NotificationStatus;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          action: string;
          entity_type: EntityType;
          entity_id: string | null;
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          action: string;
          entity_type: EntityType;
          entity_id?: string | null;
          details?: Record<string, unknown> | null;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
      usage_records: {
        Row: {
          id: string;
          organization_id: string;
          property_id: string | null;
          metric_type: string;
          metric_value: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          property_id?: string | null;
          metric_type: string;
          metric_value: number;
        };
        Update: Partial<Database['public']['Tables']['usage_records']['Insert']>;
      };
      integrations: {
        Row: {
          id: string;
          property_id: string;
          service_name: string;
          status: 'connected' | 'disconnected' | 'error' | 'pending';
          config: Record<string, unknown> | null;
          last_sync_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          service_name: string;
          status?: 'connected' | 'disconnected' | 'error' | 'pending';
          config?: Record<string, unknown> | null;
          last_sync_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['integrations']['Insert']>;
      };
    };
  };
}
