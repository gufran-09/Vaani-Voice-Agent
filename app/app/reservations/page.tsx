'use client';

import { useEffect, useState, useCallback } from 'react';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import type { ReservationStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  CalendarDays,
  Plus,
  Loader2,
  CalendarX2,
  Users,
  Phone,
  Clock,
} from 'lucide-react';

type Reservation = Database['public']['Tables']['reservations']['Row'];

const statusVariantMap: Record<
  ReservationStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'secondary',
  confirmed: 'default',
  seated: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
  no_show: 'destructive',
};

function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <Badge
      variant={statusVariantMap[status] ?? 'secondary'}
      className="capitalize"
    >
      {status.replace('_', ' ')}
    </Badge>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ReservationsPage() {
  const { currentProperty, refresh } = useApp();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [partySize, setPartySize] = useState('');
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [notes, setNotes] = useState('');

  const fetchReservations = useCallback(async () => {
    if (!currentProperty) {
      setReservations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('property_id', currentProperty.id)
      .order('reservation_date', { ascending: false })
      .order('reservation_time', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setReservations([]);
    } else {
      setReservations((data ?? []) as Reservation[]);
    }
    setLoading(false);
  }, [currentProperty]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setPartySize('');
    setReservationDate('');
    setReservationTime('');
    setNotes('');
    setFormError(null);
  };

  const handleCreateReservation = async () => {
    if (!currentProperty) return;
    setFormError(null);

    if (!customerName.trim()) {
      setFormError('Customer name is required.');
      return;
    }
    const size = parseInt(partySize, 10);
    if (isNaN(size) || size < 1) {
      setFormError('Party size must be at least 1.');
      return;
    }
    if (!reservationDate) {
      setFormError('Reservation date is required.');
      return;
    }
    if (!reservationTime.trim()) {
      setFormError('Reservation time is required.');
      return;
    }

    setSubmitting(true);
    const { error: insertError } = await supabase
      .from('reservations')
      .insert({
        property_id: currentProperty.id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        party_size: size,
        reservation_date: reservationDate,
        reservation_time: reservationTime.trim(),
        status: 'pending',
        notes: notes.trim() || null,
      });

    setSubmitting(false);
    if (insertError) {
      setFormError(insertError.message);
      return;
    }
    setDialogOpen(false);
    resetForm();
    refresh();
    fetchReservations();
  };

  if (!currentProperty) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <CalendarDays className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">No property selected</h2>
        <p className="text-muted-foreground mb-6">
          Select a property to view and manage reservations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Reservations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage bookings for {currentProperty.name}
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
              New Reservation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Reservation</DialogTitle>
              <DialogDescription>
                Book a table for a guest. The status defaults to pending.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="res-name">Customer name</Label>
                  <Input
                    id="res-name"
                    placeholder="e.g. Priya Patel"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="res-phone">Phone</Label>
                  <Input
                    id="res-phone"
                    placeholder="e.g. +91 98765 43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="res-party-size">Party size</Label>
                  <Input
                    id="res-party-size"
                    type="number"
                    min="1"
                    placeholder="2"
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="res-date">Date</Label>
                  <Input
                    id="res-date"
                    type="date"
                    value={reservationDate}
                    onChange={(e) => setReservationDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="res-time">Time</Label>
                  <Input
                    id="res-time"
                    placeholder="19:30"
                    value={reservationTime}
                    onChange={(e) => setReservationTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="res-notes">Notes</Label>
                <Textarea
                  id="res-notes"
                  placeholder="Special requests, seating preferences, allergies…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
              <Button onClick={handleCreateReservation} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create Reservation'
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
          Loading reservations…
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : reservations.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarX2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h3 className="text-lg font-medium mb-1">No reservations yet</h3>
            <p className="text-sm text-muted-foreground">
              Create your first reservation to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">
              {reservations.length}{' '}
              {reservations.length === 1 ? 'reservation' : 'reservations'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Party</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell className="font-medium">
                      {res.customer_name}
                    </TableCell>
                    <TableCell>
                      {res.customer_phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          {res.customer_phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {res.party_size}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(res.reservation_date)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {res.reservation_time}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ReservationStatusBadge status={res.status} />
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">
                      {res.notes ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
