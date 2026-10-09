/*
# VAANI — Row Level Security Policies

## Overview
Enforces multi-tenant isolation across all VAANI tables.
Users can only access data within organizations where they hold a membership.

## Access Model
- **organizations**: Users can see/orgs they belong to (via memberships)
- **profiles**: Users can read/update their own profile only
- **properties, departments, menus, orders, reservations, guest_requests, calls, knowledge, notifications, integrations**: Access scoped through org membership → property chain
- **audit_logs, usage_records**: Read-only for org members
- **memberships, property_assignments**: Org members can read; only owners/admins can modify

## Policy Pattern
For child tables (properties and below), access is checked via:
  EXISTS (SELECT 1 FROM memberships WHERE memberships.user_id = auth.uid() AND memberships.organization_id = <child table>.organization_id)
Properties link to organizations via organization_id, and child tables link to properties via property_id.
*/

-- ============ PROFILES ============
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ ORGANIZATIONS ============
DROP POLICY IF EXISTS "select_member_orgs" ON organizations;
CREATE POLICY "select_member_orgs" ON organizations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.user_id = auth.uid() AND memberships.organization_id = organizations.id)
  );

DROP POLICY IF EXISTS "insert_orgs" ON organizations;
CREATE POLICY "insert_orgs" ON organizations FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_member_orgs" ON organizations;
CREATE POLICY "update_member_orgs" ON organizations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.user_id = auth.uid() AND memberships.organization_id = organizations.id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.user_id = auth.uid() AND memberships.organization_id = organizations.id)
  );

DROP POLICY IF EXISTS "delete_member_orgs" ON organizations;
CREATE POLICY "delete_member_orgs" ON organizations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.user_id = auth.uid() AND memberships.organization_id = organizations.id AND memberships.role = 'owner')
  );

-- ============ MEMBERSHIPS ============
DROP POLICY IF EXISTS "select_memberships" ON memberships;
CREATE POLICY "select_memberships" ON memberships FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM memberships m2 WHERE m2.user_id = auth.uid() AND m2.organization_id = memberships.organization_id)
  );

DROP POLICY IF EXISTS "insert_memberships" ON memberships;
CREATE POLICY "insert_memberships" ON memberships FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM memberships m2 WHERE m2.user_id = auth.uid() AND m2.organization_id = memberships.organization_id AND m2.role IN ('owner','org_admin'))
  );

DROP POLICY IF EXISTS "update_memberships" ON memberships;
CREATE POLICY "update_memberships" ON memberships FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM memberships m2 WHERE m2.user_id = auth.uid() AND m2.organization_id = memberships.organization_id AND m2.role IN ('owner','org_admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM memberships m2 WHERE m2.user_id = auth.uid() AND m2.organization_id = memberships.organization_id AND m2.role IN ('owner','org_admin'))
  );

DROP POLICY IF EXISTS "delete_memberships" ON memberships;
CREATE POLICY "delete_memberships" ON memberships FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM memberships m2 WHERE m2.user_id = auth.uid() AND m2.organization_id = memberships.organization_id AND m2.role IN ('owner','org_admin'))
  );

-- ============ PROPERTIES ============
DROP POLICY IF EXISTS "select_properties" ON properties;
CREATE POLICY "select_properties" ON properties FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.user_id = auth.uid() AND memberships.organization_id = properties.organization_id)
  );

DROP POLICY IF EXISTS "insert_properties" ON properties;
CREATE POLICY "insert_properties" ON properties FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.user_id = auth.uid() AND memberships.organization_id = properties.organization_id AND memberships.role IN ('owner','org_admin'))
  );

DROP POLICY IF EXISTS "update_properties" ON properties;
CREATE POLICY "update_properties" ON properties FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.user_id = auth.uid() AND memberships.organization_id = properties.organization_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.user_id = auth.uid() AND memberships.organization_id = properties.organization_id)
  );

DROP POLICY IF EXISTS "delete_properties" ON properties;
CREATE POLICY "delete_properties" ON properties FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.user_id = auth.uid() AND memberships.organization_id = properties.organization_id AND memberships.role IN ('owner','org_admin'))
  );

-- ============ PROPERTY ASSIGNMENTS ============
DROP POLICY IF EXISTS "select_property_assignments" ON property_assignments;
CREATE POLICY "select_property_assignments" ON property_assignments FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = property_assignments.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_property_assignments" ON property_assignments;
CREATE POLICY "insert_property_assignments" ON property_assignments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = property_assignments.property_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner','org_admin','property_manager')
    )
  );

DROP POLICY IF EXISTS "update_property_assignments" ON property_assignments;
CREATE POLICY "update_property_assignments" ON property_assignments FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = property_assignments.property_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner','org_admin','property_manager')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = property_assignments.property_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner','org_admin','property_manager')
    )
  );

