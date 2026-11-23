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
import {LearningPathView} from './components/LearningPathView';
import {ReviewQueueView} from './components/ReviewQueueView';
import {PhrasebookView} from './components/PhrasebookView';
import {AnalyticsView} from './components/AnalyticsView';
import {ModelStudioView} from './components/ModelStudioView';
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

  const nextLesson = useMemo(
    () =>
      getNextUnfinishedLesson(
        STUDY_LESSONS,
        STUDY_MODULES,
        allItems,
        studyState.progressByItem
      ),
    [allItems, studyState.progressByItem]
  );

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

  const handleAddCustomItems = (newItems: StudyItem[]) => {
    setStudyState((curr) => ({
      ...curr,
      customItems: [...curr.customItems, ...newItems],
    }));
  };

  const handleSimulateNextDay = () => {
    setStudyState((curr) => ({
      ...curr,
      dayOffset: curr.dayOffset + 1,
    }));
  };

  const handleResetClockSimulation = () => {
    setStudyState((curr) => ({
      ...curr,
      dayOffset: 0,
    }));
  };

  const handleResetProgress = () => {
    setStudyState(resetStudyState());
  };

  const renderMainContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <main>
          <HomeDashboardView
            modules={STUDY_MODULES}
            lessons={STUDY_LESSONS}
            items={allItems}
            progressByItem={studyState.progressByItem}
            stats={studyState.stats}
            sessions={studyState.sessions}
            nextLesson={nextLesson}
            nowMs={nowMs}
            dayOffset={studyState.dayOffset}
            onStartSession={handleStartSession}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        </main>
      );
    }

    if (activeTab === 'path') {
      return (
        <LearningPathView
          modules={STUDY_MODULES}
          lessons={STUDY_LESSONS}
          items={allItems}
          progressByItem={studyState.progressByItem}
          stats={studyState.stats}
          sessions={studyState.sessions}
          nextLesson={nextLesson}
          nowMs={nowMs}
          dayOffset={studyState.dayOffset}
          onStartSession={handleStartSession}
          onOpenReview={() => setActiveTab('review')}
          onOpenQuickTip={() => handleOpenQuickTip('Consejo rápido')}
        />
      );
    }

    if (activeTab === 'review') {
      return (
        <ReviewQueueView
          items={allItems}
          lessons={STUDY_LESSONS}
          progressByItem={studyState.progressByItem}
          nowMs={nowMs}
          dayOffset={studyState.dayOffset}
          onSimulateNextDay={handleSimulateNextDay}
          onResetClockSimulation={handleResetClockSimulation}
          onStartSession={handleStartSession}
        />
      );
    }

    if (activeTab === 'phrases') {
      return (
        <PhrasebookView
          modules={STUDY_MODULES}
          lessons={STUDY_LESSONS}
          items={allItems}
          progressByItem={studyState.progressByItem}
        />
      );
    }

    if (activeTab === 'analytics') {
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
    }

    return (
      <ModelStudioView
        state={studyState}
        lessons={STUDY_LESSONS}
        onAddCustomItems={handleAddCustomItems}
        onImportState={(nextState) => setStudyState(nextState)}
        onResetProgress={handleResetProgress}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e]">
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
          onStartLesson={(lessonId) => handleStartSession('lesson', lessonId)}
          onOpenQuickTip={() => handleOpenQuickTip('Consejo rápido')}
          dueCount={dueCount}
          stats={studyState.stats}
          nowMs={nowMs}
          modules={STUDY_MODULES}
          lessons={STUDY_LESSONS}
          items={allItems}
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
