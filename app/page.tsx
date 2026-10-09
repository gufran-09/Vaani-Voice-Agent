import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Phone, Mic, Brain, BarChart3, Bell, Shield, Globe, Zap, Users,
  UtensilsCrossed, Hotel, Store, ArrowRight, Check, Star,
  Headphones, MessageSquare, Clock, TrendingUp
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Phone className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">VAANI</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link href="/#industries" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Industries</Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="hidden sm:block">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">
                Start free trial
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-grid opacity-[0.03]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-6 px-3 py-1 text-xs font-medium">
              <SparkleIcon className="w-3 h-3 mr-1.5 text-accent" />
              AI-powered hospitality operations
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-6 text-balance">
              The voice of premium hospitality
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl">
              VAANI connects your guests, AI receptionist, kitchen, and management through one intelligent system.
              Built for cafes, restaurants, hotels, and hospitality groups.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="w-full sm:w-auto">
                  Start 14-day free trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/#features">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Explore features
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                Set up in minutes
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: 'Languages supported', value: '6+', icon: Globe },
              { label: 'Avg. response time', value: '<2s', icon: Zap },
              { label: 'Call resolution rate', value: '85%+', icon: TrendingUp },
              { label: 'Uptime target', value: '99.9%', icon: Shield },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex justify-center mb-3">
                  <stat.icon className="w-6 h-6 text-accent" />
                </div>
                <div className="text-3xl font-display font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4">
              Everything your hospitality business needs
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From AI-powered call handling to live kitchen operations, VAANI brings your entire operation into one platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Mic,
                title: 'AI Voice Receptionist',
                desc: 'Answers calls in multiple languages, takes orders, handles reservations, and routes requests to the right department.',
              },
              {
                icon: Brain,
                title: 'Intelligent Agent Orchestrator',
                desc: 'Tool-based AI architecture with validated actions, permission checks, and explicit customer confirmation before finalizing orders.',
              },
              {
                icon: UtensilsCrossed,
                title: 'Order Management',
                desc: 'Menu items, variants, pricing, allergens, stock tracking, preparation estimates, and kitchen ticket creation.',
              },
              {
                icon: BarChart3,
                title: 'Live Operations Dashboard',
                desc: 'Real-time view of active orders, preparation status, queue length, guest requests, and staff assignments.',
              },
              {
                icon: Bell,
                title: 'Customer Notifications',
                desc: 'Automated confirmations and updates via SMS, WhatsApp, and email with delivery tracking and consent-aware preferences.',
              },
              {
                icon: Shield,
                title: 'Enterprise Security',
                desc: 'Multi-tenant isolation, role-based access, audit logging, encryption in transit and at rest, and PII minimization.',
              },
            ].map((feature) => (
              <Card key={feature.title} className="group hover:shadow-lg transition-all duration-300 border-border/60 hover:border-accent/30">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-2 group-hover:bg-accent/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-accent" />
                  </div>
                  <CardTitle className="text-lg font-display">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="py-20 lg:py-28 bg-secondary/30 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4">
              Built for every hospitality vertical
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Industry-specific modules that adapt to how you operate, not the other way around.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Store,
                title: 'Cafes & Bakeries',
                features: ['Voice-based takeaway ordering', 'Live item availability', 'Pickup time estimates', 'Kitchen display integration'],
              },
              {
                icon: UtensilsCrossed,
                title: 'Restaurants',
                features: ['Table reservations', 'Menu & allergen info', 'Waitlist management', 'Private dining inquiries'],
              },
              {
                icon: Hotel,
                title: 'Hotels & Resorts',
                features: ['AI front-desk assistance', 'Room service routing', 'Concierge requests', 'Housekeeping & maintenance'],
              },
              {
                icon: Users,
                title: 'Multi-Location Groups',
                features: ['Central organization dashboard', 'Shared brand templates', 'Property-specific menus', 'Centralized analytics'],
              },
              {
                icon: Headphones,
                title: 'Cloud Kitchens',
                features: ['Delivery-only ordering', 'Multi-brand menus', 'Preparation queue management', 'Stock-out handling'],
              },
              {
                icon: MessageSquare,
                title: 'Fine Dining',
                features: ['Party size & seating preferences', 'Special occasion handling', 'Dietary request routing', 'Staff escalation for VIPs'],
              },
            ].map((industry) => (
              <Card key={industry.title} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                      <industry.icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-base font-display">{industry.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {industry.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4">
              How VAANI works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From customer call to confirmed order in seconds.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { num: '01', icon: Phone, title: 'Customer calls', desc: 'A customer calls your business. VAANI answers instantly with a branded greeting.' },
              { num: '02', icon: Brain, title: 'AI understands', desc: 'The AI agent detects intent, language, and uses validated tools to check menu, availability, and pricing.' },
              { num: '03', icon: Check, title: 'Customer confirms', desc: 'VAANI reads back the order or reservation for explicit confirmation before finalizing.' },
              { num: '04', icon: Bell, title: 'Staff notified', desc: 'The order appears on the kitchen dashboard. The customer receives an SMS or WhatsApp confirmation.' },
            ].map((step) => (
              <div key={step.num} className="relative">
                <div className="text-4xl font-display font-bold text-accent/30 mb-4">{step.num}</div>
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20 lg:py-28 bg-secondary/30 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4">
                Security & privacy by design
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Your customer conversations and business data are treated as sensitive operational information.
                VAANI is built with enterprise-grade security from the ground up.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Shield, title: 'Multi-tenant isolation', desc: 'Each organization\'s data is isolated at the database level with row-level security policies.' },
                  { icon: Users, title: 'Role-based access', desc: 'Granular permissions for owners, managers, front-desk, kitchen staff, and analysts.' },
                  { icon: Clock, title: 'Configurable retention', desc: 'Control how long call recordings, transcripts, and customer data are stored.' },
                  { icon: Globe, title: 'PII minimization', desc: 'Phone numbers are masked, audio retention is configurable, and sensitive data is encrypted.' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <Card className="overflow-hidden shadow-xl">
                <div className="bg-primary p-6 text-primary-foreground">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-accent" />
                    <span className="font-display font-semibold">Security Posture</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      'Encryption: TLS 1.3 in transit, AES-256 at rest',
                      'Auth: Supabase Auth with JWT sessions',
                      'Isolation: Row-level security on all tables',
                      'Audit: Every sensitive action is logged',
                      'Compliance: Indian privacy & telecom regulations',
                    ].map((line) => (
                      <div key={line} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-accent" />
                        <span className="text-primary-foreground/80">{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-display font-bold mb-6 text-balance">
            Ready to elevate your hospitality operations?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start your free trial today. Set up your AI receptionist, configure your menu, and see VAANI in action.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg">
                Start free trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                View pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Phone className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display font-bold text-lg">VAANI</span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-xs">
                AI-powered hospitality operations platform for premium businesses.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-sm">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/#features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="/#industries" className="hover:text-foreground transition-colors">Industries</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="/#security" className="hover:text-foreground transition-colors">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/sign-in" className="hover:text-foreground transition-colors">Sign in</Link></li>
                <li><Link href="/sign-up" className="hover:text-foreground transition-colors">Get started</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact sales</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© 2026 VAANI. All rights reserved.</p>
            <p className="text-xs text-muted-foreground">Built for the Indian hospitality market.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
    </svg>
  );
}
