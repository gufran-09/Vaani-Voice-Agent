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

  // Live conversation testing state
  const [testMessages, setTestMessages] = useState<Array<{ role: 'agent' | 'caller'; text: string }>>([
    { role: 'agent', text: 'Namaste! Welcome to Cafe Vaani. What would you like to order today?' },
  ]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testOrderCreated, setTestOrderCreated] = useState<any | null>(null);
  const [testMockSms, setTestMockSms] = useState<any | null>(null);
  const [testSessionId] = useState(() => `receptionist-${Date.now()}`);

  const handleSendTestMessage = async (msgToSend?: string) => {
    const text = (msgToSend || testInput).trim();
    if (!text || testLoading || !currentProperty) return;

    setTestInput('');
    setTestLoading(true);
    setTestMessages((prev) => [...prev, { role: 'caller', text }]);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          sessionId: testSessionId,
          propertyId: currentProperty.id,
          callerPhone: escalationPhone || '+919876543210',
          customerName: 'Receptionist Test Guest',
        }),
      });
      const data = await res.json();
      const reply = data.reply || 'Request received.';
      setTestMessages((prev) => [...prev, { role: 'agent', text: reply }]);

      if (data.orderCreated || data.order) {
        setTestOrderCreated(data.orderCreated || data.order);
        if (data.mockSms) {
          setTestMockSms(data.mockSms);
        }
      }
    } catch (err) {
      setTestMessages((prev) => [
        ...prev,
        { role: 'agent', text: 'Sorry, could not connect to agent service.' },
      ]);
    } finally {
      setTestLoading(false);
    }
  };

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

          {/* Test Conversation (Interactive & Live) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-accent" />
                    Live Test Conversation
                  </CardTitle>
                  <CardDescription>
                    Test your AI receptionist directly against real PostgreSQL menu & ordering pipeline with local Ollama or deterministic fallback.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                  Active Local Engine
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-[300px] rounded-lg border p-4 bg-muted/20">
                <div className="space-y-3">
                  {testMessages.map((msg, i) => (
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
                  {testLoading && (
                    <div className="flex gap-3 flex-row items-center text-xs text-muted-foreground animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <p>VAANI is thinking...</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Order Created confirmation badge & details */}
              {testOrderCreated && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">Order Persisted to PostgreSQL: </span>
                    <span className="font-mono">{testOrderCreated.order_number || testOrderCreated.orderId || testOrderCreated.id}</span>
                  </div>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                    ₹{testOrderCreated.total_amount || testOrderCreated.totalAmount || 0}
                  </Badge>
                </div>
              )}

              {/* Mock SMS Card */}
              {testMockSms && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Mock SMS Notification</span>
                      <Badge className="bg-amber-500 text-white font-mono text-[10px] uppercase tracking-wider">
                        SIMULATED — NOT SENT
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      Status: {testMockSms.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span>Recipient: </span>
                    <span className="font-mono text-foreground">{testMockSms.to}</span>
                  </div>
                  <div className="bg-background/80 p-2.5 rounded-lg border text-xs font-sans text-foreground">
                    &quot;{testMockSms.message}&quot;
                  </div>
                </div>
              )}

              {/* Input row */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type '2 cappuccinos' or 'confirm order'..."
                  className="flex-1"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendTestMessage();
                  }}
                  disabled={testLoading}
                />
                <Button
                  size="icon"
                  onClick={() => handleSendTestMessage()}
                  disabled={testLoading || !testInput.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick test suggestion chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'What is on the menu?',
                  'I want 2 Cappuccinos',
                  'Confirm order',
                  'What is the status of my order?',
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSendTestMessage(chip)}
                    disabled={testLoading}
                    className="text-[11px] bg-secondary hover:bg-secondary/80 text-secondary-foreground px-2.5 py-1 rounded-full transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
