'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Headset, Phone, Globe, Clock, Mic, AlertCircle, Check,
  MessageSquare, Send, Bot, Save, Building2
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'te', label: 'Telugu' },
  { code: 'ta', label: 'Tamil' },
  { code: 'kn', label: 'Kannada' },
  { code: 'mr', label: 'Marathi' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AIReceptionistPage() {
  const { currentOrg, currentProperty, refresh } = useApp();
  const [greeting, setGreeting] = useState('');
  const [greetingDocId, setGreetingDocId] = useState<string | null>(null);
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [escalationPhone, setEscalationPhone] = useState('');
  const [fallbackBehavior, setFallbackBehavior] = useState('ask_to_hold');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!currentProperty) {
      setLoading(false);
      return;
    }
    setLoading(true);

    (async () => {
      const { data } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('property_id', currentProperty.id)
        .eq('title', 'AI Greeting')
        .maybeSingle();

      if (data) {
        setGreeting(data.content);
        setGreetingDocId(data.id);
      } else {
        setGreeting(`Hello, thank you for calling ${currentProperty.name}. How may I help you today?`);
      }

      setEscalationPhone(currentProperty.phone ?? '');
      setLoading(false);
    })();
  }, [currentProperty]);

  const handleSaveGreeting = async () => {
    if (!currentProperty) return;
    setSaving(true);
    if (greetingDocId) {
      await supabase
        .from('knowledge_documents')
        .update({ content: greeting, updated_at: new Date().toISOString() })
        .eq('id', greetingDocId);
    } else {
      const { data } = await supabase
        .from('knowledge_documents')
        .insert({
          property_id: currentProperty.id,
          title: 'AI Greeting',
          content: greeting,
          category: 'info',
        })
        .select()
        .single();
      if (data) setGreetingDocId(data.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!currentProperty) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <Building2 className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold mb-2">No property selected</h2>
        <p className="text-muted-foreground">Select a property to configure your AI receptionist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Headset className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">AI Receptionist</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure how your AI agent handles incoming calls
            </p>
          </div>
        </div>
        <Badge variant={currentProperty.status === 'active' ? 'default' : 'secondary'}>
          {currentProperty.status === 'active' ? 'Active' : 'Setup Pending'}
        </Badge>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground animate-pulse-soft">Loading configuration...</div>
      ) : (
        <>
          {/* Greeting & Brand Voice */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">Greeting & Brand Voice</CardTitle>
              <CardDescription>The opening message callers hear when they reach your business.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                rows={3}
                placeholder="Enter your AI receptionist's greeting..."
              />
              <div className="flex items-center gap-3">
                <Button onClick={handleSaveGreeting} disabled={saving} size="sm">
                  {saving ? 'Saving...' : saved ? (
                    <><Check className="w-4 h-4 mr-1" /> Saved</>
                  ) : (
                    <><Save className="w-4 h-4 mr-1" /> Save greeting</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Supported Languages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Globe className="w-4 h-4 text-accent" />
                Supported Languages
              </CardTitle>
              <CardDescription>Languages your AI receptionist can converse in.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => {
                  const active = currentOrg?.supported_languages?.includes(lang.code);
                  return (
                    <Badge
                      key={lang.code}
                      variant={active ? 'default' : 'outline'}
                      className="text-sm py-1.5"
                    >
                      {lang.label}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Language preferences are managed at the organization level in Settings.
              </p>
            </CardContent>
          </Card>

          {/* Call Recording */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Mic className="w-4 h-4 text-accent" />
                Call Recording
              </CardTitle>
              <CardDescription>Recording is disabled by default. A consent announcement is required when enabled.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Enable call recording</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Callers will hear a consent announcement before recording begins.
                  </div>
                </div>
                <Switch
                  checked={recordingEnabled}
                  onCheckedChange={setRecordingEnabled}
                />
              </div>
              {recordingEnabled && (
                <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Recording requires caller consent under Indian telecommunications regulations.
                    A consent announcement will be played automatically before recording starts.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Human Escalation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Phone className="w-4 h-4 text-accent" />
                Human Escalation
              </CardTitle>
              <CardDescription>When the AI cannot handle a request, define how to transfer to a human.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="escalation-phone">Escalation phone number</Label>
                <Input
                  id="escalation-phone"
                  value={escalationPhone}
                  onChange={(e) => setEscalationPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fallback">Fallback behavior</Label>
                <Select value={fallbackBehavior} onValueChange={setFallbackBehavior}>
                  <SelectTrigger id="fallback">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ask_to_hold">Ask caller to hold for staff</SelectItem>
                    <SelectItem value="request_callback">Request a callback from staff</SelectItem>
                    <SelectItem value="transfer_to_staff">Transfer call to staff directly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Test Conversation (Visual) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent" />
                Test Conversation Preview
              </CardTitle>
              <CardDescription>
                A sample interaction showing how your AI receptionist would handle a call.
                This is a visual preview — not a live AI connection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] rounded-lg border p-4">
                <div className="space-y-4">
                  {[
                    { role: 'agent', text: greeting || 'Hello, thank you for calling. How may I help you?' },
                    { role: 'caller', text: 'Hi, I\u2019d like to place a takeaway order for two cappuccinos and a croissant.' },
                    { role: 'agent', text: 'I can help with that. Let me check availability. Two cappuccinos and one croissant \u2014 is that correct?' },
                    { role: 'caller', text: 'Yes, that\u2019s right.' },
                    { role: 'agent', text: 'Your total comes to \u20b9450. The estimated pickup time is 12 minutes. Shall I confirm this order?' },
                    { role: 'caller', text: 'Yes, please confirm.' },
                    { role: 'agent', text: 'Your order has been confirmed. You\u2019ll receive an SMS confirmation shortly. Thank you for calling!' },
                  ].map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'agent' ? 'flex-row' : 'flex-row-reverse'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'agent' ? 'bg-primary' : 'bg-accent'
                      }`}>
                        {msg.role === 'agent' ? (
                          <Bot className="w-4 h-4 text-primary-foreground" />
                        ) : (
                          <span className="text-xs font-medium text-accent-foreground">U</span>
                        )}
                      </div>
                      <div className={`rounded-xl p-3 max-w-[80%] ${
                        msg.role === 'agent' ? 'bg-secondary text-foreground' : 'bg-primary text-primary-foreground'
                      }`}>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="mt-3 flex items-center gap-2">
                <Input placeholder="Type a test message..." className="flex-1" />
                <Button size="icon" disabled>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                This is a visual preview. Live AI voice interaction requires telephony and AI provider configuration.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
