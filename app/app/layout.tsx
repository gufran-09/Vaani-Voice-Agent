'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { AppProvider, useApp } from '@/components/app-provider';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopbar } from '@/components/app-topbar';
import { VoiceCallModal } from '@/components/voice-call-modal';

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { loading: appLoading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [authLoading, user, router]);

  if (authLoading || (user && appLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center animate-pulse-soft">
            <span className="text-primary-foreground font-display font-bold">V</span>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse-soft">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary/20 flex">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppTopbar />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
      <VoiceCallModal />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
