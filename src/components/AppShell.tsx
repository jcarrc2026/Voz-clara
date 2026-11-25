import React, {useState} from 'react';
import {
  BookOpen,
  Bot,
  Flame,
  Home,
  Menu,
  Mic,
  Play,
  ShieldCheck,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';
import type {UserStats} from '../types/study';
import {getLocalDateString} from '../engine/srs';

export type AppTab = 'dashboard' | 'courses' | 'gym' | 'journal' | 'mentor' | 'analytics';

interface AppShellProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onStartPrimarySession: () => void;
  stats: UserStats;
  nowMs: number;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  id: AppTab;
  label: string;
  icon: React.ComponentType<{className?: string}>;
}> = [
  {id: 'dashboard', label: 'Inicio', icon: Home},
  {id: 'courses', label: 'Cursos y Rutas', icon: BookOpen},
  {id: 'gym', label: 'Gimnasio de Voz', icon: Target},
  {id: 'journal', label: 'Bitácora y Hábitos', icon: ShieldCheck},
  {id: 'mentor', label: 'Mentor IA', icon: Bot},
  {id: 'analytics', label: 'Progreso y XP', icon: TrendingUp},
];

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onSelectTab,
  onStartPrimarySession,
  stats,
  nowMs,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const todayStr = getLocalDateString(nowMs, stats.timezone);
  const todayXp = stats.todayDate === todayStr ? stats.todayXp : 0;
  const dailyPct = Math.min(100, Math.round((todayXp / Math.max(1, stats.dailyXpGoal)) * 100));

  const handleSelectNav = (tab: AppTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#F8FAFC] px-4 py-6 border-r border-slate-200/80">
      <div>
        <button
          type="button"
          onClick={() => handleSelectNav('dashboard')}
          className="mb-8 flex w-full items-center gap-3 px-2 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F172A] cursor-pointer"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F172A] text-white shadow-xs">
            <Mic className="h-5 w-5 text-[#B45309]" aria-hidden="true" />
          </div>
          <div className="overflow-hidden">
            <span className="font-display text-sm font-bold tracking-tight text-[#0F172A] block leading-tight truncate">
              El camino de la voz
            </span>
            <span className="text-[10px] font-semibold text-[#B45309] uppercase tracking-wider">
              Academia & Mentoría
            </span>
          </div>
        </button>

        <nav aria-label="Navegación principal" className="flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-[#0F172A]'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#B45309]' : 'text-slate-500'}`} aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Meta Diaria</span>
          <span className="font-mono tabular-nums text-[#0F172A]">
            {todayXp}/{stats.dailyXpGoal} XP
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#B45309] transition-all duration-300"
            style={{width: `${dailyPct}%`}}
          />
        </div>
        <p className="text-[11px] text-slate-500 tabular-nums">
          Racha: {stats.currentStreak} día(s) consecutivos
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        {sidebarContent}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú lateral"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          <aside className="relative z-10 h-full w-72 max-w-[85vw] shadow-xl">
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-3 top-5 rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 cursor-pointer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#F8FAFC]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-2 px-3 sm:px-8">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Abrir navegación"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-200/75 lg:hidden cursor-pointer"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="font-display text-sm sm:text-base font-bold text-[#0F172A] truncate sm:hidden">
                El camino de la voz
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onSelectTab('analytics')}
                className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-2.5 sm:px-3.5 py-2 text-xs font-semibold text-amber-900 tabular-nums border border-amber-200 transition-colors hover:bg-amber-100 cursor-pointer"
              >
                <Flame className="h-3.5 w-3.5 text-[#B45309]" aria-hidden="true" />
                <span>{stats.currentStreak}d</span>
              </button>

              <button
                type="button"
                onClick={onStartPrimarySession}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#1E293B] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 text-[#B45309]" aria-hidden="true" />
                <span>Practicar</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
};
