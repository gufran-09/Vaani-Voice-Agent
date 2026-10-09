'use client';

import { useEffect, useState, useCallback } from 'react';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/api';
import type { Database } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { ScrollText, AlertCircle, Loader2, Clock } from 'lucide-react';

type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuditLogWithUser extends AuditLog {
  userEmail: string | null;
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ENTITY_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  organization: 'default',
  property: 'default',
  user: 'secondary',
  subscription: 'secondary',
  order: 'outline',
  reservation: 'outline',
  call: 'outline',
  menu: 'outline',
};

export default function AuditLogsPage() {
  const { currentOrg, loading: orgLoading } = useApp();
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      const auditLogs = (data ?? []) as AuditLog[];

      // Fetch profile emails for all user_ids
      const userIds = auditLogs
        .map((l) => l.user_id)
        .filter((id): id is string => Boolean(id));

      let emailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        emailMap = (profiles ?? []).reduce((acc, p) => {
          acc[p.id] = p.email;
          return acc;
        }, {} as Record<string, string>);
      }

      const logsWithUser: AuditLogWithUser[] = auditLogs.map((log) => ({
        ...log,
        userEmail: log.user_id ? (emailMap[log.user_id] ?? null) : null,
      }));

      setLogs(logsWithUser);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load audit logs';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <ScrollText className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">No organization selected</h2>
        <p className="text-muted-foreground">Select an organization to view its audit logs.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-xl font-display font-bold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recent activity in {currentOrg.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Activity History</CardTitle>
          <CardDescription>Showing the last 50 events</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <ScrollText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No audit logs recorded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        {formatTimestamp(log.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{log.userEmail ?? 'System'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{log.action}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ENTITY_VARIANT[log.entity_type] ?? 'outline'} className="capitalize">
                        {log.entity_type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.entity_id ? (
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {log.entity_id.slice(0, 8)}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
