import React, {useState, useEffect} from 'react';
import {ArrowRight, Bot, Key, Sparkles, Volume2, CheckCircle2, AlertCircle, Settings} from 'lucide-react';
import {getLocalAiCoaching, fetchMultiAiCoaching, type LocalAiAdvice, type AiProvider} from '../engine/localAiCoach';
import {speakSpanishPhrase} from '../utils/sound';

interface LocalAiMentorViewProps {
  initialTopic?: string;
  onAddXp: (amount: number) => void;
}

const PRESET_PROMPTS = [
  '¿Cómo responder cuando un cliente dice que es muy caro?',
  '¿Cómo empezar una presentación importante sin ponerme nervioso?',
  '¿Cómo estructurar un discurso o propuesta comercial de 2 minutos?',
  '¿Cómo eliminar las muletillas al hablar en reuniones?',
];

export const LocalAiMentorView: React.FC<LocalAiMentorViewProps> = ({
  initialTopic,
  onAddXp,
}) => {
  const [query, setQuery] = useState<string>(initialTopic || '');
  const [currentAdvice, setCurrentAdvice] = useState<LocalAiAdvice | null>(
    initialTopic ? getLocalAiCoaching(initialTopic) : null
  );
  const [loading, setLoading] = useState<boolean>(false);
  
  // Multiprovider state
  const [provider, setProvider] = useState<AiProvider>('grok');
  const [apiKey, setApiKey] = useState<string>('');
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [keySavedMessage, setKeySavedMessage] = useState<boolean>(false);
  const [activeEngineLabel, setActiveEngineLabel] = useState<string>('Mentor Experto Integrado');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const savedProv = localStorage.getItem('verbo_ai_provider') as AiProvider;
    const savedKey = localStorage.getItem('verbo_ai_api_key');
    if (savedProv) setProvider(savedProv);
    if (savedKey) {
      setApiKey(savedKey);
      updateEngineLabel(savedProv || 'grok', savedKey);
    }
  }, []);

  const updateEngineLabel = (prov: AiProvider, key: string) => {
    if (!key.trim()) {
      setActiveEngineLabel('Mentor Experto Integrado');
      return;
    }
    switch (prov) {
      case 'grok':
        setActiveEngineLabel('Grok xAI Activo');
        break;
      case 'openai':
        setActiveEngineLabel('OpenAI GPT-4o Activo');
        break;
      case 'openrouter':
        setActiveEngineLabel('OpenRouter Activo');
        break;
      case 'gemini':
        setActiveEngineLabel('Google Gemini Activo');
        break;
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('verbo_ai_provider', provider);
    localStorage.setItem('verbo_ai_api_key', apiKey.trim());
    updateEngineLabel(provider, apiKey);
    setKeySavedMessage(true);
    setTimeout(() => setKeySavedMessage(false), 3000);
  };

  const handleAskMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setErrorMsg(null);

    const savedKey = localStorage.getItem('verbo_ai_api_key');
    const savedProv = (localStorage.getItem('verbo_ai_provider') as AiProvider) || provider;

    if (savedKey && savedKey.trim().length > 5) {
      try {
        const advice = await fetchMultiAiCoaching(query, savedProv, savedKey);
        setCurrentAdvice(advice);
        setLoading(false);
        onAddXp(15);
        return;
      } catch (err: any) {
        console.warn('API externa falló, usando base experta local:', err);
        setErrorMsg('La API seleccionada no respondió o agotó saldo. Usando mentoría experta integrada.');
      }
    }

    // Fallback o motor por defecto
    window.setTimeout(() => {
      const advice = getLocalAiCoaching(query);
      setCurrentAdvice(advice);
      setLoading(false);
      onAddXp(10);
    }, 400);
  };

  const handleSelectPreset = async (preset: string) => {
    setQuery(preset);
    setLoading(true);
    setErrorMsg(null);

    const savedKey = localStorage.getItem('verbo_ai_api_key');
    const savedProv = (localStorage.getItem('verbo_ai_provider') as AiProvider) || provider;

    if (savedKey && savedKey.trim().length > 5) {
      try {
        const advice = await fetchMultiAiCoaching(preset, savedProv, savedKey);
        setCurrentAdvice(advice);
        setLoading(false);
        onAddXp(15);
        return;
      } catch (err) {
        console.warn('API externa falló en preset:', err);
      }
    }

    window.setTimeout(() => {
      const advice = getLocalAiCoaching(preset);
      setCurrentAdvice(advice);
      setLoading(false);
      onAddXp(10);
    }, 300);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Cabecera y botón de configuración de APIs */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#B45309]">
            Mentor IA Ejecutivo
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#0F172A]">
            Tu estratega de oratoria, ventas y liderazgo 24/7
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <Settings className="h-3.5 w-3.5 text-[#B45309]" aria-hidden="true" />
            <span>Configurar Proveedor y API Key</span>
          </button>
          <div className="inline-flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-2 border border-teal-200 text-teal-900 text-xs font-semibold">
            <Sparkles className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <span>{activeEngineLabel}</span>
          </div>
        </div>
      </div>

      {/* Panel desplegable de configuración de múltiples proveedoras de API */}
      {showConfig && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm space-y-4 animate-fadeIn">
          <div>
            <h3 className="font-display text-base font-bold text-[#0F172A]">
              Selecciona tu Proveedor de IA y coloca tu API Key
            </h3>
            <p className="mt-1 text-xs text-slate-600 max-w-2xl">
              Si se acaba el saldo de Grok o prefieres usar otra, puedes cambiar fácilmente de proveedor (Grok xAI, OpenAI GPT-4o, OpenRouter o Google Gemini). Si no colocas clave, la app utiliza el mentor experto integrado.
            </p>
          </div>

          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Proveedor</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as AiProvider)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-[#0F172A] focus:border-[#0F172A] focus:outline-none cursor-pointer"
              >
                <option value="grok">Grok (xAI)</option>
                <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                <option value="openrouter">OpenRouter (Múltiples modelos con 1 key)</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Pega tu API Key del proveedor seleccionado..."
                aria-label="API Key de IA"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-[#0F172A] placeholder:text-slate-400 focus:border-[#0F172A] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 flex items-end gap-2 pt-5 sm:pt-0">
              <button
                type="submit"
                className="w-full rounded-xl bg-[#0F172A] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1E293B] cursor-pointer whitespace-nowrap"
              >
                Guardar
              </button>
            </div>
          </form>

          <div className="flex items-center justify-between pt-2">
            {keySavedMessage && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>¡Configuración de API guardada correctamente!</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('verbo_ai_api_key');
                localStorage.removeItem('verbo_ai_provider');
                setApiKey('');
                setActiveEngineLabel('Mentor Experto Integrado');
              }}
              className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
            >
              Desconectar API y usar modo integrado
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Panel izquierdo: Entrada de pregunta y presets */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs lg:col-span-5 space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              ¿Qué situación quieres resolver hoy?
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Escribe cualquier objeción, duda sobre tu pitch, o desafío de liderazgo.
            </p>
          </div>

          <form onSubmit={handleAskMentor} className="space-y-4">
            <div>
              <textarea
                rows={4}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej. Tengo que defender mis honorarios ante un cliente que presiona para hacer un descuento..."
                aria-label="Describe tu situación para el mentor"
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#0F172A] focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F172A] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 cursor-pointer"
            >
              <Bot className="h-4 w-4" aria-hidden="true" />
              <span>{loading ? 'Analizando con marco experto...' : 'Consultar Mentor IA (+15 XP)'}</span>
            </button>
          </form>

          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Preguntas Frecuentes de Alta Demanda:
            </p>
            <div className="space-y-2">
              {PRESET_PROMPTS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 text-left text-xs font-medium text-slate-700 transition-colors hover:border-[#0F172A] hover:bg-slate-50 cursor-pointer"
                >
                  <span className="truncate">{preset}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho: Respuesta estructurada del Mentor */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs lg:col-span-7 flex flex-col justify-between">
          {currentAdvice ? (
            <div className="space-y-6">
              <div>
                <span className="rounded-md bg-teal-50 px-2.5 py-1 font-mono text-xs font-semibold text-teal-800">
                  Respuesta y Pensamiento Experto
                </span>
                <h3 className="mt-3 font-display text-xl font-bold text-[#0F172A]">
                  {currentAdvice.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {currentAdvice.corePremise}
                </p>
              </div>

              <div className="rounded-xl bg-[#F8FAFC] p-5 border border-slate-200 space-y-3">
                <h4 className="font-display text-sm font-bold text-[#0F172A]">
                  Framework de Acción Directa:
                </h4>
                <ul className="space-y-2 text-xs leading-relaxed text-slate-700">
                  {currentAdvice.framework.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-bold text-[#B45309]">·</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-teal-50/50 p-5 border border-teal-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-sm font-bold text-teal-900">
                    Guion o Ejemplo Concreto:
                  </h4>
                  <button
                    type="button"
                    onClick={() => speakSpanishPhrase(currentAdvice.concreteExample)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-xs hover:bg-teal-50 cursor-pointer"
                  >
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                    <span>Escuchar</span>
                  </button>
                </div>
                <p className="text-sm italic text-teal-950">{currentAdvice.concreteExample}</p>
              </div>

              <div className="rounded-xl bg-slate-900 p-5 text-white space-y-1">
                <p className="text-xs text-amber-300 font-semibold uppercase tracking-wider">
                  Reencuadre de Mentalidad
                </p>
                <p className="text-sm leading-relaxed">{currentAdvice.mindsetShift}</p>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center space-y-4">
              <Bot className="mx-auto h-14 w-14 text-slate-300" aria-hidden="true" />
              <h3 className="font-display text-lg font-bold text-[#0F172A]">
                Tu Mentor IA Ejecutivo está listo
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Escribe tu consulta a la izquierda o selecciona una pregunta frecuente para recibir un análisis profundo al instante.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