DROP POLICY IF EXISTS "delete_property_assignments" ON property_assignments;
CREATE POLICY "delete_property_assignments" ON property_assignments FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = property_assignments.property_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner','org_admin','property_manager')
    )
  );

-- ============ DEPARTMENTS ============
DROP POLICY IF EXISTS "select_departments" ON departments;
CREATE POLICY "select_departments" ON departments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = departments.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_departments" ON departments;
CREATE POLICY "insert_departments" ON departments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = departments.property_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner','org_admin','property_manager')
    )
  );

DROP POLICY IF EXISTS "update_departments" ON departments;
CREATE POLICY "update_departments" ON departments FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = departments.property_id
      AND memberships.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = departments.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_departments" ON departments;
CREATE POLICY "delete_departments" ON departments FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = departments.property_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner','org_admin','property_manager')
    )
  );

-- ============ MENU CATEGORIES ============
DROP POLICY IF EXISTS "select_menu_categories" ON menu_categories;
CREATE POLICY "select_menu_categories" ON menu_categories FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = menu_categories.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_menu_categories" ON menu_categories;
CREATE POLICY "insert_menu_categories" ON menu_categories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = menu_categories.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_menu_categories" ON menu_categories;
CREATE POLICY "update_menu_categories" ON menu_categories FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = menu_categories.property_id
      AND memberships.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = menu_categories.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_menu_categories" ON menu_categories;
CREATE POLICY "delete_menu_categories" ON menu_categories FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = menu_categories.property_id
      AND memberships.user_id = auth.uid()
    )
  );

-- ============ MENU ITEMS ============
DROP POLICY IF EXISTS "select_menu_items" ON menu_items;
CREATE POLICY "select_menu_items" ON menu_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = menu_items.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_menu_items" ON menu_items;
CREATE POLICY "insert_menu_items" ON menu_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = menu_items.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_menu_items" ON menu_items;
CREATE POLICY "update_menu_items" ON menu_items FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = menu_items.property_id
      AND memberships.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = menu_items.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_menu_items" ON menu_items;
CREATE POLICY "delete_menu_items" ON menu_items FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = menu_items.property_id
      AND memberships.user_id = auth.uid()
    )
  );

-- ============ ORDERS ============
DROP POLICY IF EXISTS "select_orders" ON orders;
CREATE POLICY "select_orders" ON orders FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = orders.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_orders" ON orders;
CREATE POLICY "insert_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = orders.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_orders" ON orders;
CREATE POLICY "update_orders" ON orders FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = orders.property_id
      AND memberships.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = orders.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_orders" ON orders;
CREATE POLICY "delete_orders" ON orders FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = orders.property_id
      AND memberships.user_id = auth.uid()
    )
  );

-- ============ ORDER ITEMS ============
DROP POLICY IF EXISTS "select_order_items" ON order_items;
CREATE POLICY "select_order_items" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN properties ON properties.id = orders.property_id
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE orders.id = order_items.order_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_order_items" ON order_items;
CREATE POLICY "insert_order_items" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      JOIN properties ON properties.id = orders.property_id
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE orders.id = order_items.order_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_order_items" ON order_items;
CREATE POLICY "update_order_items" ON order_items FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN properties ON properties.id = orders.property_id
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE orders.id = order_items.order_id
      AND memberships.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      JOIN properties ON properties.id = orders.property_id
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE orders.id = order_items.order_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_order_items" ON order_items;
CREATE POLICY "delete_order_items" ON order_items FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN properties ON properties.id = orders.property_id
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE orders.id = order_items.order_id
      AND memberships.user_id = auth.uid()
    )
  );

-- ============ RESERVATIONS ============
DROP POLICY IF EXISTS "select_reservations" ON reservations;
CREATE POLICY "select_reservations" ON reservations FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = reservations.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_reservations" ON reservations;
CREATE POLICY "insert_reservations" ON reservations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = reservations.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_reservations" ON reservations;
CREATE POLICY "update_reservations" ON reservations FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = reservations.property_id
      AND memberships.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = reservations.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_reservations" ON reservations;
CREATE POLICY "delete_reservations" ON reservations FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = reservations.property_id
      AND memberships.user_id = auth.uid()
    )
  );

-- ============ GUEST REQUESTS ============
DROP POLICY IF EXISTS "select_guest_requests" ON guest_requests;
CREATE POLICY "select_guest_requests" ON guest_requests FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = guest_requests.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_guest_requests" ON guest_requests;
CREATE POLICY "insert_guest_requests" ON guest_requests FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = guest_requests.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_guest_requests" ON guest_requests;
CREATE POLICY "update_guest_requests" ON guest_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = guest_requests.property_id
      AND memberships.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = guest_requests.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_guest_requests" ON guest_requests;
