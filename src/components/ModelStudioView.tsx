import React, {useState} from 'react';
import {Check, Copy, Download, Plus, RotateCcw, Sparkles, Upload} from 'lucide-react';
import {POSTGRES_SCHEMA_SQL} from '../data/curriculum';
import type {PersistedStudyState, StudyItem, StudyLesson} from '../types/study';

interface ModelStudioViewProps {
  state: PersistedStudyState;
  lessons: StudyLesson[];
  onAddCustomItems: (items: StudyItem[]) => void;
  onImportState: (nextState: PersistedStudyState) => void;
  onResetProgress: () => void;
}

interface GeneratedDraft {
  prompt: string;
  difficulty: number;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const ModelStudioView: React.FC<ModelStudioViewProps> = ({
  state,
  lessons,
  onAddCustomItems,
  onImportState,
  onResetProgress,
}) => {
  const [subTab, setSubTab] = useState<'generator' | 'json' | 'sql'>('generator');
  const [notes, setNotes] = useState<string>('');
  const [targetLessonId, setTargetLessonId] = useState<string>(lessons[0]?.id ?? '');
  const [generating, setGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<GeneratedDraft[]>([]);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenError(null);
    setSavedNotice(null);
    setGenerating(true);

    const chosenLesson = lessons.find((l) => l.id === targetLessonId);
    try {
      const res = await fetch('/api/items/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          notes,
          category: chosenLesson?.title ?? 'Elocuencia, oratoria y comunicación empresarial',
          count: 3,
        }),
      });
      const data = (await res.json()) as {items?: GeneratedDraft[]; error?: string};
      if (!res.ok) {
        setGenError(data.error ?? 'Error al generar ejercicios.');
      } else {
        setDrafts(data.items ?? []);
      }
    } catch {
      setGenError('No se pudo conectar con el servidor para generar ejercicios.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDrafts = () => {
    if (drafts.length === 0 || !targetLessonId) return;
    const baseTs = Date.now();
    const newItems: StudyItem[] = drafts.map((d, idx) => {
      const safeOptions = (d.options.length >= 2 ? d.options : ['Opción A', 'Opción B']).slice(0, 4);
      const optionIds = ['a', 'b', 'c', 'd'];
      const correctIdx = Math.min(safeOptions.length - 1, Math.max(0, d.correctIndex));
      const dif = Math.min(5, Math.max(1, Math.round(d.difficulty || 2))) as 1 | 2 | 3 | 4 | 5;

      return {
        id: `itm_custom_${baseTs}_${idx}`,
        lessonId: targetLessonId,
        itemType: 'multiple_choice',
        difficulty: dif,
        prompt: d.prompt,
        payload: {
          options: safeOptions.map((text, oIdx) => ({
            id: optionIds[oIdx],
            text,
          })),
          correctOptionId: optionIds[correctIdx],
          spokenPhrase: safeOptions[correctIdx],
        },
        explanation: d.explanation,
        spokenTakeaway: safeOptions[correctIdx],
        orderIndex: 100 + idx,
        isCustom: true,
      };
    });

    onAddCustomItems(newItems);
    setDrafts([]);
    setNotes('');
    setSavedNotice(`Se agregaron ${newItems.length} escenarios nuevos a tu ruta de práctica.`);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vozclara-backup-${state.stats.todayDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as PersistedStudyState;
        if (!parsed || typeof parsed !== 'object' || !parsed.stats || !parsed.progressByItem) {
          setImportError('El archivo JSON no coincide con el esquema de VozClara.');
          return;
        }
        onImportState(parsed);
      } catch {
        setImportError('No se pudo leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(POSTGRES_SCHEMA_SQL);
      setCopiedSql(true);
      window.setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Ignorar si clipboard no está disponible
    }
  };

  return (
    <main className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Laboratorio personal · Escenarios a medida, respaldo JSON y SQL
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
            Estudio de Escenarios y Datos
          </h1>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              {id: 'generator', label: 'Crear escenarios (IA)'},
              {id: 'json', label: 'Respaldo JSON'},
              {id: 'sql', label: 'Esquema PostgreSQL'},
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                subTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'generator' && (
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-600" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-900">
                Crear prácticas desde tus situaciones reales
              </h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Describe una reunión próxima, una entrevista, una presentación difícil o una conversación con clientes. La IA creará borradores para que los valides y sumes a tu ruta.
            </p>

            <form onSubmit={handleGenerate} className="mt-5 space-y-4">
              <div>
                <label htmlFor="lesson-select" className="block text-xs font-medium text-slate-700">
                  Lección de destino
                </label>
                <select
                  id="lesson-select"
                  value={targetLessonId}
                  onChange={(e) => setTargetLessonId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                >
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="notes-input" className="block text-xs font-medium text-slate-700">
                  Contexto o situación que quieres entrenar
                </label>
                <textarea
                  id="notes-input"
                  rows={6}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ejemplo: Tengo que presentar resultados trimestrales ante directivos muy exigentes que suelen interrumpir preguntando por retorno de inversión y plazos..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
                />
              </div>

              {genError && <p className="text-xs text-red-700">{genError}</p>}
              {savedNotice && <p className="text-xs font-medium text-emerald-700">{savedNotice}</p>}

              <button
                type="submit"
                disabled={generating || notes.trim().length < 20}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {generating ? 'Creando ejercicios...' : 'Generar 3 escenarios'}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold text-slate-900">Vista previa de borradores</h2>
              {drafts.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveDrafts}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Guardar en mi ruta ({drafts.length})
                </button>
              )}
            </div>

            {drafts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Aquí aparecerán los escenarios generados para que elijas si deseas incorporarlos a tu entrenamiento diario.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {drafts.map((draft, i) => (
                  <li key={i} className="py-4 first:pt-2">
                    <p className="text-xs text-slate-500">
                      Borrador {i + 1} · Dificultad {draft.difficulty}/5
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{draft.prompt}</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                      {draft.options.map((opt, oIdx) => (
                        <li
                          key={oIdx}
                          className={
                            oIdx === draft.correctIndex ? 'font-semibold text-emerald-700' : ''
                          }
                        >
                          {oIdx === draft.correctIndex ? '✓ ' : '· '}
                          {opt}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-slate-500">{draft.explanation}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {subTab === 'json' && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Estado vivo en JSON (localStorage)
              </h2>
              <p className="text-xs text-slate-500">
                Exporta o restaura tu progreso de oratoria, racha, XP y escenarios personalizados.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Exportar JSON
              </button>

              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                Importar JSON
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reiniciar progreso
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetProgress();
                      setConfirmReset(false);
                    }}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Confirmar reinicio
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          {importError && <p className="text-xs text-red-700">{importError}</p>}

          <pre className="max-h-[460px] overflow-auto rounded-lg border border-slate-200 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
            <code>{JSON.stringify(state, null, 2)}</code>
          </pre>
        </section>
      )}

      {subTab === 'sql' && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Equivalencia relacional para PostgreSQL / Supabase
              </h2>
              <p className="text-xs text-slate-500">
                Esquema listo para migrar tu progreso personal a base de datos relacional.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {copiedSql ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copiar SQL
                </>
              )}
            </button>
          </div>

          <pre className="max-h-[500px] overflow-auto rounded-lg border border-slate-200 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
            <code>{POSTGRES_SCHEMA_SQL}</code>
          </pre>
        </section>
      )}
    </main>
  );
};
