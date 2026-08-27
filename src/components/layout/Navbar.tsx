import React from 'react';
import { Shield, Bell, LayoutDashboard, Database, Video, User } from 'lucide-react';
import { Screen } from '../../types';

interface NavbarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const bottomNavItems = [
  { id: 'dashboard', label: 'Saúde', icon: LayoutDashboard },
  { id: 'dvrs', label: 'DVRs', icon: Database },
  { id: 'cameras', label: 'Câmeras', icon: Video },
  { id: 'register-client', label: 'Perfil', icon: User },
];

export default function Navbar({ currentScreen, onNavigate }: NavbarProps) {
  return (
    <>
      {/* Header - Mobile */}
      <header className="md:hidden w-full sticky top-0 bg-surface-container-low z-40 border-b border-outline-variant/10">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <Shield className="text-primary w-5 h-5" />
            <h1 className="font-headline font-bold uppercase tracking-wider text-sm text-primary">
              TACTICAL SURVEILLANCE
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Bell className="w-5 h-5 text-on-surface-variant" />
            <div className="w-8 h-8 rounded-sm bg-surface-container-high overflow-hidden">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDY1HFThkdtkJ_pOnhY4t-FbAx00lcUnUIprE2BbAcHm9MG7dybKQZYDQX45OoKqotbWqj9nLnCBstgtesMWNcTc7mzY5gf-vWvY_QbW5nKkMjFG6rNy93-YN7-jlPJwzS5yJJFfrU5SXhInl44binL3Xk1Q4qHo-45_FTplAgHaD5ED9QwbBMwcqAC1HNtH7yekWEKik6zVfIXjFt4_gzYVcOwieb7TSzga-eYM2RKzC-1JqAMZ5SMdrU7ILrg9w6V2nP4EiU0ZIOZ" 
                alt="Profile" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-3 bg-surface border-t border-outline-variant/15 shadow-[0_-4px_12px_rgba(0,0,0,0.5)]">
        {bottomNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as Screen)}
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-sm transition-all active:scale-90 ${
              currentScreen === item.id
                ? 'text-primary font-bold bg-surface-container-high'
                : 'text-on-surface-variant'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] uppercase tracking-widest mt-1">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