CREATE POLICY "delete_guest_requests" ON guest_requests FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = guest_requests.property_id
      AND memberships.user_id = auth.uid()
    )
  );

-- ============ CALLS ============
DROP POLICY IF EXISTS "select_calls" ON calls;
CREATE POLICY "select_calls" ON calls FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = calls.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_calls" ON calls;
CREATE POLICY "insert_calls" ON calls FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = calls.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_calls" ON calls;
CREATE POLICY "update_calls" ON calls FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = calls.property_id
      AND memberships.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = calls.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_calls" ON calls;
CREATE POLICY "delete_calls" ON calls FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = calls.property_id
      AND memberships.user_id = auth.uid()
    )
  );

-- ============ CONVERSATION MESSAGES ============
DROP POLICY IF EXISTS "select_conversation_messages" ON conversation_messages;
CREATE POLICY "select_conversation_messages" ON conversation_messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM calls
      JOIN properties ON properties.id = calls.property_id
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE calls.id = conversation_messages.call_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_conversation_messages" ON conversation_messages;
CREATE POLICY "insert_conversation_messages" ON conversation_messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM calls
      JOIN properties ON properties.id = calls.property_id
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE calls.id = conversation_messages.call_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_conversation_messages" ON conversation_messages;
CREATE POLICY "update_conversation_messages" ON conversation_messages FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM calls
      JOIN properties ON properties.id = calls.property_id
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE calls.id = conversation_messages.call_id
      AND memberships.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM calls
      JOIN properties ON properties.id = calls.property_id
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE calls.id = conversation_messages.call_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_conversation_messages" ON conversation_messages;
CREATE POLICY "delete_conversation_messages" ON conversation_messages FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM calls
      JOIN properties ON properties.id = calls.property_id
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE calls.id = conversation_messages.call_id
      AND memberships.user_id = auth.uid()
    )
  );

-- ============ KNOWLEDGE DOCUMENTS ============
DROP POLICY IF EXISTS "select_knowledge_documents" ON knowledge_documents;
CREATE POLICY "select_knowledge_documents" ON knowledge_documents FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = knowledge_documents.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_knowledge_documents" ON knowledge_documents;
CREATE POLICY "insert_knowledge_documents" ON knowledge_documents FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = knowledge_documents.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_knowledge_documents" ON knowledge_documents;
CREATE POLICY "update_knowledge_documents" ON knowledge_documents FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = knowledge_documents.property_id
      AND memberships.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = knowledge_documents.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_knowledge_documents" ON knowledge_documents;
CREATE POLICY "delete_knowledge_documents" ON knowledge_documents FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = knowledge_documents.property_id
      AND memberships.user_id = auth.uid()
    )
  );

-- ============ NOTIFICATIONS ============
DROP POLICY IF EXISTS "select_notifications" ON notifications;
CREATE POLICY "select_notifications" ON notifications FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = notifications.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = notifications.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_notifications" ON notifications;
CREATE POLICY "update_notifications" ON notifications FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = notifications.property_id
      AND memberships.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = notifications.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_notifications" ON notifications;
CREATE POLICY "delete_notifications" ON notifications FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = notifications.property_id
      AND memberships.user_id = auth.uid()
    )
  );

-- ============ AUDIT LOGS ============
DROP POLICY IF EXISTS "select_audit_logs" ON audit_logs;
CREATE POLICY "select_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.user_id = auth.uid() AND memberships.organization_id = audit_logs.organization_id)
  );

DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.user_id = auth.uid() AND memberships.organization_id = audit_logs.organization_id)
  );

-- ============ USAGE RECORDS ============
DROP POLICY IF EXISTS "select_usage_records" ON usage_records;
CREATE POLICY "select_usage_records" ON usage_records FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.user_id = auth.uid() AND memberships.organization_id = usage_records.organization_id)
  );

DROP POLICY IF EXISTS "insert_usage_records" ON usage_records;
CREATE POLICY "insert_usage_records" ON usage_records FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.user_id = auth.uid() AND memberships.organization_id = usage_records.organization_id)
  );

-- ============ INTEGRATIONS ============
DROP POLICY IF EXISTS "select_integrations" ON integrations;
CREATE POLICY "select_integrations" ON integrations FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = integrations.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_integrations" ON integrations;
CREATE POLICY "insert_integrations" ON integrations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = integrations.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_integrations" ON integrations;
CREATE POLICY "update_integrations" ON integrations FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = integrations.property_id
      AND memberships.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = integrations.property_id
      AND memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_integrations" ON integrations;
CREATE POLICY "delete_integrations" ON integrations FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      JOIN memberships ON memberships.organization_id = properties.organization_id
      WHERE properties.id = integrations.property_id
      AND memberships.user_id = auth.uid()
    )
  );
