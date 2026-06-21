import { BookOpen, LayoutDashboard, History, TrendingUp, LogOut, X, CalendarDays, BarChart2, Download, CloudUpload, CheckCircle, GraduationCap, AlertTriangle, Crown } from 'lucide-react';
import { isAdmin } from '../lib/adminGuard';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { useLang } from '../lib/LanguageContext';
import { translateUI } from '../lib/translations';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: { name: string; email: string; avatar: string };
  onLogout: () => void;
  installPrompt?: any;
  onSyncNow?: () => Promise<void>;
  flagCount?: number;   // count of confusion-flagged questions
}

export function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, user, onLogout, installPrompt, onSyncNow, flagCount = 0 }: SidebarProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const { lang } = useLang();

  const getEloRank = (elo: number) => {
    if (lang === 'kn') {
      if (elo >= 1600) return 'ಇನ್ಸ್ಪೆಕ್ಟರ್ 🏆';
      if (elo >= 1200) return 'ಸಬ್-ಇನ್ಸ್ಪೆಕ್ಟರ್ 🏅';
      if (elo >= 1000) return 'ಹೆಡ್ ಕಾನ್‌ಸ್ಟೇಬಲ್ 👮';
      return 'ಕಾನ್‌ಸ್ಟೇಬಲ್ 👮';
    } else {
      if (elo >= 1600) return 'Inspector 🏆';
      if (elo >= 1200) return 'Sub-Inspector 🏅';
      if (elo >= 1000) return 'Head Constable 👮';
      return 'Constable 👮';
    }
  };

  const handleSyncNow = async () => {
    if (!onSyncNow || syncing) return;
    setSyncing(true);
    setSyncDone(false);
    await onSyncNow();
    setSyncing(false);
    setSyncDone(true);
    setTimeout(() => setSyncDone(false), 3000);
  };

  const handleInstall = () => {
    if (installPrompt) {
      installPrompt.prompt();
    } else {
      // iOS / already installed — show guidance
      alert('📲 To install on iPhone/iPad: tap the Share button → "Add to Home Screen"\n\nOn Android Chrome: tap menu (⋮) → "Add to Home Screen" or "Install App"');
    }
  };

  const navItems = [
    { id: 'dashboard',   label: translateUI('dashboard', lang),       icon: LayoutDashboard },
    { id: 'practice',   label: translateUI('subjectMasteryTab', lang),   icon: BookOpen },
    { id: 'papers',     label: translateUI('mockTests', lang),         icon: History },
    { id: 'analytics',  label: translateUI('analytics', lang),          icon: TrendingUp },
    { id: 'performance',label: translateUI('performance', lang),         icon: BarChart2 },
    { id: 'roadmap',    label: translateUI('studyRoadmap', lang),    icon: CalendarDays },
    { id: 'planner',    label: translateUI('examPlanner', lang),        icon: CalendarDays },
    { id: 'weakareas',  label: translateUI('weakAreas', lang),          icon: AlertTriangle, badge: flagCount },
    { id: 'expected',   label: translateUI('expectedPaper', lang),   icon: TrendingUp },
  ];

  const showAdmin = isAdmin(user?.email);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside className={cn(
        "h-screen w-64 fixed left-0 top-0 z-50 bg-surface-container flex flex-col py-6 pr-4 border-r border-white/5 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo Section with KSP Badge */}
        <div className="px-6 mb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary/15 rounded-xl border border-secondary/30 flex items-center justify-center text-secondary">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current animate-pulse">
                <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-black text-on-surface tracking-tight leading-none">KSP MASTER</h1>
              <p className="text-[10px] uppercase tracking-widest text-secondary font-black mt-1">ಪೊಲೀಸ್ ಸೂಪರ್ ಆಪ್</p>
            </div>
          </div>
          <button className="lg:hidden text-on-surface-variant hover:text-on-surface" onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* ELO Rank State Checker */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-6 py-3 rounded-xl ml-2 transition-all duration-200 font-bold text-sm hover:translate-x-1",
                  isActive
                    ? "bg-primary-container text-on-primary-container border-l-4 border-secondary shadow-lg"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                )}
              >
                <item.icon size={18} className={isActive ? "text-secondary" : "text-on-surface-variant"} />
                {item.label}
                {'badge' in item && (item as any).badge > 0 && (
                  <span className="ml-auto text-[10px] font-black bg-error text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {(item as any).badge > 99 ? '99+' : (item as any).badge}
                  </span>
                )}
              </button>
            );
          })}
          {/* ── Admin Link — only for anandakiccha240@gmail.com ── */}
          {showAdmin && (
            <button
              onClick={() => { setActiveTab('admin'); setIsOpen(false); }}
              className={cn(
                'w-full flex items-center gap-3 px-6 py-3 rounded-xl ml-2 transition-all duration-200 font-black text-sm mt-2 border',
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-amber-300 shadow-md animate-pulse'
                  : 'text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20'
              )}
            >
              <Crown size={18} />
              {translateUI('adminConsole', lang)}
            </button>
          )}
        </nav>

        {/* Bottom Profile & Utilities */}
        <div className="px-4 mt-auto">
          {/* User Profile Card */}
          <div className="bg-surface-container-low rounded-2xl p-4 mb-4 border border-surface-container-high">
            <div className="flex items-center gap-3">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-full border-2 border-secondary"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-on-surface truncate">{user.name}</p>
                <p className="text-[10px] text-secondary font-black uppercase tracking-wider leading-tight">
                  {(() => {
                    let elo = 1200;
                    try {
                      const prefix = user.email ? 'u_' + user.email.toLowerCase().replace(/[@.]/g, '_').replace(/[^a-z0-9_]/g, '').substring(0, 60) : 'u_guest';
                      const profile = JSON.parse(localStorage.getItem(`${prefix}__ksp_roadmap_v4`) || '{}');
                      elo = profile.xp ? Math.round(profile.xp / 10) + 1000 : 1200;
                    } catch {}
                    return getEloRank(elo);
                  })()}
                </p>
              </div>
            </div>
          </div>

          {/* ── Install App Button (always shown) ────────── */}
          <button
            onClick={handleInstall}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 mb-2 rounded-xl bg-gradient-to-r from-primary to-indigo-700 text-white text-sm font-bold transition-all hover:from-primary/90 hover:to-indigo-800 active:scale-95 shadow-lg border border-primary/20"
          >
            <Download size={16} />
            {translateUI('installApp', lang)}
          </button>

          {/* ── Sync Now Button ────────────────────────────── */}
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className={cn(
              "w-full flex items-center justify-center gap-3 px-4 py-2.5 mb-3 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg border",
              syncDone
                ? "bg-green-600 text-white border-green-500"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 hover:from-emerald-700 hover:to-teal-700"
            )}
          >
            {syncDone ? <CheckCircle size={16} /> : <CloudUpload size={16} className={syncing ? 'animate-pulse' : ''} />}
            {syncing ? translateUI('syncing', lang) : syncDone ? translateUI('syncDone', lang) : translateUI('syncNow', lang)}
          </button>
          <div className="space-y-1 mt-2">
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-3 px-6 py-2 text-on-surface-variant hover:text-error text-sm font-bold transition-colors"
            >
              <LogOut size={18} />
              {translateUI('signOut', lang)}
            </button>
          </div>
          </div>
      </aside>
    </>
  );
}
