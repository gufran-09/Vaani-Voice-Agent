-- VAANI RDS PostgreSQL schema.
-- Run with: psql "$DATABASE_URL" -f db/schema.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text UNIQUE NOT NULL,
  industry text NOT NULL DEFAULT 'cafe', branding jsonb, default_timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  default_currency text NOT NULL DEFAULT 'INR', default_language text NOT NULL DEFAULT 'en',
  supported_languages text[] NOT NULL DEFAULT ARRAY['en'], subscription_plan text NOT NULL DEFAULT 'trial',
  subscription_status text NOT NULL DEFAULT 'trial', trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY, email text NOT NULL, full_name text, avatar_url text, phone text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, role text NOT NULL DEFAULT 'property_manager',
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id, user_id)
);
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL, property_type text NOT NULL DEFAULT 'cafe', address text, city text, phone text, email text,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata', currency text NOT NULL DEFAULT 'INR',
  operating_hours jsonb, status text NOT NULL DEFAULT 'setup',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS property_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id, user_id)
);
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL, description text, contact_phone text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL, display_order int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category_id uuid NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE, name text NOT NULL, description text,
  price numeric(10,2) NOT NULL DEFAULT 0, availability text NOT NULL DEFAULT 'available',
  spoken_aliases text[] NOT NULL DEFAULT ARRAY[]::text[], allergens text[] NOT NULL DEFAULT ARRAY[]::text[],
  prep_time_minutes int NOT NULL DEFAULT 15, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  order_number text NOT NULL, status text NOT NULL DEFAULT 'draft', channel text NOT NULL DEFAULT 'voice',
  customer_name text, customer_phone text, total_amount numeric(10,2) NOT NULL DEFAULT 0, notes text,
  prep_eta_minutes int, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE, name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0, quantity int NOT NULL DEFAULT 1, notes text
);
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  customer_name text NOT NULL, customer_phone text, party_size int NOT NULL DEFAULT 1, reservation_date date NOT NULL,
  reservation_time text NOT NULL, status text NOT NULL DEFAULT 'pending', notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS guest_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL, request_type text NOT NULL,
  description text NOT NULL, priority text NOT NULL DEFAULT 'normal', status text NOT NULL DEFAULT 'open',
  assigned_to text REFERENCES profiles(id) ON DELETE SET NULL, room_number text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  caller_phone text, status text NOT NULL DEFAULT 'answered', outcome text, duration_seconds int NOT NULL DEFAULT 0,
  language text, transcript_available boolean NOT NULL DEFAULT false, recording_available boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz
);
CREATE TABLE IF NOT EXISTS conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'caller', content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title text NOT NULL, content text NOT NULL, category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'sms', recipient text NOT NULL, subject text, body text NOT NULL,
  status text NOT NULL DEFAULT 'queued', related_entity_type text, related_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text REFERENCES profiles(id) ON DELETE SET NULL, action text NOT NULL, entity_type text NOT NULL,
  entity_id uuid, details jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS usage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL, metric_type text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0, recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  service_name text NOT NULL, status text NOT NULL DEFAULT 'disconnected', config jsonb,
  last_sync_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_properties_org ON properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_property ON orders(property_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_property ON menu_items(property_id);
CREATE INDEX IF NOT EXISTS idx_guest_requests_property ON guest_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_calls_property ON calls(property_id);
