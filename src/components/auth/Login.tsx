import React from 'react';
import { signInWithGoogle } from '../../lib/firebase';

export function Login() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0e0e0e] font-sans">

      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="/assets/images/hand-typing.png"
          alt=""
          className="w-full h-full object-cover object-center"
        />
        {/* Vignette: darker at edges, lets image breathe in center */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e0e]/90 via-[#0e0e0e]/60 to-[#0e0e0e]/95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(14,14,14,0.7)_100%)]" />
      </div>

      {/* Top bar — logo */}
      <header className="relative z-10 flex items-center justify-between px-10 py-8">
        <img src="/assets/logo-white.png" alt="Ocean" className="h-7 w-auto" />
        <p className="text-xs text-white/40 tracking-wider">
          A writing space for thinkers
        </p>
      </header>

      {/* Centered content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <p className="text-xs font-semibold tracking-[0.25em] text-ocean-blue uppercase mb-6">
          Your writing space
        </p>
        <h1 className="text-7xl md:text-8xl font-serif text-white leading-[1.05] mb-6 max-w-3xl">
          Welcome to Ocean<span className="text-ocean-blue">.</span>
        </h1>
        <p className="text-white/60 text-base mb-10 max-w-md">
          A calm, focused place to write, think, and publish. Sign in to sync your workspace securely.
        </p>

        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-3 py-3.5 px-7 bg-white text-[#1C1C1C] rounded-full font-medium text-sm hover:bg-white/90 transition-all hover:scale-[1.02] shadow-2xl shadow-black/50"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-white/30 text-xs">
          By signing in, you agree to our terms and privacy policy.
        </p>
      </div>

      {/* Bottom — fine print */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 px-10 py-6 flex items-center justify-between text-xs text-white/25">
        <span>© {new Date().getFullYear()} Ocean</span>
        <span className="hidden sm:inline">Made for writers</span>
      </footer>
    </div>
  );
}
