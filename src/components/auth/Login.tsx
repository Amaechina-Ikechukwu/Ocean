import React from 'react';
import { signInWithGoogle } from '../../lib/firebase';
import { Waves } from 'lucide-react';

export function Login() {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-ocean-bg font-sans">
      <div className="bg-ocean-surface p-12 rounded-2xl border border-ocean-border shadow-xl flex flex-col items-center text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-ocean-blue-dim/30 flex items-center justify-center text-ocean-blue mb-6">
          <Waves className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-serif text-ocean-text font-bold mb-2">Welcome to Ocean</h1>
        <p className="text-ocean-muted text-sm mb-8">Sign in to sync your workspace securely.</p>
        
        <button 
          onClick={signInWithGoogle}
          className="w-full py-2.5 px-4 bg-ocean-blue text-white rounded-lg font-medium hover:bg-ocean-blue/90 shadow-sm transition-colors text-sm"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
