'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/api';
import type { Database } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Settings, Building2, Bell, Save, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

type Organization = Database['public']['Tables']['organizations']['Row'];

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'UTC',
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'bn', label: 'Bengali' },
  { code: 'mr', label: 'Marathi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'ar', label: 'Arabic' },
];

interface NotificationPrefs {
  sms: boolean;
  whatsapp: boolean;
  email: boolean;
}

export default function SettingsPage() {
  const { currentOrg, loading: orgLoading, refresh } = useApp();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [language, setLanguage] = useState('en');
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<NotificationPrefs>({
    sms: true,
    whatsapp: false,
    email: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg) return;
    setName(currentOrg.name);
    setTimezone(currentOrg.default_timezone);
    setCurrency(currentOrg.default_currency);
    setLanguage(currentOrg.default_language);
    setSupportedLanguages(currentOrg.supported_languages ?? []);
  }, [currentOrg]);

  const toggleLanguage = (code: string) => {
    setSupportedLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    if (!currentOrg) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: name.trim(),
          default_timezone: timezone,
          default_currency: currency,
          default_language: language,
          supported_languages: supportedLanguages,
        })
        .eq('id', currentOrg.id);

      if (updateError) throw updateError;

      setSaved(true);
      refresh();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (orgLoading) {
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
          <Settings className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">No organization selected</h2>
        <p className="text-muted-foreground">Select an organization to configure its settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your organization preferences
        </p>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="w-4 h-4" />
            Business Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Business Profile tab */}
        <TabsContent value="business" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">Business Profile</CardTitle>
              <CardDescription>Update your organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization name</Label>
                <Input
                  id="org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Business"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="org-tz">Default timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="org-tz">
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
                  <Label htmlFor="org-currency">Default currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="org-currency">
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

              <div className="space-y-2">
                <Label htmlFor="org-lang">Default language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="org-lang">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>{lang.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Supported languages</Label>
                <p className="text-xs text-muted-foreground">
                  Select all languages your AI receptionist should support.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {LANGUAGES.map((lang) => (
                    <div key={lang.code} className="flex items-center space-x-2">
                      <Checkbox
                        id={`lang-${lang.code}`}
                        checked={supportedLanguages.includes(lang.code)}
                        onCheckedChange={() => toggleLanguage(lang.code)}
                      />
                      <Label htmlFor={`lang-${lang.code}`} className="text-sm font-normal cursor-pointer">
                        {lang.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications tab */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">Notifications</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { key: 'sms' as const, label: 'SMS', description: 'Receive text messages for urgent alerts' },
                { key: 'whatsapp' as const, label: 'WhatsApp', description: 'Get notifications via WhatsApp' },
                { key: 'email' as const, label: 'Email', description: 'Receive summary emails and reports' },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-4 border-b last:border-0"
                >
                  <div className="pr-4">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                  </div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save bar */}
      <div className="flex items-center justify-end gap-3">
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive mr-auto">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {saved && !error && (
          <div className="flex items-center gap-2 text-sm text-success mr-auto">
            <CheckCircle2 className="w-4 h-4" />
            Settings saved
          </div>
        )}
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
