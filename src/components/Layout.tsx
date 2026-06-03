import React from 'react';
import { Screen } from '../types';
import Sidebar from './layout/Sidebar';
import Navbar from './layout/Navbar';

interface LayoutProps {
  children: React.ReactNode;
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function Layout({ children, currentScreen, onNavigate }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Sidebar - Desktop */}
      <Sidebar currentScreen={currentScreen} onNavigate={onNavigate} />

      {/* Navbar & Mobile Header */}
      <Navbar currentScreen={currentScreen} onNavigate={onNavigate} />

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen relative pb-20 md:pb-0">
        <div className="absolute inset-0 technical-grid pointer-events-none"></div>
        <div className="relative z-10 h-full">
          {children}
        </div>
      </main>
    </div>
  );
}

