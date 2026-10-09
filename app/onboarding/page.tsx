'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Check, Building2, Store, UtensilsCrossed, Hotel, Palmtree } from 'lucide-react';
import type { IndustryType } from '@/lib/types';

const INDUSTRY_OPTIONS: { value: IndustryType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'cafe', label: 'Cafe', icon: Store, desc: 'Coffee shops and takeaway' },
  { value: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, desc: 'Dining and fine dining' },
  { value: 'hotel', label: 'Hotel', icon: Hotel, desc: 'Hotels and guest houses' },
  { value: 'resort', label: 'Resort', icon: Palmtree, desc: 'Resorts and retreats' },
  { value: 'bakery', label: 'Bakery', icon: Building2, desc: 'Bakeries and patisseries' },
  { value: 'cloud_kitchen', label: 'Cloud Kitchen', icon: UtensilsCrossed, desc: 'Delivery-only kitchens' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState<IndustryType>('cafe');
  const [propertyName, setPropertyName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [languages, setLanguages] = useState<string[]>(['en']);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [authLoading, user, router]);

  const toggleLanguage = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug,
          industry,
          default_timezone: timezone,
          default_currency: currency,
          default_language: 'en',
          supported_languages: languages,
          subscription_plan: 'trial',
          subscription_status: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (orgError) throw orgError;

      const { error: membershipError } = await supabase.from('memberships').insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'owner',
      });

      if (membershipError) throw membershipError;

      const { data: property, error: propError } = await supabase
        .from('properties')
        .insert({
          organization_id: org.id,
          name: propertyName,
          property_type: industry,
          city,
          phone,
          timezone,
          currency,
          status: 'active',
        })
        .select()
        .single();

      if (propError) throw propError;

      const { error: assignError } = await supabase.from('property_assignments').insert({
        property_id: property.id,
        user_id: user.id,
      });

      if (assignError) throw assignError;

      router.push('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">V</span>
            </div>
            <span className="font-display font-bold text-lg">VAANI</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Step {step} of 3
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {error && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Step 1: Organization */}
          {step === 1 && (
            <Card className="animate-fade-in-up">
              <CardHeader>
                <CardTitle className="text-2xl font-display">Tell us about your business</CardTitle>
                <p className="text-muted-foreground">This is your organization name in VAANI.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization name</Label>
                  <Input
                    id="orgName"
                    placeholder="e.g. Saffron Hospitality Group"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="space-y-3">
                  <Label>What type of business is this?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setIndustry(opt.value)}
                        className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
                          industry === opt.value
                            ? 'border-accent bg-accent/10 ring-1 ring-accent'
                            : 'border-border hover:border-accent/50 hover:bg-accent/5'
                        }`}
                      >
                        <opt.icon className="w-5 h-5 text-accent" />
                        <div>
                          <div className="font-medium text-sm">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!orgName}
                    size="lg"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Property */}
          {step === 2 && (
            <Card className="animate-fade-in-up">
              <CardHeader>
                <CardTitle className="text-2xl font-display">Your first property</CardTitle>
                <p className="text-muted-foreground">Set up your first location or branch.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="propertyName">Property name</Label>
                  <Input
                    id="propertyName"
                    placeholder="e.g. Saffron Cafe — Bandra"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Business phone</Label>
                    <Input
                      id="phone"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                        <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                        <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                        <SelectItem value="America/New_York">US Eastern (EST)</SelectItem>
                        <SelectItem value="Europe/London">UK (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="AED">AED (د.إ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)} size="lg">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={!propertyName} size="lg">
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Languages */}
          {step === 3 && (
            <Card className="animate-fade-in-up">
              <CardHeader>
                <CardTitle className="text-2xl font-display">Languages & preferences</CardTitle>
                <p className="text-muted-foreground">Which languages should your AI receptionist support?</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {[
                    { code: 'en', label: 'English', desc: 'Universal support' },
                    { code: 'hi', label: 'Hindi', desc: 'हिन्दी — most spoken in India' },
                    { code: 'te', label: 'Telugu', desc: 'తెలుగు — Andhra & Telangana' },
                    { code: 'ta', label: 'Tamil', desc: 'தமிழ் — Tamil Nadu' },
                    { code: 'kn', label: 'Kannada', desc: 'ಕನ್ನಡ — Karnataka' },
                    { code: 'mr', label: 'Marathi', desc: 'मराठी — Maharashtra' },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => toggleLanguage(lang.code)}
                      className={`flex items-center justify-between w-full rounded-xl border p-4 transition-all ${
                        languages.includes(lang.code)
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-medium">{lang.label}</div>
                        <div className="text-xs text-muted-foreground">{lang.desc}</div>
                      </div>
                      {languages.includes(lang.code) && (
                        <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                          <Check className="w-3 h-3 text-accent-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)} size="lg">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading || languages.length === 0} size="lg">
                    {loading ? 'Setting up...' : 'Complete setup'}
                    {!loading && <Check className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
