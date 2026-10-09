'use client';

import { useEffect, useState, useCallback } from 'react';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/api';
import type { Database } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneForwarded,
  PhoneOff,
  PhoneCall,
  MessageSquare,
  AlertCircle,
  Loader2,
  Clock,
} from 'lucide-react';

type Call = Database['public']['Tables']['calls']['Row'];
type ConversationMessage = Database['public']['Tables']['conversation_messages']['Row'];
type CallStatus = Database['public']['Tables']['calls']['Insert']['status'];
type CallOutcome = NonNullable<Database['public']['Tables']['calls']['Insert']['outcome']>;
type ConversationRole = Database['public']['Tables']['conversation_messages']['Insert']['role'];

type DateFilter = 'today' | 'week' | 'month' | 'all';

/* ---------- helpers ---------- */

function maskPhone(phone: string | null): string {
  if (!phone) return 'Unknown';
  // Keep prefix and last 3 digits, mask the middle.
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  const prefix = phone.slice(0, Math.max(0, phone.length - digits.length)); // keep any + prefix
  const last3 = digits.slice(-3);
  const maskedLen = Math.max(3, digits.length - 6);
  const masked = '*'.repeat(Math.min(maskedLen, 8));
  // Try to preserve a country-code-ish prefix (first 2-4 digits)
  const ccLen = Math.min(4, digits.length - 6);
  const cc = ccLen > 0 ? digits.slice(0, ccLen) : '';
  const result = `${prefix}${cc}${masked}${last3}`;
  // Format as: +91 *****XX123 style
  return result.startsWith('+') ? result : `+${result}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function filterByDate<T extends { started_at: string }>(items: T[], filter: DateFilter): T[] {
  if (filter === 'all') return items;
  const now = new Date();
  let start: Date;
  if (filter === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (filter === 'week') {
    start = new Date(now);
    start.setDate(now.getDate() - 7);
  } else {
    start = new Date(now);
    start.setDate(now.getDate() - 30);
  }
  return items.filter((i) => new Date(i.started_at) >= start);
}

const STATUS_META: Record<
  CallStatus,
  { icon: typeof Phone; badge: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  completed: { icon: PhoneCall, badge: 'default' },
  answered: { icon: PhoneIncoming, badge: 'default' },
  missed: { icon: PhoneMissed, badge: 'destructive' },
  transferred: { icon: PhoneForwarded, badge: 'secondary' },
  failed: { icon: PhoneOff, badge: 'destructive' },
};

const OUTCOME_BADGE: Record<CallOutcome, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  order_placed: 'default',
  reservation_made: 'default',
  info_provided: 'secondary',
  human_transfer: 'outline',
  unresolved: 'destructive',
  callback_requested: 'secondary',
};

const ROLE_META: Record<
  ConversationRole,
  { label: string; badge: 'default' | 'secondary' | 'outline' | 'destructive'; align: 'left' | 'right' | 'center' }
> = {
  caller: { label: 'Caller', badge: 'outline', align: 'right' },
  agent: { label: 'AI Agent', badge: 'default', align: 'left' },
  system: { label: 'System', badge: 'secondary', align: 'center' },
  staff: { label: 'Staff', badge: 'secondary', align: 'left' },
};

/* ---------- component ---------- */

export default function CallsPage() {
  const { currentProperty } = useApp();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchCalls = useCallback(async () => {
    if (!currentProperty) {
      setCalls([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('calls')
      .select('*')
      .eq('property_id', currentProperty.id)
      .order('started_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCalls(data ?? []);
    }
    setLoading(false);
  }, [currentProperty]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const openConversation = async (call: Call) => {
    setSelectedCall(call);
    setDialogOpen(true);
    setMessages([]);
    setMessagesLoading(true);
    const { data, error: msgError } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('call_id', call.id)
      .order('created_at', { ascending: true });

    if (msgError) {
      setError(msgError.message);
    } else {
      setMessages(data ?? []);
    }
    setMessagesLoading(false);
  };

  const filteredCalls = filterByDate(calls, dateFilter);

  if (!currentProperty) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <Phone className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">No property selected</h2>
        <p className="text-muted-foreground">
          Select a property to view its call history.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">Loading calls…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Calls &amp; Conversations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review incoming calls and their AI-handled conversations.
          </p>
        </div>
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Call Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredCalls.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-1">No calls found</h3>
              <p className="text-sm text-muted-foreground">
                {calls.length === 0
                  ? 'Incoming calls will appear here once the AI receptionist starts handling them.'
                  : 'No calls match the selected date filter.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caller</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="text-right">Conversation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map((call) => {
                  const statusMeta = STATUS_META[call.status] ?? STATUS_META.completed;
                  return (
                    <TableRow key={call.id}>
                      <TableCell className="font-mono text-sm">
                        {maskPhone(call.caller_phone)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMeta.badge} className="text-xs capitalize">
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {call.outcome ? (
                          <Badge
                            variant={OUTCOME_BADGE[call.outcome] ?? 'secondary'}
                            className="text-xs capitalize"
                          >
                            {call.outcome.replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {call.duration_seconds > 0
                          ? formatDuration(call.duration_seconds)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">
                        {call.language ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDateTime(call.started_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openConversation(call)}
                        >
                          <MessageSquare className="w-4 h-4 mr-1.5" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Conversation dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Conversation</DialogTitle>
            <DialogDescription>
              {selectedCall
                ? `${maskPhone(selectedCall.caller_phone)} • ${formatDateTime(
                    selectedCall.started_at,
                  )} • ${formatDuration(selectedCall.duration_seconds)}`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {messagesLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Loading conversation…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">
                No conversation transcript available for this call.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[420px] rounded-md border p-4">
              <div className="space-y-4">
                {messages.map((msg) => {
                  const meta = ROLE_META[msg.role] ?? ROLE_META.system;
                  const isRight = meta.align === 'right';
                  const isCenter = meta.align === 'center';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isCenter ? 'justify-center' : isRight ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] ${isCenter ? 'w-full' : ''}`}
                      >
                        <div
                          className={`flex items-center gap-2 mb-1 ${
                            isRight ? 'justify-end' : isCenter ? 'justify-center' : 'justify-start'
                          }`}
                        >
                          <Badge variant={meta.badge} className="text-xs">
                            {meta.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div
                          className={`rounded-lg px-3 py-2 text-sm ${
                            isCenter
                              ? 'bg-muted text-muted-foreground text-center'
                              : isRight
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {selectedCall?.transcript_available
              ? 'Transcript available'
              : 'Transcript not available'}
            {selectedCall?.recording_available ? ' • Recording available' : ''}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
