'use client';

import { useEffect, useState, useCallback } from 'react';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/api';
import type { Database } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Crown, Sparkles, Building, AlertCircle, Loader2, TrendingUp, Clock } from 'lucide-react';

type UsageRecord = Database['public']['Tables']['usage_records']['Row'];
type SubscriptionPlan = Database['public']['Tables']['organizations']['Row']['subscription_plan'];
type SubscriptionStatus = Database['public']['Tables']['organizations']['Row']['subscription_status'];

interface PlanInfo {
  name: string;
  price: string;
  limits: Record<string, number>;
  features: string[];
}

const PLAN_INFO: Record<SubscriptionPlan, PlanInfo> = {
  starter: {
    name: 'Starter',
    price: '₹2,000/mo',
    limits: { calls: 500, messages: 2000, minutes: 1000 },
    features: ['1 property', '500 AI calls / month', 'Basic analytics', 'Email support'],
  },
  professional: {
    name: 'Professional',
    price: '₹6,000/mo',
    limits: { calls: 3000, messages: 10000, minutes: 6000 },
    features: ['5 properties', '3,000 AI calls / month', 'Advanced analytics', 'Priority support', 'Multi-language'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    limits: { calls: 50000, messages: 200000, minutes: 100000 },
    features: ['Unlimited properties', '50,000 AI calls / month', 'Custom integrations', 'Dedicated manager', 'SLA guarantee'],
  },
  trial: {
    name: 'Trial',
    price: 'Free',
    limits: { calls: 100, messages: 500, minutes: 200 },
    features: ['1 property', '100 AI calls', 'Full feature access', '14-day trial'],
  },
};

const PLAN_ORDER: SubscriptionPlan[] = ['starter', 'professional', 'enterprise'];

const PLAN_ICONS: Record<SubscriptionPlan, typeof Sparkles> = {
  starter: Sparkles,
  professional: Crown,
  enterprise: Building,
  trial: Sparkles,
};

const METRIC_LABELS: Record<string, string> = {
  calls: 'AI Calls',
  messages: 'Messages Sent',
  minutes: 'Call Minutes',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function SubscriptionPage() {
  const { currentOrg, loading: orgLoading } = useApp();
  const [usageByMetric, setUsageByMetric] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('usage_records')
        .select('metric_type, metric_value')
        .eq('organization_id', currentOrg.id);

      if (fetchError) throw fetchError;

      const grouped: Record<string, number> = {};
      for (const record of (data ?? []) as UsageRecord[]) {
        grouped[record.metric_type] = (grouped[record.metric_type] ?? 0) + record.metric_value;
      }
      setUsageByMetric(grouped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load usage data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

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
          <Crown className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">No organization selected</h2>
        <p className="text-muted-foreground">Select an organization to view subscription details.</p>
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
        <Button onClick={fetchUsage} variant="outline">Try again</Button>
      </div>
    );
  }

  const currentPlan = currentOrg.subscription_plan;
  const planInfo = PLAN_INFO[currentPlan];
  const isTrial = currentOrg.subscription_status === 'trial';
  const trialDaysLeft = daysUntil(currentOrg.trial_ends_at);
  const usageMetrics = Object.keys(planInfo.limits);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">Subscription &amp; Usage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your plan and monitor usage for {currentOrg.name}
        </p>
      </div>

      {/* Current plan summary */}
      <Card className={isTrial ? 'border-accent/40 bg-accent/5' : ''}>
        <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              {(() => {
                const Icon = PLAN_ICONS[currentPlan];
                return <Icon className="w-6 h-6 text-primary" />;
              })()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-lg">{planInfo.name} Plan</h3>
                <Badge variant={isTrial ? 'secondary' : 'default'} className="capitalize">
                  {currentOrg.subscription_status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {planInfo.price}
                {isTrial && currentOrg.trial_ends_at && (
                  <> • Trial ends {formatDate(currentOrg.trial_ends_at)}</>
                )}
              </p>
            </div>
          </div>
          {isTrial && trialDaysLeft !== null && (
            <div className="text-right">
              <div className="text-2xl font-display font-bold">{trialDaysLeft}</div>
              <div className="text-xs text-muted-foreground">days left in trial</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trial banner */}
      {isTrial && (
        <Card className="bg-primary text-primary-foreground border-0">
          <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg">
                  {trialDaysLeft !== null && trialDaysLeft > 0
                    ? `${trialDaysLeft} days left in your trial`
                    : 'Your trial has ended'}
                </h3>
                <p className="text-sm text-primary-foreground/70">
                  Upgrade to keep your AI receptionist running 24/7.
                </p>
              </div>
            </div>
            <Button variant="secondary">Upgrade Now</Button>
          </CardContent>
        </Card>
      )}

      {/* Usage limits */}
      <div>
        <h2 className="text-lg font-display font-semibold mb-3">Usage This Period</h2>
        {usageMetrics.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No usage data yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {usageMetrics.map((metric) => {
              const used = usageByMetric[metric] ?? 0;
              const limit = planInfo.limits[metric] ?? 0;
              const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
              return (
                <Card key={metric}>
                  <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {METRIC_LABELS[metric] ?? metric}
                    </CardTitle>
                    <Badge variant={pct >= 90 ? 'destructive' : pct >= 75 ? 'secondary' : 'outline'}>
                      {Math.round(pct)}%
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-display font-bold">{used.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">of {limit.toLocaleString()}</span>
                    </div>
                    <Progress value={pct} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Plan comparison */}
      <div>
        <h2 className="text-lg font-display font-semibold mb-3">Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((planKey) => {
            const info = PLAN_INFO[planKey];
            const isCurrent = planKey === currentPlan;
            const Icon = PLAN_ICONS[planKey];
            return (
              <Card
                key={planKey}
                className={isCurrent ? 'border-primary ring-1 ring-primary' : ''}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-display flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      {info.name}
                    </CardTitle>
                    {isCurrent && <Badge>Current</Badge>}
                  </div>
                  <CardDescription>{info.price}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {info.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={isCurrent}
                  >
                    {isCurrent ? 'Current Plan' : `Upgrade to ${info.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
