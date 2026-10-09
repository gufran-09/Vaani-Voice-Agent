'use client';

import { useEffect, useState, useCallback } from 'react';
import { useApp } from '@/components/app-provider';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/api';
import type { Database } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Building2, Plus, MapPin, Phone, Clock, AlertCircle, Loader2, Mail } from 'lucide-react';

type Property = Database['public']['Tables']['properties']['Row'];
type IndustryType = Database['public']['Tables']['properties']['Row']['property_type'];

const PROPERTY_TYPES: { value: IndustryType; label: string }[] = [
  { value: 'cafe', label: 'Cafe' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'resort', label: 'Resort' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'cloud_kitchen', label: 'Cloud Kitchen' },
];

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'UTC',
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  inactive: 'secondary',
  setup: 'outline',
};

const PROPERTY_TYPE_LABELS: Record<IndustryType, string> = {
  cafe: 'Cafe',
  restaurant: 'Restaurant',
  hotel: 'Hotel',
  resort: 'Resort',
  bakery: 'Bakery',
  cloud_kitchen: 'Cloud Kitchen',
  hotel_group: 'Hotel Group',
};

function formatHours(hours: Record<string, unknown> | null): string {
  if (!hours) return 'Not set';
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const parts: string[] = [];
  for (const day of days) {
    const val = hours[day];
    if (val && typeof val === 'object') {
      const open = (val as Record<string, unknown>).open;
      const close = (val as Record<string, unknown>).close;
      if (open && close) {
        parts.push(`${day}: ${open}-${close}`);
      }
    }
  }
  return parts.length > 0 ? parts.slice(0, 2).join(', ') + (parts.length > 2 ? '...' : '') : 'Not set';
}

interface NewPropertyForm {
  name: string;
  property_type: IndustryType;
  city: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
}

const EMPTY_FORM: NewPropertyForm = {
  name: '',
  property_type: 'cafe',
  city: '',
  phone: '',
  email: '',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
};

export default function PropertiesPage() {
  const { currentOrg, loading: orgLoading, refresh } = useApp();
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NewPropertyForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('properties')
      .select('*')
      .eq('organization_id', currentOrg.id)
      .order('created_at', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProperties(data ?? []);
    }
    setLoading(false);
  }, [currentOrg]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleCreate = async () => {
    if (!currentOrg || !user) return;
    if (!form.name.trim()) {
      setCreateError('Property name is required');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const { data: newProperty, error: insertError } = await supabase
        .from('properties')
        .insert({
          organization_id: currentOrg.id,
          name: form.name.trim(),
          property_type: form.property_type,
          city: form.city.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          timezone: form.timezone,
          currency: form.currency,
          status: 'setup',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Assign the current user to the new property
      const { error: assignError } = await supabase
        .from('property_assignments')
        .insert({
          property_id: newProperty.id,
          user_id: user.id,
        });

      if (assignError) throw assignError;

      setProperties((prev) => [...prev, newProperty]);
      setForm(EMPTY_FORM);
      setDialogOpen(false);
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create property';
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  };

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
          <Building2 className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">No organization selected</h2>
        <p className="text-muted-foreground">Select an organization to manage its properties.</p>
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
        <Button onClick={fetchProperties} variant="outline">Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Properties</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage properties for {currentOrg.name}
          </p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setCreateError(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <h3 className="font-display font-semibold mb-1">No properties yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first property to start taking calls and orders.
            </p>
            <Button onClick={() => { setForm(EMPTY_FORM); setCreateError(null); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Card key={property.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="min-w-0">
                  <CardTitle className="text-base font-display truncate">{property.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {PROPERTY_TYPE_LABELS[property.property_type]}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[property.status] ?? 'outline'} className="capitalize">
                  {property.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {property.city && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{property.city}</span>
                  </div>
                )}
                {property.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{property.phone}</span>
                  </div>
                )}
                {property.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{property.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{formatHours(property.operating_hours)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setCreateError(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a new property</DialogTitle>
            <DialogDescription>
              Create a property under {currentOrg.name}. You&apos;ll be assigned to it automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="prop-name">Name</Label>
              <Input
                id="prop-name"
                placeholder="The Grand Cafe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-type">Property type</Label>
              <Select
                value={form.property_type}
                onValueChange={(v) => setForm({ ...form, property_type: v as IndustryType })}
              >
                <SelectTrigger id="prop-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prop-city">City</Label>
                <Input
                  id="prop-city"
                  placeholder="Mumbai"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-phone">Phone</Label>
                <Input
                  id="prop-phone"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-email">Email</Label>
              <Input
                id="prop-email"
                type="email"
                placeholder="hello@grandcafe.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prop-tz">Timezone</Label>
                <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
                  <SelectTrigger id="prop-tz">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-currency">Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger id="prop-currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {createError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {createError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !form.name.trim()}>
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
