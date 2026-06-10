import React, { useState } from 'react';
import { SyncToast } from './SyncToast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  BookOpen, 
  Library, 
  BarChart3, 
  Settings, 
  PlusCircle, 
  HelpCircle, 
  LogOut,
  Search,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
    className={`flex items-center gap-4 p-4 border-b-4 transition-all active:scale-95 duration-75 ${
      active 
        ? 'bg-primary-container text-ink font-bold border-ink shadow-[2px_2px_0px_#1A1A1A]' 
        : 'text-ink border-transparent hover:bg-secondary hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="uppercase tracking-widest text-xs font-bold">{label}</span>
  </Link>
);

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/courses', icon: BookOpen, label: 'Courses' },
    { to: '/library', icon: Library, label: 'Library' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b-4 border-ink bg-background shadow-[3px_3px_0px_#1A1A1A] flex items-center justify-between px-6 h-20">
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
          <div className="hidden md:flex items-center bg-white border-3 border-ink px-4 py-2 w-96 shadow-[2px_2px_0px_#1A1A1A]">
            <Search size={18} className="mr-2 text-ink" />
            <input 
              className="bg-transparent border-none focus:ring-0 w-full font-medium text-sm outline-none" 
              placeholder="Search knowledge base..." 
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group cursor-pointer hover:bg-primary-container p-2 transition-all active:translate-x-[2px] active:translate-y-[2px] border-2 border-transparent hover:border-ink">
            <Bell size={24} />
            <span className="absolute top-1 right-1 w-3 h-3 bg-secondary border-2 border-ink"></span>
          </div>
          <div className="hidden sm:flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 border-3 border-ink shadow-[2px_2px_0px_#1A1A1A] overflow-hidden bg-white">
              <img 
                alt="User avatar" 
                className="w-full h-full object-cover" 
                src="https://picsum.photos/seed/user/100/100"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
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
            <Link 
              to="/onboarding"
              className="w-full bg-tertiary text-white py-3 font-bold border-3 border-ink shadow-[3px_3px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle size={18} />
              <span>New Project</span>
            </Link>
            <div className="pt-4 flex flex-col gap-1">
              <button className="flex items-center gap-3 p-2 text-xs font-bold uppercase tracking-widest hover:text-secondary transition-colors text-left">
                <HelpCircle size={14} /> Help
              </button>
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
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <SyncToast />
    </div>
  );
};
