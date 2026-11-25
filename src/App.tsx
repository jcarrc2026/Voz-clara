import {useEffect, useMemo, useState} from 'react';
import {INITIAL_STUDY_ITEMS, STUDY_LESSONS, STUDY_MODULES} from './data/curriculum';
import {pickRandomQuickTip, type QuickTip} from './data/quickTips';
import {
  DAY_MS,
  buildSessionQueue,
  getNextUnfinishedLesson,
  isItemDue,
  updateDailyStreak,
  updateProgressAfterItem,
} from './engine/srs';
import {loadStudyState, resetStudyState, saveStudyState} from './storage/studyStore';
import type {
  ItemResult,
  PersistedStudyState,
  SessionMode,
  SessionQueueEntry,
  StudyItem,
  UserItemProgress,
  UserStats,
} from './types/study';
import {AppShell, type AppTab} from './components/AppShell';
import {HomeDashboardView} from './components/HomeDashboardView';
import {CoursesView} from './components/CoursesView';
import {GymnasiumView} from './components/GymnasiumView';
import {JournalHabitsView} from './components/JournalHabitsView';
import {LocalAiMentorView} from './components/LocalAiMentorView';
import {AnalyticsView} from './components/AnalyticsView';
import {StudySessionView} from './components/StudySessionView';
import {QuickTipsOverlay} from './components/QuickTipsOverlay';

interface ActiveSessionState {
  id: number;
  mode: SessionMode;
  lessonId: string | null;
  queue: SessionQueueEntry[];
}

