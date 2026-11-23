import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  BookOpen,
  Flame,
  Home,
  Lightbulb,
  Menu,
  Mic,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import type {StudyItem, StudyLesson, StudyModule, UserStats} from '../types/study';
import {getLocalDateString} from '../engine/srs';

export type AppTab = 'dashboard' | 'path' | 'review' | 'phrases' | 'analytics' | 'model';

interface AppShellProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onStartPrimarySession: () => void;
  onStartLesson: (lessonId: string) => void;
  onOpenQuickTip: () => void;
  dueCount: number;
  stats: UserStats;
  nowMs: number;
  modules: StudyModule[];
  lessons: StudyLesson[];
  items: StudyItem[];
  children: React.ReactNode;
}

interface SearchHit {
  id: string;
  lessonId: string;
  title: string;
  subtitle: string;
  kind: 'Lección' | 'Ejercicio';
}

const NAV_ITEMS: Array<{
  id: AppTab;
  label: string;
  icon: React.ComponentType<{className?: string}>;
}> = [
  {id: 'dashboard', label: 'Inicio', icon: Home},
  {id: 'path', label: 'Ruta y Módulos', icon: Mic},
  {id: 'review', label: 'Repaso SRS', icon: RotateCcw},
  {id: 'phrases', label: 'Frasario', icon: BookOpen},
  {id: 'analytics', label: 'Progreso', icon: TrendingUp},
  {id: 'model', label: 'Estudio IA y Datos', icon: Sparkles},
];

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onSelectTab,
  onStartPrimarySession,
  onStartLesson,
  onOpenQuickTip,
  dueCount,
  stats,
  nowMs,
  modules,
  lessons,
  items,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement | null>(null);

  const todayStr = getLocalDateString(nowMs, stats.timezone);
  const todayXp = stats.todayDate === todayStr ? stats.todayXp : 0;
  const dailyPct = Math.min(100, Math.round((todayXp / Math.max(1, stats.dailyXpGoal)) * 100));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inDesktopSearch = searchContainerRef.current?.contains(target);
      const inMobileSearch = mobileSearchContainerRef.current?.contains(target);
      if (!inDesktopSearch && !inMobileSearch) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo<SearchHit[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];

    const moduleMap = new Map(modules.map((m) => [m.id, m]));
    const lessonMap = new Map(lessons.map((l) => [l.id, l]));
    const hits: SearchHit[] = [];

    for (const lesson of lessons) {
      const mod = moduleMap.get(lesson.moduleId);
      const haystack = `${lesson.title} ${lesson.summary} ${mod?.title ?? ''} ${mod?.category ?? ''}`.toLowerCase();
      if (haystack.includes(q)) {
        hits.push({
          id: `les_${lesson.id}`,
          lessonId: lesson.id,
          title: lesson.title,
          subtitle: `${mod ? `Unidad ${String(mod.orderIndex).padStart(2, '0')}` : 'Lección'} · ~${lesson.estimatedMinutes} min`,
          kind: 'Lección',
        });
      }
    }

    for (const item of items) {
      if (hits.length >= 8) break;
      const lesson = lessonMap.get(item.lessonId);
      const haystack = `${item.prompt} ${item.spokenTakeaway ?? ''} ${item.explanation}`.toLowerCase();
      if (haystack.includes(q)) {
        hits.push({
          id: `itm_${item.id}`,
          lessonId: item.lessonId,
          title: item.prompt,
          subtitle: lesson?.title ?? 'Ejercicio práctico',
          kind: 'Ejercicio',
        });
      }
    }

    return hits.slice(0, 7);
  }, [searchQuery, modules, lessons, items]);

  const handleSelectNav = (tab: AppTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#f2f4f6] px-4 py-6">
      <div>
        <button
          type="button"
          onClick={() => handleSelectNav('dashboard')}
          className="mb-8 flex w-full items-center gap-3 px-2 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4f46e5] text-white shadow-xs">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <rect x="4" y="9" width="2.5" height="6" rx="1.25" fill="currentColor" opacity="0.75" />
              <rect x="8.5" y="5" width="2.5" height="14" rx="1.25" fill="currentColor" />
              <rect x="13" y="7" width="2.5" height="10" rx="1.25" fill="currentColor" />
              <rect x="17.5" y="10" width="2.5" height="4" rx="1.25" fill="currentColor" opacity="0.75" />
            </svg>
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-[#3525cd] whitespace-nowrap">
            Voz Clara
          </span>
        </button>

        <nav aria-label="Navegación principal" className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-sm transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                  isActive
                    ? 'bg-[#4f46e5] font-semibold text-white shadow-xs'
                    : 'font-medium text-[#464555] hover:bg-[#e6e8ea] hover:text-[#191c1e]'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'review' && dueCount > 0 && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      isActive ? 'text-indigo-100' : 'text-amber-700 font-semibold'
                    }`}
                  >
                    {dueCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[#464555]">Meta diaria</span>
          <span className="font-mono font-semibold text-[#191c1e] tabular-nums">
            {todayXp}/{stats.dailyXpGoal} XP
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e6e8ea]">
          <div
            className="h-full rounded-full bg-[#4f46e5] transition-all duration-300"
            style={{width: `${dailyPct}%`}}
          />
        </div>
        <p className="mt-2 text-xs text-[#464555] tabular-nums">
          {modules.length} unidades · {lessons.length} lecciones
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200/70 lg:block">
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
              className="absolute right-3 top-5 rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-[#f7f9fb]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-14 sm:h-16 max-w-[1280px] items-center justify-between gap-2 sm:gap-4 px-3 sm:px-8">
            <div className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Abrir navegación"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#464555] hover:bg-[#e6e8ea] lg:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>

              {/* Botón de búsqueda compacto en móvil (< sm) */}
              <button
                type="button"
                onClick={() => {
                  setMobileSearchOpen((prev) => !prev);
                  setSearchFocused(true);
                }}
                aria-label={mobileSearchOpen ? 'Cerrar buscador' : 'Buscar ejercicios o lecciones'}
                aria-expanded={mobileSearchOpen}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors sm:hidden ${
                  mobileSearchOpen
                    ? 'border-[#4f46e5] bg-[#e2dfff] text-[#3525cd]'
                    : 'border-slate-200/80 bg-white text-[#464555] hover:bg-[#e6e8ea]'
                }`}
              >
                {mobileSearchOpen ? (
                  <X className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Search className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              {/* Buscador inline en tablet/escritorio (sm+) */}
              <div ref={searchContainerRef} className="relative hidden flex-1 min-w-0 max-w-md sm:block">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#464555]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchFocused(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchFocused(false);
                      setSearchQuery('');
                    }
                  }}
                  placeholder="Buscar ejercicios o lecciones..."
                  aria-label="Buscar ejercicios o lecciones"
                  className="w-full min-w-0 rounded-lg border border-slate-200/80 bg-white py-2 pl-9 pr-3 text-sm text-[#191c1e] placeholder:text-[#777587] focus:border-[#4f46e5] focus:outline-none"
                />

                {searchFocused && searchQuery.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    {searchResults.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-[#464555]">
                        No se encontraron lecciones o ejercicios para “{searchQuery}”.
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                        {searchResults.map((hit) => (
                          <li key={hit.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchFocused(false);
                                setSearchQuery('');
                                onStartLesson(hit.lessonId);
                              }}
                              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f2f4f6]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[#191c1e]">
                                  {hit.title}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-[#464555]">
                                  {hit.subtitle}
                                </p>
                              </div>
                              <span className="shrink-0 text-xs font-medium text-[#4f46e5]">
                                {hit.kind}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onSelectTab('analytics')}
                title="Ver historial de racha y analítica"
                className="inline-flex items-center gap-1 rounded-lg bg-[#ffdbca] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#341100] tabular-nums transition-colors hover:bg-[#ffcbb2] whitespace-nowrap shrink-0"
              >
                <Flame className="h-3.5 w-3.5 text-[#9d4300]" aria-hidden="true" />
                <span>{stats.currentStreak}</span>
                <span className="sm:hidden">d</span>
                <span className="hidden sm:inline">días</span>
              </button>

              <button
                type="button"
                onClick={onOpenQuickTip}
                aria-label="Abrir consejo rápido de oratoria"
                title="Consejo rápido de oratoria"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-[#464555] transition-colors hover:bg-[#e6e8ea] hover:text-[#191c1e] shrink-0"
              >
                <Lightbulb className="h-4 w-4 text-amber-600" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onStartPrimarySession}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f46e5] px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-[#3525cd] whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Practicar
              </button>
            </div>
          </div>

          {/* Barra de búsqueda expandida en móvil */}
          {mobileSearchOpen && (
            <div
              ref={mobileSearchContainerRef}
              className="border-t border-slate-200/70 bg-white px-3 py-2.5 sm:hidden"
            >
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#464555]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  autoFocus
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchFocused(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setMobileSearchOpen(false);
                      setSearchFocused(false);
                      setSearchQuery('');
                    }
                  }}
                  placeholder="Buscar ejercicios o lecciones..."
                  aria-label="Buscar ejercicios o lecciones en móvil"
                  className="w-full rounded-lg border border-slate-200 bg-[#f7f9fb] py-2 pl-9 pr-3 text-sm text-[#191c1e] placeholder:text-[#777587] focus:border-[#4f46e5] focus:bg-white focus:outline-none"
                />

                {searchFocused && searchQuery.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    {searchResults.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-[#464555]">
                        No se encontraron resultados para “{searchQuery}”.
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                        {searchResults.map((hit) => (
                          <li key={hit.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setMobileSearchOpen(false);
                                setSearchFocused(false);
                                setSearchQuery('');
                                onStartLesson(hit.lessonId);
                              }}
                              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f2f4f6]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[#191c1e]">
                                  {hit.title}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-[#464555]">
                                  {hit.subtitle}
                                </p>
                              </div>
                              <span className="shrink-0 text-xs font-medium text-[#4f46e5]">
                                {hit.kind}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </div>
      </div>
    </div>
  );
};
