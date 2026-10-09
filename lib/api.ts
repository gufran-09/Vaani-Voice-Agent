import type { Database } from '@/lib/types';

type TableName = keyof Database['public']['Tables'];
type Row = Record<string, unknown>;
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

interface ApiResponse<T> {
  data: T;
  error: { message: string } | null;
}

interface Filter {
  column: string;
  operator: 'eq' | 'neq' | 'in' | 'gte';
  value: unknown;
}

class QueryBuilder<T extends Row = Row> implements PromiseLike<any> {
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: Row | Row[] | null = null;
  private columns = '*';
  private filters: Filter[] = [];
  private ordering: { column: string; ascending: boolean } | null = null;
  private maxRows: number | null = null;
  private returnRows = false;
  private one = false;

  constructor(private readonly table: TableName) {}

  select(columns = '*'): QueryBuilder<T> {
    this.columns = columns;
    this.returnRows = true;
    return this;
  }

  insert(payload: Row | Row[]): QueryBuilder<T> {
    this.operation = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Row): QueryBuilder<T> {
    this.operation = 'update';
    this.payload = payload;
    return this;
  }

  delete(): QueryBuilder<T> {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: unknown): QueryBuilder<T> {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  neq(column: string, value: unknown): QueryBuilder<T> {
    this.filters.push({ column, operator: 'neq', value });
    return this;
  }

  in(column: string, value: unknown[]): QueryBuilder<T> {
    this.filters.push({ column, operator: 'in', value });
    return this;
  }

  gte(column: string, value: unknown): QueryBuilder<T> {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T> {
    this.ordering = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(value: number): QueryBuilder<T> {
    this.maxRows = value;
    return this;
  }

  single(): PromiseLike<any> {
    this.one = true;
    return this as unknown as PromiseLike<ApiResponse<T>>;
  }

  maybeSingle(): PromiseLike<any> {
    this.one = true;
    return this as unknown as PromiseLike<ApiResponse<T | null>>;
  }

  then<TResult1 = ApiResponse<T[]>, TResult2 = never>(
    onfulfilled?: ((value: ApiResponse<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<ApiResponse<T[]>> {
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this.table,
          operation: this.operation,
          payload: this.payload,
          columns: this.columns,
          filters: this.filters,
          ordering: this.ordering,
          limit: this.maxRows,
          returnRows: this.returnRows,
        }),
      });
      const body = (await response.json()) as { data?: T[]; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Database request failed');
      }
      const data = body.data ?? [];
      return {
        data: (this.one ? data[0] ?? null : data) as T[],
        error: null,
      };
    } catch (error) {
      return {
        data: (this.one ? null : []) as T[],
        error: { message: error instanceof Error ? error.message : 'Database request failed' },
      };
    }
  }
}

export const api = {
  from<T extends TableName>(table: T): QueryBuilder<TableRow<T>> {
    return new QueryBuilder<TableRow<T>>(table);
  },
};

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string };
}

export interface AuthSession {
  access_token: string;
  user: AuthUser;
}

async function authRequest<T>(action: string, payload?: Row): Promise<ApiResponse<T>> {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    const body = (await response.json()) as { data?: T; error?: string };
    if (!response.ok) throw new Error(body.error ?? 'Authentication request failed');
    return { data: body.data as T, error: null };
  } catch (error) {
    return {
      data: null as T,
      error: { message: error instanceof Error ? error.message : 'Authentication request failed' },
    };
  }
}

export const auth = {
  async getSession(): Promise<ApiResponse<{ session: AuthSession | null }>> {
    return authRequest('session');
  },
  async signInWithPassword(credentials: { email: string; password: string }) {
    return authRequest<AuthSession>('sign-in', credentials as unknown as Row);
  },
  async signUp(credentials: { email: string; password: string; options?: { data?: Row } }) {
    return authRequest<AuthSession>('sign-up', {
      email: credentials.email,
      password: credentials.password,
      fullName: credentials.options?.data?.full_name,
    });
  },
  async signOut(_options?: { scope?: string }) {
    return authRequest<null>('sign-out');
  },
  onAuthStateChange(callback: (event: string, session: AuthSession | null) => void) {
    return {
      data: {
        subscription: {
          unsubscribe: () => undefined,
        },
      },
      callback,
    };
  },
};

// Kept as a local compatibility name so existing feature pages can migrate
// without changing their query semantics all at once.
export const supabase = { from: api.from, auth };