export default function App() {
  const [studyState, setStudyState] = useState<PersistedStudyState>(() => loadStudyState());
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [activeSession, setActiveSession] = useState<ActiveSessionState | null>(null);
  const [quickTipOpen, setQuickTipOpen] = useState<boolean>(false);
  const [quickTip, setQuickTip] = useState<QuickTip | null>(null);
  const [quickTipContext, setQuickTipContext] = useState<string>('Consejo entre sesiones');
  const [mentorInitialTopic, setMentorInitialTopic] = useState<string>('');

  useEffect(() => {
    saveStudyState(studyState);
  }, [studyState]);

  const nowMs = Date.now() + studyState.dayOffset * DAY_MS;

  const allItems = useMemo(
    () => [...INITIAL_STUDY_ITEMS, ...studyState.customItems],
    [studyState.customItems]
  );

  const dueCount = useMemo(
    () => allItems.filter((item) => isItemDue(studyState.progressByItem[item.id], nowMs)).length,
    [allItems, studyState.progressByItem, nowMs]
  );

  const handleAddXp = (amount: number) => {
    setStudyState((curr) => {
      const updatedStats = updateDailyStreak(curr.stats, amount, nowMs);
      return {
        ...curr,
        stats: updatedStats,
      };
    });
  };

  const handleOpenQuickTip = (contextLabel: string) => {
    setQuickTip((prev) => pickRandomQuickTip(prev?.id));
    setQuickTipContext(contextLabel);
    setQuickTipOpen(true);
  };

  const handleStartSession = (mode: SessionMode, lessonId: string | null = null) => {
    const built = buildSessionQueue({
      mode,
      lessonId,
      items: allItems,
      modules: STUDY_MODULES,
      lessons: STUDY_LESSONS,
      progressByItem: studyState.progressByItem,
      nowMs,
      targetSize: 6,
    });

    if (built.entries.length === 0) return;

    setQuickTipOpen(false);
    setActiveSession({
      id: Date.now(),
      mode,
      lessonId: built.lessonId,
      queue: built.entries,
    });
  };

  const handleExitSession = (wasCompleted: boolean) => {
    setActiveSession(null);
    if (wasCompleted) {
      handleOpenQuickTip('Consejo entre sesiones');
    }
  };

  const handleRecordAttempt = (itemId: string, result: ItemResult): UserItemProgress => {
    const prev = studyState.progressByItem[itemId];
    const updated = updateProgressAfterItem(prev, itemId, result, nowMs);

    setStudyState((curr) => ({
      ...curr,
      progressByItem: {
        ...curr.progressByItem,
        [itemId]: updateProgressAfterItem(curr.progressByItem[itemId], itemId, result, nowMs),
      },
    }));

    return updated;
  };

  const handleCompleteSession = (summary: {
    mode: SessionMode;
    lessonId: string | null;
    itemsTotal: number;
    firstTryCorrect: number;
    recoveredCount: number;
    xpEarned: number;
    durationSeconds: number;
    startedAt: string;
  }): UserStats => {
    const updatedStats = updateDailyStreak(studyState.stats, summary.xpEarned, nowMs);
    const completedAt = new Date(nowMs).toISOString();

    setStudyState((curr) => ({
      ...curr,
      stats: updateDailyStreak(curr.stats, summary.xpEarned, nowMs),
      sessions: [
        {
          id: `ses_${Date.now()}`,
          mode: summary.mode,
          lessonId: summary.lessonId,
          itemsTotal: summary.itemsTotal,
          firstTryCorrect: summary.firstTryCorrect,
          recoveredCount: summary.recoveredCount,
          xpEarned: summary.xpEarned,
          durationSeconds: summary.durationSeconds,
          startedAt: summary.startedAt,
          completedAt,
        },
        ...curr.sessions,
      ].slice(0, 30),
    }));

    return updatedStats;
  };

  const handleToggleSound = () => {
    setStudyState((curr) => ({
      ...curr,
      stats: {
        ...curr.stats,
        soundEnabled: !curr.stats.soundEnabled,
      },
    }));
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <HomeDashboardView
            modules={STUDY_MODULES}
            lessons={STUDY_LESSONS}
            stats={studyState.stats}
            onStartSession={handleStartSession}
            onNavigateTab={setActiveTab}
          />
        );
      case 'courses':
        return (
          <CoursesView
            onStartSession={handleStartSession}
            onOpenMentorWithTopic={(topic) => {
              setMentorInitialTopic(topic);
              setActiveTab('mentor');
            }}
          />
        );
      case 'gym':
        return <GymnasiumView onAddXp={handleAddXp} />;
      case 'journal':
        return <JournalHabitsView onAddXp={handleAddXp} />;
      case 'mentor':
        return <LocalAiMentorView initialTopic={mentorInitialTopic} onAddXp={handleAddXp} />;
      case 'analytics':
        return (
          <AnalyticsView
            modules={STUDY_MODULES}
            lessons={STUDY_LESSONS}
            items={allItems}
            progressByItem={studyState.progressByItem}
            stats={studyState.stats}
            sessions={studyState.sessions}
            nowMs={nowMs}
            dayOffset={studyState.dayOffset}
            onStartSession={handleStartSession}
          />
        );
      default:
        return (
          <HomeDashboardView
            modules={STUDY_MODULES}
            lessons={STUDY_LESSONS}
            stats={studyState.stats}
            onStartSession={handleStartSession}
            onNavigateTab={setActiveTab}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {activeSession ? (
        <StudySessionView
          key={activeSession.id}
          initialQueue={activeSession.queue}
          mode={activeSession.mode}
          lessonId={activeSession.lessonId}
          modules={STUDY_MODULES}
          lessons={STUDY_LESSONS}
          progressByItem={studyState.progressByItem}
          stats={studyState.stats}
          soundEnabled={studyState.stats.soundEnabled}
          onToggleSound={handleToggleSound}
          onRecordAttempt={handleRecordAttempt}
          onCompleteSession={handleCompleteSession}
          onExit={handleExitSession}
        />
      ) : (
        <AppShell
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onStartPrimarySession={() => handleStartSession('mixed', null)}
          stats={studyState.stats}
          nowMs={nowMs}
        >
          {renderMainContent()}
        </AppShell>
      )}

      <QuickTipsOverlay
        isOpen={quickTipOpen}
        tip={quickTip}
        contextLabel={quickTipContext}
        onNextTip={() => setQuickTip((prev) => pickRandomQuickTip(prev?.id))}
        onStartNextSession={() => handleStartSession('mixed', null)}
        onClose={() => setQuickTipOpen(false)}
      />
    </div>
  );
}
