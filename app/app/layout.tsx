'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'motion/react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Toaster } from 'sonner';
import { auth } from '@/src/lib/firebase';
import { Sidebar } from '@/src/components/sidebar/Sidebar';
import { Login } from '@/src/components/auth/Login';
import { Onboarding } from '@/src/components/onboarding/Onboarding';
import { useFirebaseSync } from '@/src/lib/sync';
import { useThemeStore } from '@/src/lib/store';

function useApplyTheme() {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);
}

function AppShell({ children }: { children: React.ReactNode }) {
  useFirebaseSync();
  const pathname = usePathname();
  const segmentKey = pathname.split('/')[2] || pathname;

  return (
    <div className="flex w-full h-screen bg-ocean-bg overflow-hidden text-ocean-text relative">
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-ocean-blue/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-ocean-blue/5 blur-[120px] pointer-events-none z-0"></div>

      <div className="relative z-10 flex w-full h-full">
        <Sidebar />
        <AnimatePresence mode="wait">
          <div
            key={segmentKey}
            className="min-w-0 h-full flex flex-col flex-1 overflow-hidden relative"
          >
            {children}
          </div>
        </AnimatePresence>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{ className: 'font-sans relative z-50' }}
      />
    </div>
  );
}

export default function AppRouteLayout({ children }: { children: React.ReactNode }) {
  useApplyTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setOnboarded(localStorage.getItem(`ocean.onboarded.${u.uid}`) === '1');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-ocean-bg">
        <div className="animate-pulse w-8 h-8 rounded-full bg-ocean-blue/50"></div>
      </div>
    );
  }

  if (!user) return <Login />;

  if (!onboarded) {
    return (
      <Onboarding
        onComplete={() => {
          localStorage.setItem(`ocean.onboarded.${user.uid}`, '1');
          setOnboarded(true);
        }}
      />
    );
  }

  return <AppShell>{children}</AppShell>;
}
