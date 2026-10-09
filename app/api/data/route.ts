import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, getCognitoAccessToken, getAuthenticatedUser } from '@/lib/server-auth';
import { query } from '@/lib/server-db';

const TABLES = new Set([
  'organizations', 'properties', 'departments', 'profiles', 'memberships',
  'property_assignments', 'menu_categories', 'menu_items', 'orders', 'order_items',
  'reservations', 'guest_requests', 'calls', 'conversation_messages',
  'knowledge_documents', 'notifications', 'audit_logs', 'usage_records', 'integrations',
]);
const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

interface Filter {
  column: string;
  operator: 'eq' | 'neq' | 'in' | 'gte';
  value: unknown;
}

function assertIdentifier(value: string): void {
  if (!IDENTIFIER.test(value)) throw new Error('Invalid database identifier');
}

async function assertInsertAllowed(
  table: string,
  records: Record<string, unknown>[],
  userId: string,
): Promise<void> {
  for (const record of records) {
    if (table === 'organizations') continue;
    if (table === 'profiles') {
      if (record.id !== userId) throw new Error('Cannot create another user profile');
      continue;
    }
    let result;
    if (table === 'memberships') {
      if (record.user_id !== userId) throw new Error('Cannot create a membership for another user');
      result = await query(
        `SELECT (
          EXISTS (SELECT 1 FROM memberships WHERE organization_id = $1 AND user_id = $2 AND role IN ('owner', 'org_admin'))
          OR NOT EXISTS (SELECT 1 FROM memberships WHERE organization_id = $1)
        ) AS allowed`,
        [record.organization_id, userId],
      );
    } else if (table === 'properties' || table === 'audit_logs' || table === 'usage_records') {
      const organizationId = record.organization_id;
      result = await query(
        `SELECT EXISTS (SELECT 1 FROM memberships WHERE organization_id = $1 AND user_id = $2) AS allowed`,
        [organizationId, userId],
      );
    } else {
      const propertyId = table === 'order_items' ? null : record.property_id;
      result = propertyId
        ? await query(
          `SELECT EXISTS (
            SELECT 1 FROM properties p
            JOIN memberships m ON m.organization_id = p.organization_id
            WHERE p.id = $1 AND m.user_id = $2
          ) AS allowed`,
          [propertyId, userId],
        )
        : await query(
          `SELECT EXISTS (
            SELECT 1 FROM orders o
            JOIN properties p ON p.id = o.property_id
            JOIN memberships m ON m.organization_id = p.organization_id
            WHERE o.id = $1 AND m.user_id = $2
          ) AS allowed`,
          [record.order_id, userId],
        );
    }
    if (!result.rows[0]?.allowed) throw new Error('You are not authorized to create this record');
  }
}

async function requireUser(): Promise<string> {
  const user = getAuthenticatedUser(cookies());
  if (user?.id) return user.id;

  const accessToken = getCognitoAccessToken(cookies());
  if (!accessToken) throw new Error('You must be signed in');
  try {
    const result = await cognitoClient.send(new GetUserCommand({ AccessToken: accessToken }));
    const sub = result.UserAttributes?.find((attribute) => attribute.Name === 'sub')?.Value;
    if (sub) return sub;
  } catch {
    // continue to throw
  }
  throw new Error('You must be signed in');
}

