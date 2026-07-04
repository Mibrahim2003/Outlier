import React, { useState } from 'react';
import { Button, cardVariants } from './ui';

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  BookOpen, 
  BarChart3, 
  Settings, 
  PlusCircle,
  LogOut,
  Menu,
  X,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary } from 'react-error-boundary';
import { LayoutErrorFallback } from './ErrorBoundary';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';
import { useProfile } from '../domain/profile/useProfile';

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  key?: string | number;
}

const SidebarItem = ({ to, icon: Icon, label, active }: SidebarItemProps) => (
  <Link 
    to={to}
    className={`flex items-center gap-4 p-4 transition-all active:scale-95 duration-75 ${
      active 
        ? `${cardVariants({ shadow: 'sm' })} bg-primary-container text-ink font-bold !border-b-4` 
        : 'text-ink border-transparent border-b-4 hover:bg-secondary hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="uppercase tracking-widest text-xs font-bold">{label}</span>
  </Link>
);

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile } = useProfile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const initials = (userProfile?.name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('') || '?';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/courses', icon: BookOpen, label: 'Courses' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <nav className={`fixed top-0 w-full z-50 bg-background flex items-center justify-between px-6 h-20 ${cardVariants({ shadow: 'sm' })} !border-b-4 !border-t-0 !border-x-0 !rounded-none`}>
        <div className="flex items-center gap-8">
          <button 
            className="md:hidden p-2 border-2 border-ink neo-brutal-shadow bg-white"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <Link to="/" className="text-2xl font-black uppercase tracking-tighter text-ink">
            Outlier
          </Link>
          <GlobalSearch />
        </div>
        <div className="flex items-center gap-6">
          <NotificationBell />
          <Link
            to="/settings"
            aria-label="Account settings"
            className="hidden sm:flex items-center gap-3 group cursor-pointer"
          >
            <div className={`w-10 h-10 bg-primary-container flex items-center justify-center font-black text-sm tracking-tighter ${cardVariants({ shadow: 'sm' })}`}>
              {initials}
            </div>
          </Link>
        </div>
      </nav>

      <div className="flex flex-1 pt-20">
        {/* Sidebar */}
        <aside className={`
          fixed md:sticky top-20 h-[calc(100vh-80px)] w-64 border-r-4 border-ink bg-background overflow-y-auto shrink-0 z-40 transition-transform duration-300
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-6 border-b-4 border-ink">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary border-2 border-ink"></div>
              <div>
                <p className="text-xl font-black text-ink leading-none">Outlier</p>
                <p className="uppercase tracking-widest text-[10px] font-bold opacity-60">Academic Engine</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-4 py-8 space-y-2">
            {navItems.map((item) => (
              <SidebarItem 
                key={item.to} 
                to={item.to}
                icon={item.icon}
                label={item.label}
                active={location.pathname === item.to} 
              />
            ))}
          </nav>
          <div className="p-4 border-t-4 border-ink mt-auto space-y-2">
            <Button
              variant="tertiary" size="default"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => navigate('/courses?action=add')}
            >
              <PlusCircle size={18} />
              <span>Add Course</span>
            </Button>
            <div className="pt-4 flex flex-col gap-1">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 p-2 text-xs font-bold uppercase tracking-widest hover:text-error transition-colors text-left"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background p-6 md:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              <ErrorBoundary FallbackComponent={LayoutErrorFallback} resetKeys={[location.pathname]}>
                {children}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

    </div>
  );
};
