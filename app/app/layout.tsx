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
      <div className="min-h-screen flex items-center justify-center bg-cafe-cream">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cafe-coral text-white flex items-center justify-center animate-pulse shadow-warm">
            <span className="font-display font-extrabold text-xl">V</span>
          </div>
          <p className="text-xs font-bold text-cafe-espresso/70 animate-pulse">Loading Café Workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cafe-sand/20 flex text-cafe-espresso">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppTopbar />
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-cafe-cream/30">
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