export async function POST(request: Request) {
  try {
    const userId = await requireUser();
    const user = getAuthenticatedUser(cookies());

    try {
      await query(
        `INSERT INTO profiles (id, email, full_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET
           email = CASE WHEN profiles.email = '' THEN EXCLUDED.email ELSE profiles.email END,
           full_name = COALESCE(profiles.full_name, EXCLUDED.full_name)`,
        [userId, user?.email ?? '', user?.fullName ?? null],
      );
    } catch (profileErr) {
      console.warn('Auto-ensure profile warning:', profileErr);
    }
    const body = (await request.json()) as {
      table: string;
      operation: 'select' | 'insert' | 'update' | 'delete';
      payload?: Record<string, unknown> | Record<string, unknown>[];
      columns?: string;
      filters?: Filter[];
      ordering?: { column: string; ascending: boolean } | null;
      limit?: number | null;
      returnRows?: boolean;
    };
    if (!TABLES.has(body.table)) throw new Error('Table is not available');
    assertIdentifier(body.table);

    const filters = [...(body.filters ?? [])];
    if (body.table === 'profiles') filters.push({ column: 'id', operator: 'eq', value: userId });
    const tenantScope: Record<string, string> = {
      organizations: `"id" IN (SELECT organization_id FROM memberships WHERE user_id = $USER)`,
      memberships: `("user_id" = $USER OR organization_id IN (SELECT organization_id FROM memberships WHERE user_id = $USER))`,
      properties: `"organization_id" IN (SELECT organization_id FROM memberships WHERE user_id = $USER)`,
      property_assignments: `("user_id" = $USER OR property_id IN (SELECT p.id FROM properties p JOIN memberships m ON m.organization_id = p.organization_id WHERE m.user_id = $USER))`,
      departments: `"property_id" IN (SELECT p.id FROM properties p JOIN memberships m ON m.organization_id = p.organization_id WHERE m.user_id = $USER)`,
      menu_categories: `"property_id" IN (SELECT p.id FROM properties p JOIN memberships m ON m.organization_id = p.organization_id WHERE m.user_id = $USER)`,
      menu_items: `"property_id" IN (SELECT p.id FROM properties p JOIN memberships m ON m.organization_id = p.organization_id WHERE m.user_id = $USER)`,
      orders: `"property_id" IN (SELECT p.id FROM properties p JOIN memberships m ON m.organization_id = p.organization_id WHERE m.user_id = $USER)`,
      order_items: `"order_id" IN (SELECT o.id FROM orders o JOIN properties p ON p.id = o.property_id JOIN memberships m ON m.organization_id = p.organization_id WHERE m.user_id = $USER)`,
      reservations: `"property_id" IN (SELECT p.id FROM properties p JOIN memberships m ON m.organization_id = p.organization_id WHERE m.user_id = $USER)`,
      guest_requests: `"property_id" IN (SELECT p.id FROM properties p JOIN memberships m ON m.organization_id = p.organization_id WHERE m.user_id = $USER)`,
      calls: `"property_id" IN (SELECT p.id FROM properties p JOIN memberships m ON m.organization_id = p.organization_id WHERE m.user_id = $USER)`,
      conversation_messages: `"call_id" IN (SELECT c.id FROM calls c JOIN properties p ON p.id = c.property_id JOIN memberships m ON m.organization_id = p.organization_id WHERE m.user_id = $USER)`,
      knowledge_documents: `"property_id" IN (SELECT p.id FROM properties p JOIN memberships m ON m.organization_id = p.organization_id WHERE m.user_id = $USER)`,
      notifications: `"property_id" IN (SELECT p.id FROM properties p JOIN memberships m ON m.organization_id = p.organization_id WHERE m.user_id = $USER)`,
      audit_logs: `"organization_id" IN (SELECT organization_id FROM memberships WHERE user_id = $USER)`,
      usage_records: `"organization_id" IN (SELECT organization_id FROM memberships WHERE user_id = $USER)`,
      integrations: `"property_id" IN (SELECT p.id FROM properties p JOIN memberships m ON m.organization_id = p.organization_id WHERE m.user_id = $USER)`,
    };
    const scope = tenantScope[body.table];
    if (scope) filters.push({ column: '__tenant_scope__', operator: 'eq', value: userId });
    const values: unknown[] = [];
    const where = filters.map((filter) => {
      if (filter.column === '__tenant_scope__') {
        values.push(userId);
        return scope!.replaceAll('$USER', `$${values.length}`);
      }
      assertIdentifier(filter.column);
      if (filter.operator === 'in') {
        const items = Array.isArray(filter.value) ? filter.value : [];
        values.push(...items);
        return `"${filter.column}" = ANY($${values.length - items.length + 1}::text[])`;
      }
      values.push(filter.value);
      const operator = filter.operator === 'eq' ? '=' : filter.operator === 'neq' ? '<>' : '>=';
      return `"${filter.column}" ${operator} $${values.length}`;
    });

    let result;
    if (body.operation === 'insert') {
      const records = Array.isArray(body.payload) ? body.payload : [body.payload ?? {}];
      if (records.length === 0) throw new Error('Insert payload is required');
      const columns = Object.keys(records[0]);
      columns.forEach(assertIdentifier);
      await assertInsertAllowed(body.table, records, userId);
      values.length = 0;
      const placeholders = records.map((record) => `(${columns.map((column) => {
        values.push(record[column]);
        return `$${values.length}`;
      }).join(', ')})`).join(', ');
      result = await query(
        `INSERT INTO "${body.table}" (${columns.map((column) => `"${column}"`).join(', ')})
         VALUES ${placeholders}
         ${body.returnRows ? 'RETURNING *' : ''}`,
        values,
      );
    } else if (body.operation === 'update') {
      const payload = (body.payload ?? {}) as Record<string, unknown>;
      const columns = Object.keys(payload);
      columns.forEach(assertIdentifier);
      if (columns.length === 0 || where.length === 0) throw new Error('Update requires values and filters');
      const assignments = columns.map((column) => {
        values.push(payload[column]);
        return `"${column}" = $${values.length}`;
      });
      result = await query(
        `UPDATE "${body.table}" SET ${assignments.join(', ')}
         WHERE ${where.join(' AND ')} ${body.returnRows ? 'RETURNING *' : ''}`,
        values,
      );
    } else if (body.operation === 'delete') {
      if (where.length === 0) throw new Error('Delete requires filters');
      result = await query(
        `DELETE FROM "${body.table}" WHERE ${where.join(' AND ')} ${body.returnRows ? 'RETURNING *' : ''}`,
        values,
      );
    } else {
      const columns = body.columns && body.columns !== '*' ? body.columns.split(',').map((column) => {
        const trimmed = column.trim();
        assertIdentifier(trimmed);
        return `"${trimmed}"`;
      }).join(', ') : '*';
      const order = body.ordering
        ? ` ORDER BY "${(assertIdentifier(body.ordering.column), body.ordering.column)}" ${body.ordering.ascending ? 'ASC' : 'DESC'}`
        : '';
      const limit = body.limit ? ` LIMIT ${Math.max(1, Math.min(body.limit, 1000))}` : '';
      result = await query(
        `SELECT ${columns} FROM "${body.table}"${where.length ? ` WHERE ${where.join(' AND ')}` : ''}${order}${limit}`,
        values,
      );
    }
    return NextResponse.json({ data: result.rows });
  } catch (error) {
    console.error('Data route error:', error);
    const message = (error instanceof Error && error.message)
      ? error.message
      : (typeof error === 'object' && error !== null && 'message' in error && (error as any).message)
        ? String((error as any).message)
        : String(error) || 'Database request failed';
    return NextResponse.json({ error: message }, { status: message.includes('signed in') ? 401 : 400 });
  }
}
