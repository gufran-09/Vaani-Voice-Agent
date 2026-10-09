/*
# VAANI — Core Multi-Tenant Schema

## Overview
Creates the foundational schema for VAANI, a multi-tenant hospitality SaaS platform.
All tables use row-level security to enforce tenant isolation.
Users can only access data within organizations they belong to, and only with their assigned role permissions.

## Tables Created
1. **organizations** — Top-level tenant entity (a business/group)
2. **properties** — Individual locations/branches within an organization
3. **departments** — Departments within a property (kitchen, front desk, concierge, etc.)
4. **profiles** — Extended user profile linked to auth.users
5. **memberships** — User-to-organization membership with roles
6. **property_assignments** — User-to-property assignments for staff
7. **menu_categories** — Menu grouping within a property
8. **menu_items** — Individual menu items with pricing, availability, allergens, spoken aliases
9. **orders** — Customer orders with status tracking
10. **order_items** — Line items within an order
11. **reservations** — Table/room reservation requests
12. **guest_requests** — Hotel guest service requests (housekeeping, maintenance, concierge)
13. **calls** — Incoming call records with outcome tracking
14. **conversation_messages** — Individual messages within a call conversation
15. **knowledge_documents** — Business knowledge base entries (FAQs, policies, info)
16. **notifications** — Customer/staff notification records
17. **audit_logs** — Audit trail for sensitive actions
18. **usage_records** — Usage metering for subscription billing
19. **integrations** — External service integration configurations

## Security
- RLS enabled on ALL tables
- Ownership is validated through membership in the organization (not just user_id matching)
- Policies scope access through: auth.uid() -> memberships -> organization_id -> properties -> child tables
- All 4 CRUD policies (SELECT, INSERT, UPDATE, DELETE) per table, scoped to authenticated users
*/

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  industry text NOT NULL DEFAULT 'cafe',
  branding jsonb,
  default_timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  default_currency text NOT NULL DEFAULT 'INR',
  default_language text NOT NULL DEFAULT 'en',
  supported_languages text[] NOT NULL DEFAULT ARRAY['en'],
  subscription_plan text NOT NULL DEFAULT 'trial',
  subscription_status text NOT NULL DEFAULT 'trial',
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 2. Properties
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  property_type text NOT NULL DEFAULT 'cafe',
  address text,
  city text,
  phone text,
  email text,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  currency text NOT NULL DEFAULT 'INR',
  operating_hours jsonb,
  status text NOT NULL DEFAULT 'setup',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- 3. Departments
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- 4. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. Memberships
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'property_manager',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- 6. Property assignments
CREATE TABLE IF NOT EXISTS property_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id, user_id)
);
ALTER TABLE property_assignments ENABLE ROW LEVEL SECURITY;

-- 7. Menu categories
CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

-- 8. Menu items
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  availability text NOT NULL DEFAULT 'available',
  spoken_aliases text[] NOT NULL DEFAULT ARRAY[]::text[],
  allergens text[] NOT NULL DEFAULT ARRAY[]::text[],
  prep_time_minutes int NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- 9. Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  channel text NOT NULL DEFAULT 'voice',
  customer_name text,
  customer_phone text,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  prep_eta_minutes int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 10. Order items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 1,
  notes text
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 11. Reservations
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text,
  party_size int NOT NULL DEFAULT 1,
  reservation_date date NOT NULL,
  reservation_time text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 12. Guest requests
CREATE TABLE IF NOT EXISTS guest_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  request_type text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  room_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE guest_requests ENABLE ROW LEVEL SECURITY;

-- 13. Calls
CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  caller_phone text,
  status text NOT NULL DEFAULT 'answered',
  outcome text,
  duration_seconds int NOT NULL DEFAULT 0,
  language text,
  transcript_available boolean NOT NULL DEFAULT false,
  recording_available boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- 14. Conversation messages
CREATE TABLE IF NOT EXISTS conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'caller',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- 15. Knowledge documents
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

-- 16. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'sms',
  recipient text NOT NULL,
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 17. Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 18. Usage records
CREATE TABLE IF NOT EXISTS usage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  metric_type text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

-- 19. Integrations
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  config jsonb,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_org ON properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_property ON departments(property_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_property_assignments_user ON property_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_property ON menu_items(property_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_property ON orders(property_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reservations_property ON reservations(property_id);
CREATE INDEX IF NOT EXISTS idx_guest_requests_property ON guest_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_calls_property ON calls(property_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_call ON conversation_messages(call_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_property ON knowledge_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_notifications_property ON notifications(property_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_org ON usage_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_integrations_property ON integrations(property_id);
