import React, {useState} from 'react';
import {CheckCircle2, Flame, Plus, RefreshCw, Save, ShieldCheck, Sparkles, Trophy} from 'lucide-react';

interface JournalHabitsViewProps {
  onAddXp: (amount: number) => void;
}

interface Commitment {
  id: string;
  text: string;
  done: boolean;
}

interface PracticeLogEntry {
  id: string;
  date: string;
  situation: string;
  wentWell: string;
  toImprove: string;
}

interface ReframeEntry {
  id: string;
  limitingThought: string;
  empoweringStatement: string;
}

export const JournalHabitsView: React.FC<JournalHabitsViewProps> = ({onAddXp}) => {
  const [commitments, setCommitments] = useState<Commitment[]>([
    {id: 'c1', text: 'Practicar 5 minutos de respiración y vocalización', done: true},
    {id: 'c2', text: 'Hacer una llamada o propuesta con postura de certeza', done: false},
    {id: 'c3', text: 'Auditar 3 pensamientos limitantes y reencuadrarlos', done: false},
  ]);
  const [newCommitmentText, setNewCommitmentText] = useState('');

  const [logs, setLogs] = useState<PracticeLogEntry[]>([
    {
      id: 'l1',
      date: new Date().toLocaleDateString('es-ES', {day: 'numeric', month: 'short'}),
      situation: 'Reunión de avance con cliente clave',
      wentWell: 'Apliqué la regla BLUF en el primer minuto y mantuve contacto visual.',
      toImprove: 'Aceleré el ritmo cuando preguntaron por plazos; debo usar más silencios.',
    },
  ]);
  const [situationInput, setSituationInput] = useState('');
  const [wentWellInput, setWentWellInput] = useState('');
  const [toImproveInput, setToImproveInput] = useState('');

  const [reframes, setReframes] = useState<ReframeEntry[]>([
    {
      id: 'r1',
      limitingThought: 'Seguro van a pensar que mi precio es demasiado alto y me van a rechazar.',
      empoweringStatement: 'Mi precio refleja exactamente el valor y el retorno de la solución que entrego; quien busca calidad invierte con certeza.',
    },
  ]);
  const [limitingInput, setLimitingInput] = useState('');
  const [empoweringInput, setEmpoweringInput] = useState('');

  const toggleCommitment = (id: string) => {
    setCommitments((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextDone = !c.done;
          if (nextDone) onAddXp(10);
          return {...c, done: nextDone};
        }
        return c;
      })
    );
  };

  const handleAddCommitment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommitmentText.trim()) return;
    setCommitments((prev) => [
      ...prev,
      {id: `comm_${Date.now()}`, text: newCommitmentText.trim(), done: false},
    ]);
    setNewCommitmentText('');
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!situationInput.trim() || !wentWellInput.trim()) return;
    setLogs((prev) => [
      {
        id: `log_${Date.now()}`,
        date: new Date().toLocaleDateString('es-ES', {day: 'numeric', month: 'short'}),
        situation: situationInput.trim(),
        wentWell: wentWellInput.trim(),
        toImprove: toImproveInput.trim() || 'Ninguna observación crítica.',
      },
      ...prev,
    ]);
    setSituationInput('');
    setWentWellInput('');
    setToImproveInput('');
    onAddXp(20);
  };

  const handleAddReframe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!limitingInput.trim() || !empoweringInput.trim()) return;
    setReframes((prev) => [
      {
        id: `ref_${Date.now()}`,
        limitingThought: limitingInput.trim(),
        empoweringStatement: empoweringInput.trim(),
      },
      ...prev,
    ]);
    setLimitingInput('');
    setEmpoweringInput('');
    onAddXp(15);
  };

  const completedCount = commitments.filter((c) => c.done).length;

  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#B45309]">
            Mi Guardia Diaria y Bitácora
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#0F172A]">
            Hábitos no negociables y reencuadre mental
          </h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 border border-amber-200 text-amber-900 text-xs font-semibold tabular-nums">
          <ShieldCheck className="h-4 w-4 text-[#B45309]" aria-hidden="true" />
          <span>{completedCount} / {commitments.length} compromisos cumplidos hoy</span>
        </div>
      </div>

      {/* 1. Guardia Diaria (No negociables) */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0F172A]">
              Guardia Diaria (Compromisos no negociables)
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              La confianza personal se construye cumpliendo acuerdos cotidianos contigo mismo.
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
            +{completedCount * 10} XP ganados hoy
          </span>
        </div>

        <div className="space-y-3">
          {commitments.map((comm) => (
            <button
              key={comm.id}
              type="button"
              onClick={() => toggleCommitment(comm.id)}
              className={`flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                comm.done
                  ? 'border-emerald-200 bg-emerald-50/40 text-emerald-900'
                  : 'border-slate-200 bg-[#F8FAFC] text-[#0F172A] hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    comm.done
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 bg-white text-transparent'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className={`text-sm font-medium truncate ${comm.done ? 'line-through text-slate-600' : ''}`}>
                  {comm.text}
                </span>
              </div>
              <span className={`text-xs font-semibold shrink-0 ${comm.done ? 'text-emerald-700' : 'text-slate-400'}`}>
                {comm.done ? 'Completado' : 'Pendiente'}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={handleAddCommitment} className="flex gap-3 pt-2">
          <input
            type="text"
            value={newCommitmentText}
            onChange={(e) => setNewCommitmentText(e.target.value)}
            placeholder="Añadir nuevo compromiso diario..."
            aria-label="Añadir nuevo compromiso diario"
            className="flex-1 rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 py-2.5 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#0F172A] focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1E293B] cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Añadir</span>
          </button>
        </form>
      </section>

      {/* Grid de Bitácora y Reencuadre */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* 2. Registro de Prácticas */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs lg:col-span-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0F172A]">
                Bitácora de Autoevaluación
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Registra tus reuniones, negociaciones o discursos para analizar aciertos y áreas de mejora.
              </p>
            </div>

            <form onSubmit={handleAddLog} className="space-y-4">
              <div>
                <label htmlFor="situation-input" className="block text-xs font-medium text-slate-700">Situación o contexto</label>
                <input
                  id="situation-input"
                  type="text"
                  value={situationInput}
                  onChange={(e) => setSituationInput(e.target.value)}
                  placeholder="Ej. Presentación de resultados Q3"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#0F172A] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="went-well-input" className="block text-xs font-medium text-slate-700">¿Qué funcionó bien?</label>
                <input
                  id="went-well-input"
                  type="text"
                  value={wentWellInput}
                  onChange={(e) => setWentWellInput(e.target.value)}
                  placeholder="Ej. Seguridad en la apertura y tono firme"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#0F172A] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="to-improve-input" className="block text-xs font-medium text-slate-700">¿Qué mejorar para la próxima?</label>
                <input
                  id="to-improve-input"
                  type="text"
                  value={toImproveInput}
                  onChange={(e) => setToImproveInput(e.target.value)}
                  placeholder="Ej. Reducir muletillas al responder objeciones"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#0F172A] focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-[#0F172A] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1E293B] cursor-pointer"
              >
                Guardar Registro (+20 XP)
              </button>
            </form>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
            <h3 className="font-display text-sm font-bold text-[#0F172A]">Registros Anteriores:</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="rounded-xl bg-[#F8FAFC] p-4 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-bold text-[#0F172A]">{log.situation}</span>
                    <span className="font-mono">{log.date}</span>
                  </div>
                  <p className="text-emerald-800">✓ {log.wentWell}</p>
                  <p className="text-amber-800">⚡ {log.toImprove}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Reencuadre de Pensamientos */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs lg:col-span-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0F172A]">
                Reencuadre de Pensamientos
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Transforma quejas o dudas limitantes en declaraciones constructivas y de alto rendimiento.
              </p>
            </div>

            <form onSubmit={handleAddReframe} className="space-y-4">
              <div>
                <label htmlFor="limiting-input" className="block text-xs font-medium text-slate-700">Pensamiento limitante o queja</label>
                <input
                  id="limiting-input"
                  type="text"
                  value={limitingInput}
                  onChange={(e) => setLimitingInput(e.target.value)}
                  placeholder="Ej. No tengo suficiente experiencia para cobrar caro"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#0F172A] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="empowering-input" className="block text-xs font-medium text-slate-700">Declaración de poder y acción</label>
                <input
                  id="empowering-input"
                  type="text"
                  value={empoweringInput}
                  onChange={(e) => setEmpoweringInput(e.target.value)}
                  placeholder="Ej. Aporto valor real y medible que resuelve el problema del cliente"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#0F172A] focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-[#B45309] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#92400e] cursor-pointer"
              >
                Reencuadrar Pensamiento (+15 XP)
              </button>
            </form>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
            <h3 className="font-display text-sm font-bold text-[#0F172A]">Tus Reencuadres Activos:</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {reframes.map((ref) => (
                <div key={ref.id} className="rounded-xl bg-amber-50/40 p-4 border border-amber-200 space-y-2 text-xs">
                  <p className="text-slate-600 line-through">“{ref.limitingThought}”</p>
                  <p className="font-semibold text-amber-950">➔ “{ref.empoweringStatement}”</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
