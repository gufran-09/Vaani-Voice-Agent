'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/api';
import type { Database } from '@/lib/types';
import type {
  GuestRequestStatus,
  GuestRequestPriority,
} from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ConciergeBell,
  Plus,
  Loader2,
  Inbox,
  DoorOpen,
  Building2,
  User,
  Wrench,
  Sparkles,
  Utensils,
  BellRing,
  Phone,
} from 'lucide-react';

type GuestRequest = Database['public']['Tables']['guest_requests']['Row'];
type Department = Database['public']['Tables']['departments']['Row'];

interface GuestRequestWithDept extends GuestRequest {
  departments: Department | null;
}

const COLUMN_ORDER: GuestRequestStatus[] = [
  'open',
  'assigned',
  'in_progress',
  'completed',
];

const COLUMN_LABELS: Record<GuestRequestStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const priorityVariantMap: Record<
  GuestRequestPriority,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  low: 'secondary',
  normal: 'outline',
  high: 'default',
  urgent: 'destructive',
};

function PriorityBadge({ priority }: { priority: GuestRequestPriority }) {
  return (
    <Badge
      variant={priorityVariantMap[priority] ?? 'secondary'}
      className="capitalize"
    >
      {priority}
    </Badge>
  );
}

const REQUEST_TYPES = [
  'housekeeping',
  'maintenance',
  'room_service',
  'concierge',
  'spa',
  'other',
] as const;
type RequestType = (typeof REQUEST_TYPES)[number];

const requestTypeIconMap: Record<RequestType, React.ComponentType<{ className?: string }>> = {
  housekeeping: Sparkles,
  maintenance: Wrench,
  room_service: Utensils,
  concierge: ConciergeBell,
  spa: Sparkles,
  other: BellRing,
};

function RequestTypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = requestTypeIconMap[type as RequestType] ?? BellRing;
  return <Icon className={className} />;
}

export default function GuestRequestsPage() {
  const { currentProperty, refresh } = useApp();

  const [requests, setRequests] = useState<GuestRequestWithDept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<RequestType>('housekeeping');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<GuestRequestPriority>('normal');
  const [roomNumber, setRoomNumber] = useState('');

  const fetchRequests = useCallback(async () => {
    if (!currentProperty) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('guest_requests')
      .select('*, departments(*)')
      .eq('property_id', currentProperty.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setRequests([]);
    } else {
      setRequests((data ?? []) as GuestRequestWithDept[]);
    }
    setLoading(false);
  }, [currentProperty]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const requestsByStatus = useMemo(() => {
    const map = new Map<GuestRequestStatus, GuestRequestWithDept[]>();
    for (const status of COLUMN_ORDER) {
      map.set(status, []);
    }
    for (const req of requests) {
      const list = map.get(req.status);
      if (list) {
        list.push(req);
      }
    }
    return map;
  }, [requests]);

  const resetForm = () => {
    setRequestType('housekeeping');
    setDescription('');
    setPriority('normal');
    setRoomNumber('');
    setFormError(null);
  };

  const handleCreateRequest = async () => {
    if (!currentProperty) return;
    setFormError(null);

    if (!description.trim()) {
      setFormError('A description is required.');
      return;
    }

    setSubmitting(true);
    const { error: insertError } = await supabase
      .from('guest_requests')
      .insert({
        property_id: currentProperty.id,
        request_type: requestType,
        description: description.trim(),
        priority,
        status: 'open',
        room_number: roomNumber.trim() || null,
      });

    setSubmitting(false);
    if (insertError) {
      setFormError(insertError.message);
      return;
    }
    setDialogOpen(false);
    resetForm();
    refresh();
    fetchRequests();
  };

  if (!currentProperty) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <ConciergeBell className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">No property selected</h2>
        <p className="text-muted-foreground mb-6">
          Select a property to manage guest requests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Guest Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Service requests for {currentProperty.name}
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Guest Request</DialogTitle>
              <DialogDescription>
                Log a service request for a guest. It will be created with
                status &ldquo;open&rdquo;.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="req-type">Request type</Label>
                  <Select
                    value={requestType}
                    onValueChange={(v) => setRequestType(v as RequestType)}
                  >
                    <SelectTrigger id="req-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REQUEST_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="req-priority">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) =>
                        setPriority(v as GuestRequestPriority)
                    }
                  >
                    <SelectTrigger id="req-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="req-room">Room number</Label>
                <Input
                  id="req-room"
                  placeholder="e.g. 302"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="req-description">Description</Label>
                <Textarea
                  id="req-description"
                  placeholder="Describe the request…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateRequest} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create Request'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading guest requests…
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Inbox className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h3 className="text-lg font-medium mb-1">No guest requests</h3>
            <p className="text-sm text-muted-foreground">
              Create a request to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMN_ORDER.map((status) => {
            const columnRequests = requestsByStatus.get(status) ?? [];
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold">
                    {COLUMN_LABELS[status]}
                  </h2>
                  <Badge variant="secondary" className="text-xs">
                    {columnRequests.length}
                  </Badge>
                </div>

                {columnRequests.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      Nothing here
                    </CardContent>
                  </Card>
                ) : (
                  columnRequests.map((req) => (
                    <Card key={req.id}>
                      <CardHeader className="pb-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                              <RequestTypeIcon
                                type={req.request_type}
                                className="w-4 h-4"
                              />
                            </div>
                            <CardTitle className="text-sm font-display capitalize leading-tight">
                              {req.request_type.replace('_', ' ')}
                            </CardTitle>
                          </div>
                          <PriorityBadge priority={req.priority} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {req.description}
                        </p>
                        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                          {req.room_number && (
                            <span className="flex items-center gap-1.5">
                              <DoorOpen className="w-3.5 h-3.5" />
                              Room {req.room_number}
                            </span>
                          )}
                          {req.departments && (
                            <span className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5" />
                              {req.departments.name}
                            </span>
                          )}
                          {req.assigned_to && (
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              {req.assigned_to}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
