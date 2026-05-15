import { motion } from 'motion/react';
import { useThemeStore } from '../../lib/store';
import { LogOut, MonitorSmartphone } from 'lucide-react';

export function Settings() {
  const { theme, setTheme } = useThemeStore();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 90, damping: 20 }}
      className="flex-1 overflow-y-auto bg-ocean-bg p-8"
    >
      <div className="max-w-2xl mx-auto py-16">
        <h1 className="text-4xl font-serif text-ocean-text mb-8">Settings</h1>

        <div className="bg-ocean-surface border border-ocean-border rounded-2xl overflow-hidden mb-8">
          <div className="p-6 border-b border-ocean-border flex items-center justify-between">
            <div>
              <h2 className="font-medium text-ocean-text">Appearance</h2>
              <p className="text-sm text-ocean-muted mt-1">Select your preferred theme.</p>
            </div>
            <div className="flex bg-ocean-bg p-1 rounded-lg border border-ocean-border-soft">
              <button
                onClick={() => setTheme('light')}
                className={`px-4 py-1.5 rounded-md text-sm transition-colors ${theme === 'light' ? 'bg-ocean-surface border border-ocean-border text-ocean-text shadow-sm' : 'text-ocean-muted hover:text-ocean-text'}`}
              >
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-4 py-1.5 rounded-md text-sm transition-colors ${theme === 'dark' ? 'bg-ocean-surface border border-ocean-border text-ocean-text shadow-sm' : 'text-ocean-muted hover:text-ocean-text'}`}
              >
                Dark
              </button>
            </div>
          </div>

          <div className="p-6 flex items-center justify-between">
             <div>
              <h2 className="font-medium text-ocean-text">Devices</h2>
              <p className="text-sm text-ocean-muted mt-1">Manage logged-in devices.</p>
             </div>
             <MonitorSmartphone className="w-5 h-5 text-ocean-muted" />
          </div>
        </div>

        <button className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors px-4 py-2 rounded-lg hover:bg-red-500/10">
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </motion.div>
  );
}
