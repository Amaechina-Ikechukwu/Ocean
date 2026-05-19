import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/sidebar/Sidebar';
import { Editor } from './components/editor/Editor';
import { Search } from './components/search/Search';
import { Settings } from './components/settings/Settings';
import { Login } from './components/auth/Login';
import { AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Toaster } from 'sonner';
import { PublicPage } from './components/public/PublicPage';
import { Onboarding } from './components/onboarding/Onboarding';
import { useThemeStore } from './lib/store';

function useApplyTheme() {
  const theme = useThemeStore(s => s.theme);
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <div key={location.pathname.split('/')[2] || location.pathname} className="min-w-0 h-full flex flex-col flex-1 overflow-hidden relative">
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/app" element={<Editor />} />
          <Route path="/app/search" element={<Search />} />
          <Route path="/app/settings" element={<Settings />} />
          <Route path="/app/:pageId" element={<Editor />} />
        </Routes>
      </div>
    </AnimatePresence>
  );
}

import { useFirebaseSync } from './lib/sync';

function AppLayout() {
  useFirebaseSync();
  return (
    <div className="flex w-full h-screen bg-ocean-bg overflow-hidden text-ocean-text relative">
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-ocean-blue/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-ocean-blue/5 blur-[120px] pointer-events-none z-0"></div>
      
      <div className="relative z-10 flex w-full h-full">
        <Sidebar />
        <AnimatedRoutes />
      </div>
      <Toaster position="bottom-right" toastOptions={{ className: 'font-sans relative z-50' }} />
    </div>
  );
}

function AuthedShell() {
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
    return <div className="w-full h-screen flex items-center justify-center bg-ocean-bg"><div className="animate-pulse w-8 h-8 rounded-full bg-ocean-blue/50"></div></div>;
  }

  if (!user) {
    return <Login />;
  }

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

  return <AppLayout />;
}

export default function App() {
  useApplyTheme();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/p/:wsId/:slug" element={<PublicPage />} />
        <Route path="*" element={<AuthedShell />} />
      </Routes>
    </BrowserRouter>
  );
}
