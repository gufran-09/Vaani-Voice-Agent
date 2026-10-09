import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Phone, ArrowRight } from 'lucide-react';

const PLANS = [
  {
    name: 'Starter',
    price: '₹4,999',
    period: '/month',
    desc: 'For a single cafe or small business getting started with AI voice.',
    features: [
      '1 property',
      'AI voice receptionist',
      'Up to 500 calls/month',
      'Menu & order management',
      'SMS notifications',
      'Basic analytics',
      '2 team members',
      'Email support',
    ],
    cta: 'Start free trial',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '₹14,999',
    period: '/month',
    desc: 'For growing restaurants and hotels with multiple staff and departments.',
    features: [
      'Up to 5 properties',
      'AI voice receptionist',
      'Up to 3,000 calls/month',
      'Full order & reservation system',
      'SMS + WhatsApp notifications',
      'Advanced analytics & reports',
      '15 team members',
      'Knowledge base management',
      'Guest request routing',
      'Priority support',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For hotel groups and hospitality chains with custom requirements.',
    features: [
      'Unlimited properties',
      'AI voice receptionist',
      'Custom call volume',
      'Multi-brand configuration',
      'All notification channels',
      'Custom analytics & exports',
      'Unlimited team members',
      'SSO & advanced permissions',
      'Dedicated infrastructure option',
      'PMS/POS integration support',
      'Dedicated account manager',
      '24/7 phone support',
    ],
    cta: 'Contact sales',
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Phone className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">VAANI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/sign-in"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link href="/sign-up"><Button size="sm">Start free trial</Button></Link>
          </div>
        </div>
      </nav>

      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Simple, transparent pricing</Badge>
            <h1 className="text-4xl lg:text-5xl font-display font-bold mb-4">
              Plans that scale with your business
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start with a 14-day free trial. No credit card required. Cancel anytime.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlighted
                    ? 'border-accent ring-2 ring-accent/20 shadow-lg lg:scale-105'
                    : 'border-border'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-accent text-accent-foreground">Most popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl font-display">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.desc}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="mb-6">
                    <span className="text-4xl font-display font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.cta === 'Contact sales' ? '/contact' : '/sign-up'} className="w-full">
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? 'default' : 'outline'}
                      size="lg"
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-16 max-w-3xl mx-auto text-center">
            <p className="text-sm text-muted-foreground">
              All plans include a 14-day free trial with full access to features.
              Pricing excludes telephony, SMS, and AI inference costs which are billed at provider rates.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
