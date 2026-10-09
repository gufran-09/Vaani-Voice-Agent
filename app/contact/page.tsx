'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, MapPin, ArrowRight, Check } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSubmitted(true);
    setLoading(false);
  };

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h1 className="text-4xl lg:text-5xl font-display font-bold mb-4">
                Talk to our team
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Whether you run a single cafe or a multi-property hotel group, we&apos;ll help you find the right setup for your business.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-medium">Email</h3>
                    <p className="text-sm text-muted-foreground">sales@vaani.ai</p>
                    <p className="text-sm text-muted-foreground">support@vaani.ai</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-medium">Phone</h3>
                    <p className="text-sm text-muted-foreground">+91 80 4567 8900</p>
                    <p className="text-sm text-muted-foreground">Mon–Fri, 9 AM – 7 PM IST</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-medium">Office</h3>
                    <p className="text-sm text-muted-foreground">UB City, Vittal Mallya Road</p>
                    <p className="text-sm text-muted-foreground">Bengaluru, Karnataka 560001</p>
                  </div>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-display">Request a demo</CardTitle>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-7 h-7 text-success" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">Thank you!</h3>
                    <p className="text-sm text-muted-foreground">
                      We&apos;ve received your request. Our team will reach out within 24 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full name</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Sharma" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Work email</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@business.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company name</Label>
                      <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required placeholder="Saffron Hospitality" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger id="industry">
                          <SelectValue placeholder="Select your industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cafe">Cafe</SelectItem>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="hotel">Hotel</SelectItem>
                          <SelectItem value="resort">Resort</SelectItem>
                          <SelectItem value="bakery">Bakery</SelectItem>
                          <SelectItem value="cloud_kitchen">Cloud Kitchen</SelectItem>
                          <SelectItem value="hotel_group">Hotel Group</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">How can we help?</Label>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell us about your business and what you're looking for..."
                        rows={4}
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full" size="lg">
                      {loading ? 'Sending...' : 'Send request'}
                      {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
