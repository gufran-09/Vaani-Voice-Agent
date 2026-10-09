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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plug,
  Phone,
  MessageCircle,
  CreditCard,
  Building2,
  Hotel,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Zap,
} from 'lucide-react';

type Integration = Database['public']['Tables']['integrations']['Row'];
type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

/* ---------- Service catalog ---------- */

interface ServiceCatalogEntry {
  name: string;
  description: string;
  icon: typeof Phone;
  color: string;
  bg: string;
}

const SERVICE_CATALOG: Record<string, ServiceCatalogEntry> = {
  'Amazon Connect': {
    name: 'Amazon Connect',
    description: 'Cloud contact center for inbound voice calls.',
    icon: Phone,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  Twilio: {
    name: 'Twilio',
    description: 'Programmable voice & SMS telephony.',
    icon: Phone,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  'WhatsApp Business': {
    name: 'WhatsApp Business',
    description: 'Send reservations & order updates via WhatsApp.',
    icon: MessageCircle,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  'MSG91 SMS': {
    name: 'MSG91 SMS',
    description: 'Transactional SMS gateway for OTPs & alerts.',
    icon: Send,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  Razorpay: {
    name: 'Razorpay',
    description: 'Accept online payments for orders.',
    icon: CreditCard,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
  },
  Zoho: {
    name: 'Zoho',
    description: 'Sync contacts, invoices & CRM data.',
    icon: Building2,
    color: 'text-red-600',
    bg: 'bg-red-600/10',
  },
  PMS: {
    name: 'PMS',
    description: 'Property Management System integration.',
    icon: Hotel,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
};

const SERVICE_NAMES = Object.keys(SERVICE_CATALOG);

/* ---------- status helpers ---------- */

const STATUS_META: Record<
  IntegrationStatus,
  { label: string; badge: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }
> = {
  connected: { label: 'Connected', badge: 'default', icon: CheckCircle2 },
  disconnected: { label: 'Disconnected', badge: 'outline', icon: XCircle },
  error: { label: 'Error', badge: 'destructive', icon: AlertCircle },
  pending: { label: 'Pending', badge: 'secondary', icon: Clock },
};

function formatSyncDate(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ---------- component ---------- */

interface ConnectForm {
  apiKey: string;
  region: string;
}

export default function IntegrationsPage() {
  const { currentProperty } = useApp();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [connectService, setConnectService] = useState<string | null>(null);
  const [connectForm, setConnectForm] = useState<ConnectForm>({ apiKey: '', region: 'ap-south-1' });
  const [connecting, setConnecting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    if (!currentProperty) {
      setIntegrations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('integrations')
      .select('*')
      .eq('property_id', currentProperty.id)
      .order('created_at', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setIntegrations(data ?? []);
    }
    setLoading(false);
  }, [currentProperty]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Build a lookup of existing integration by service_name
  const integrationByName = new Map<string, Integration>();
  for (const integ of integrations) {
    integrationByName.set(integ.service_name, integ);
  }

  const openConnectDialog = (serviceName: string) => {
    setConnectService(serviceName);
    setConnectForm({ apiKey: '', region: 'ap-south-1' });
    setDialogOpen(true);
  };

  const handleConnect = async () => {
    if (!currentProperty || !connectService) return;
    setConnecting(true);

    const existing = integrationByName.get(connectService);
    if (existing) {
      // Update existing row to pending
      const { error: updateError } = await supabase
        .from('integrations')
        .update({ status: 'pending' as IntegrationStatus })
        .eq('id', existing.id);
      if (updateError) {
        setError(updateError.message);
      }
    } else {
      // Insert a new integration row with pending status
      const { error: insertError } = await supabase.from('integrations').insert({
        property_id: currentProperty.id,
        service_name: connectService,
        status: 'pending',
        config: { region: connectForm.region },
      });
      if (insertError) {
        setError(insertError.message);
      }
    }

    setConnecting(false);
    setDialogOpen(false);
    await fetchIntegrations();
  };

  const handleDisconnect = async (integ: Integration) => {
    const { error: updateError } = await supabase
      .from('integrations')
      .update({ status: 'disconnected' as IntegrationStatus })
      .eq('id', integ.id);
    if (updateError) {
      setError(updateError.message);
    } else {
      await fetchIntegrations();
    }
  };

  if (!currentProperty) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <Plug className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">No property selected</h2>
        <p className="text-muted-foreground">
          Select a property to manage its integrations.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">Loading integrations…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect external services to power calls, messaging, and payments.
          </p>
        </div>
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

      {integrations.length === 0 && SERVICE_NAMES.length > 0 ? (
        <div className="space-y-6">
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-1">No integrations connected</h3>
              <p className="text-sm text-muted-foreground">
                Browse the available services below and connect the ones you need.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Service grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICE_NAMES.map((serviceName) => {
          const meta = SERVICE_CATALOG[serviceName];
          const Icon = meta.icon;
          const integ = integrationByName.get(serviceName);
          const status: IntegrationStatus = integ?.status ?? 'disconnected';
          const statusMeta = STATUS_META[status];
          const StatusIcon = statusMeta.icon;

          return (
            <Card key={serviceName} className="flex flex-col">
              <CardHeader className="space-y-0 pb-3">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-lg ${meta.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <Badge variant={statusMeta.badge} className="text-xs">
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusMeta.label}
                  </Badge>
                </div>
                <CardTitle className="text-base font-display mt-3">{meta.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground flex-1">{meta.description}</p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="text-xs text-muted-foreground">
                    Last sync: {formatSyncDate(integ?.last_sync_at ?? null)}
                  </span>
                </div>
                <div className="mt-3">
                  {status === 'connected' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => integ && handleDisconnect(integ)}
                    >
                      Disconnect
                    </Button>
                  ) : status === 'pending' ? (
                    <Button variant="secondary" size="sm" className="w-full" disabled>
                      <Clock className="w-4 h-4 mr-2" />
                      Pending
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => openConnectDialog(serviceName)}
                    >
                      <Plug className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connect dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Connect {connectService ? SERVICE_CATALOG[connectService]?.name : ''}
            </DialogTitle>
            <DialogDescription>
              Enter your credentials to initiate the connection. The status will be set to pending
              while we verify.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your API key"
                value={connectForm.apiKey}
                onChange={(e) => setConnectForm({ ...connectForm, apiKey: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Region</Label>
              <Select
                value={connectForm.region}
                onValueChange={(value) => setConnectForm({ ...connectForm, region: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ap-south-1">Asia Pacific (Mumbai)</SelectItem>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={connecting}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
