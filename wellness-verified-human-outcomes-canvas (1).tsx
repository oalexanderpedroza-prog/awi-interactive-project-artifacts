import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Brain,
  Briefcase,
  CheckCircle2,
  Clock3,
  GitCompare,
  Info,
  Layers3,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';

type ScenarioKey = 'A' | 'B';
type ViewMode = 'single' | 'compare';
type Horizon = 'session' | 'extended';
type TabKey = 'mechanisms' | 'capability' | 'outcomes';

type InputConfig = {
  label: string;
  min: number;
  max: number;
  default: number;
  unit: string;
  domain: string;
  desc: string;
};

type InputState = Record<string, number>;

type OutcomeBundle = {
  mechanisms: Record<string, number>;
  capability: Record<string, number>;
  humanOutcomes: Record<string, number>;
  productOutcomes: Record<string, number>;
  capabilitySupportIndex: number;
  synthesisInsight: string;
  logicPathway: {
    designCondition: string;
    mechanism: string;
    capabilityEffect: string;
    downstreamEffect: string;
  };
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

const INPUT_VARIABLES: Record<string, InputConfig> = {
  prePromptGuidance: {
    label: 'Pre-Prompt Guidance',
    min: 0,
    max: 100,
    default: 30,
    unit: '%',
    domain: 'Domain A · Access and Everyday Use',
    desc: 'How much the interface helps users clarify intent before they start typing.',
  },
  contextualScaffolding: {
    label: 'Contextual Scaffolding',
    min: 0,
    max: 100,
    default: 35,
    unit: '%',
    domain: 'Domain A · Access and Everyday Use',
    desc: 'Support for identifying relevant details, audience, and constraints in high-stakes tasks.',
  },
  interpretability: {
    label: 'Output Interpretability',
    min: 0,
    max: 100,
    default: 40,
    unit: '%',
    domain: 'Domain B · Agency, Clarity, and Control',
    desc: 'Clarity of why the system responded the way it did and how users should evaluate it.',
  },
  trustCalibrationSupport: {
    label: 'Trust Calibration Support',
    min: 0,
    max: 100,
    default: 25,
    unit: '%',
    domain: 'Domain B · Agency, Clarity, and Control',
    desc: 'Signals that help users verify, question, and appropriately rely on outputs.',
  },
  iterationScaffolding: {
    label: 'Iteration Scaffolding',
    min: 0,
    max: 100,
    default: 35,
    unit: '%',
    domain: 'Domain B · Agency, Clarity, and Control',
    desc: 'How much the interface normalizes refinement, follow-up questions, and collaborative use.',
  },
  cognitiveBurden: {
    label: 'Cognitive Burden',
    min: 0,
    max: 100,
    default: 60,
    unit: '%',
    domain: 'Domain C · Exposure, Pressure, and Overload',
    desc: 'Mental effort required to translate a real-world task into an effective interaction.',
  },
  interruptionPressure: {
    label: 'Interruption / Pressure',
    min: 0,
    max: 100,
    default: 45,
    unit: '%',
    domain: 'Domain C · Exposure, Pressure, and Overload',
    desc: 'Time pressure, urgency, and competing demands surrounding use of the system.',
  },
  userControl: {
    label: 'User Control',
    min: 0,
    max: 100,
    default: 55,
    unit: '%',
    domain: 'Domain B · Agency, Clarity, and Control',
    desc: 'Degree of user agency over task framing, editing, and decision-making.',
  },
  contextualAdaptability: {
    label: 'Contextual Adaptability',
    min: 0,
    max: 100,
    default: 30,
    unit: '%',
    domain: 'Domain E · Opportunity and Longer-Term Outcomes',
    desc: 'How well the interface adapts to differing literacy levels, task stakes, and user conditions.',
  },
};

const defaultState = (): InputState =>
  Object.keys(INPUT_VARIABLES).reduce((acc, key) => {
    acc[key] = INPUT_VARIABLES[key].default;
    return acc;
  }, {} as InputState);

const metricColor = (value: number, inverse = false) => {
  const v = inverse ? 100 - value : value;
  if (v >= 70) return 'bg-emerald-500';
  if (v >= 45) return 'bg-amber-400';
  return 'bg-rose-500';
};

const scoreTextColor = (value: number) => {
  if (value >= 70) return 'text-emerald-600';
  if (value >= 45) return 'text-amber-500';
  return 'text-rose-600';
};

const ProgressBar = ({
  label,
  value,
  help,
  inverse = false,
  icon: Icon,
}: {
  label: string;
  value: number;
  help?: string;
  inverse?: boolean;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {Icon ? <Icon size={14} className="text-slate-400 shrink-0" /> : null}
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-700 truncate">{label}</div>
          {help ? <div className="text-[11px] text-slate-400 leading-snug">{help}</div> : null}
        </div>
      </div>
      <span className="text-xs font-bold text-slate-500 shrink-0">{Math.round(value)}%</span>
    </div>
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full transition-all duration-500 ${metricColor(value, inverse)}`}
        style={{ width: `${clamp(value)}%` }}
      />
    </div>
  </div>
);

const SectionCard = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{title}</div>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
    {children}
  </div>
);

const App = () => {
  const [scenarioA, setScenarioA] = useState<InputState>(defaultState);
  const [scenarioB, setScenarioB] = useState<InputState>(defaultState);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [timeHorizon, setTimeHorizon] = useState<Horizon>('extended');
  const [activeTab, setActiveTab] = useState<TabKey>('mechanisms');

  const updateScenario = (scenario: ScenarioKey, key: string, value: string) => {
    const parsed = Number.parseInt(value, 10);
    const next = Number.isNaN(parsed) ? 0 : parsed;
    if (scenario === 'A') setScenarioA((prev) => ({ ...prev, [key]: next }));
    else setScenarioB((prev) => ({ ...prev, [key]: next }));
  };

  const resetScenario = (scenario: ScenarioKey) => {
    if (scenario === 'A') setScenarioA(defaultState());
    else setScenarioB(defaultState());
  };

  const calculateOutcomes = (inputs: InputState): OutcomeBundle => {
    const {
      prePromptGuidance,
      contextualScaffolding,
      interpretability,
      trustCalibrationSupport,
      iterationScaffolding,
      cognitiveBurden,
      interruptionPressure,
      userControl,
      contextualAdaptability,
    } = inputs;

    const mechanisms = {
      cognitiveLoad: clamp(cognitiveBurden * 0.58 + interruptionPressure * 0.22 + (100 - prePromptGuidance) * 0.2),
      promptConfidence: clamp(prePromptGuidance * 0.42 + contextualScaffolding * 0.33 + userControl * 0.25),
      trustCalibration: clamp(interpretability * 0.44 + trustCalibrationSupport * 0.36 + userControl * 0.2),
      perceivedAgency: clamp(userControl * 0.45 + iterationScaffolding * 0.3 + contextualAdaptability * 0.25),
      mentalModelClarity: clamp(prePromptGuidance * 0.3 + interpretability * 0.4 + iterationScaffolding * 0.3),
      persistenceLikelihood: 0,
    };

    mechanisms.persistenceLikelihood = clamp(
      mechanisms.promptConfidence * 0.34 +
        mechanisms.perceivedAgency * 0.28 +
        mechanisms.trustCalibration * 0.2 +
        (100 - mechanisms.cognitiveLoad) * 0.18,
    );

    const capability = {
      firstPromptReadiness: clamp(mechanisms.promptConfidence * 0.48 + mechanisms.mentalModelClarity * 0.22 + (100 - mechanisms.cognitiveLoad) * 0.3),
      taskConfidence: clamp(mechanisms.trustCalibration * 0.28 + mechanisms.perceivedAgency * 0.28 + mechanisms.promptConfidence * 0.24 + (100 - mechanisms.cognitiveLoad) * 0.2),
      collaborativeUseCapacity: clamp(iterationScaffolding * 0.34 + mechanisms.mentalModelClarity * 0.32 + mechanisms.persistenceLikelihood * 0.34),
      equitableUsability: clamp(contextualAdaptability * 0.35 + contextualScaffolding * 0.3 + prePromptGuidance * 0.2 + (100 - cognitiveBurden) * 0.15),
    };

    const horizonMultiplier = timeHorizon === 'extended' ? 1.15 : 0.9;

    const humanOutcomes = {
      activationSuccess: clamp(capability.firstPromptReadiness * 0.55 + mechanisms.persistenceLikelihood * 0.25 + (100 - mechanisms.cognitiveLoad) * 0.2),
      engagementDepth: clamp(capability.collaborativeUseCapacity * 0.45 + mechanisms.perceivedAgency * 0.25 + mechanisms.mentalModelClarity * 0.3),
      responsibleReliance: clamp(mechanisms.trustCalibration * 0.5 + capability.taskConfidence * 0.25 + interpretability * 0.25),
      adoptionBreadth: clamp((capability.equitableUsability * 0.45 + humanSafeSeed(capability.firstPromptReadiness, mechanisms.cognitiveLoad) * 0.3 + contextualAdaptability * 0.25) * horizonMultiplier),
      capabilityExpansion: clamp((capability.collaborativeUseCapacity * 0.3 + capability.taskConfidence * 0.3 + capability.equitableUsability * 0.2 + iterationScaffolding * 0.2) * horizonMultiplier),
    };

    const productOutcomes = {
      retentionDurability: clamp(humanOutcomes.responsibleReliance * 0.34 + humanOutcomes.engagementDepth * 0.33 + humanOutcomes.capabilityExpansion * 0.33),
      trustDurability: clamp(mechanisms.trustCalibration * 0.5 + humanOutcomes.responsibleReliance * 0.3 + interpretability * 0.2),
      valueRealizationSpeed: clamp(capability.firstPromptReadiness * 0.45 + humanOutcomes.activationSuccess * 0.35 + (100 - mechanisms.cognitiveLoad) * 0.2),
      addressableUseExpansion: clamp(humanOutcomes.adoptionBreadth * 0.55 + capability.equitableUsability * 0.45),
    };

    const capabilitySupportIndex = clamp(
      capability.firstPromptReadiness * 0.17 +
        capability.taskConfidence * 0.16 +
        capability.collaborativeUseCapacity * 0.16 +
        capability.equitableUsability * 0.16 +
        humanOutcomes.responsibleReliance * 0.17 +
        humanOutcomes.capabilityExpansion * 0.18,
    );

    let synthesisInsight = 'The current configuration supports a mixed experience: some users will reach value, but the design still assumes hidden competencies that are not evenly distributed.';
    if (capabilitySupportIndex >= 72) {
      synthesisInsight = 'This configuration behaves like a capability-supportive environment: it reduces avoidable burden, improves trust calibration, and expands who can reach meaningful value quickly.';
    } else if (capabilitySupportIndex < 45) {
      synthesisInsight = 'This configuration creates a capability bottleneck: early ambiguity and cognitive burden are likely to suppress activation, narrow adoption breadth, and weaken durable trust.';
    }

    const logicPathway = {
      designCondition:
        prePromptGuidance >= 60
          ? 'High pre-prompt guidance and contextual structure'
          : 'Low pre-prompt guidance with users expected to self-structure',
      mechanism:
        mechanisms.cognitiveLoad > 55
          ? 'Elevated cognitive load during interaction initiation'
          : 'Reduced uncertainty and clearer task translation',
      capabilityEffect:
        capability.firstPromptReadiness >= 60
          ? 'Higher first-prompt readiness and stronger task confidence'
          : 'Lower first-prompt readiness and weaker persistence',
      downstreamEffect:
        humanOutcomes.activationSuccess >= 60
          ? 'Faster value realization and broader early adoption'
          : 'Early disengagement risk and narrower successful use distribution',
    };

    return {
      mechanisms,
      capability,
      humanOutcomes,
      productOutcomes,
      capabilitySupportIndex,
      synthesisInsight,
      logicPathway,
    };
  };

  const resultsA = useMemo(() => calculateOutcomes(scenarioA), [scenarioA, timeHorizon]);
  const resultsB = useMemo(() => calculateOutcomes(scenarioB), [scenarioB, timeHorizon]);

  const tabMeta: Array<{ id: TabKey; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { id: 'mechanisms', label: 'Mechanisms', icon: Brain },
    { id: 'capability', label: 'Capability Effects', icon: Target },
    { id: 'outcomes', label: 'Human + Product Outcomes', icon: BarChart3 },
  ];

  const ControlPanel = ({ scenario, values }: { scenario: ScenarioKey; values: InputState }) => (
    <SectionCard
      title={`Design Conditions${viewMode === 'compare' ? ` · Scenario ${scenario}` : ''}`}
      subtitle="Adjust the interface conditions and inspect how they change mechanism-level behavior."
    >
      <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
        {Object.entries(INPUT_VARIABLES).map(([key, config]) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-end justify-between gap-3 text-xs">
              <div>
                <div className="font-semibold text-slate-700">{config.label}</div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">{config.domain}</div>
              </div>
              <span className="font-mono text-blue-600">
                {values[key]}
                {config.unit}
              </span>
            </div>
            <input
              type="range"
              min={config.min}
              max={config.max}
              value={values[key]}
              onChange={(e) => updateScenario(scenario, key, e.target.value)}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600"
            />
            <p className="text-[11px] leading-snug text-slate-400">{config.desc}</p>
          </div>
        ))}
      </div>
      <button
        onClick={() => resetScenario(scenario)}
        className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-slate-500 transition-colors hover:text-blue-600"
      >
        <RefreshCcw size={14} /> Reset to baseline
      </button>
    </SectionCard>
  );

  const ScenarioResultCard = ({
    title,
    results,
    accent,
  }: {
    title: string;
    results: OutcomeBundle;
    accent: string;
  }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${accent}`}>
            {title}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Wellness Verified Tool 01 · Synthesis and concept evaluation
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-right">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Capability Support Index</div>
          <div className={`mt-1 text-3xl font-black ${scoreTextColor(results.capabilitySupportIndex)}`}>
            {Math.round(results.capabilitySupportIndex)}
          </div>
        </div>
      </div>

      {activeTab === 'mechanisms' && (
        <div className="space-y-4">
          <ProgressBar
            label="Cognitive Load"
            value={results.mechanisms.cognitiveLoad}
            help="Lower is better. High values indicate translation burden before useful interaction begins."
            inverse
            icon={Brain}
          />
          <ProgressBar label="Prompt Confidence" value={results.mechanisms.promptConfidence} help="Likelihood that users can initiate with enough structure to get a useful response." icon={Sparkles} />
          <ProgressBar label="Trust Calibration" value={results.mechanisms.trustCalibration} help="Capacity to rely appropriately rather than overtrusting or dismissing outputs." icon={ShieldCheck} />
          <ProgressBar label="Perceived Agency" value={results.mechanisms.perceivedAgency} help="Whether the interaction feels user-directed rather than system-directed." icon={Users} />
          <ProgressBar label="Mental Model Clarity" value={results.mechanisms.mentalModelClarity} help="Whether users understand the system as iterative, collaborative, and bounded." icon={Layers3} />
          <ProgressBar label="Persistence Likelihood" value={results.mechanisms.persistenceLikelihood} help="Probability that users continue instead of abandoning after initial friction." icon={ArrowRight} />
        </div>
      )}

      {activeTab === 'capability' && (
        <div className="space-y-4">
          <ProgressBar label="First-Prompt Readiness" value={results.capability.firstPromptReadiness} help="How ready users are to begin effectively without external prompt education." icon={Target} />
          <ProgressBar label="Task Confidence" value={results.capability.taskConfidence} help="Confidence that the system can help complete a real task appropriately." icon={CheckCircle2} />
          <ProgressBar label="Collaborative Use Capacity" value={results.capability.collaborativeUseCapacity} help="Likelihood that users treat the system as an iterative partner rather than a one-shot answer engine." icon={Users} />
          <ProgressBar label="Equitable Usability" value={results.capability.equitableUsability} help="How well the design supports users under different literacy, bandwidth, and cognitive conditions." icon={ShieldCheck} />
        </div>
      )}

      {activeTab === 'outcomes' && (
        <div className="space-y-5">
          <div>
            <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Human outcomes</div>
            <div className="space-y-4">
              <ProgressBar label="Activation Success" value={results.humanOutcomes.activationSuccess} icon={Sparkles} />
              <ProgressBar label="Engagement Depth" value={results.humanOutcomes.engagementDepth} icon={Layers3} />
              <ProgressBar label="Responsible Reliance" value={results.humanOutcomes.responsibleReliance} icon={ShieldCheck} />
              <ProgressBar label="Adoption Breadth" value={results.humanOutcomes.adoptionBreadth} icon={Users} />
              <ProgressBar label="Capability Expansion" value={results.humanOutcomes.capabilityExpansion} icon={Target} />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Product outcomes</div>
            <div className="space-y-4">
              <ProgressBar label="Retention Durability" value={results.productOutcomes.retentionDurability} icon={Clock3} />
              <ProgressBar label="Trust Durability" value={results.productOutcomes.trustDurability} icon={ShieldCheck} />
              <ProgressBar label="Value Realization Speed" value={results.productOutcomes.valueRealizationSpeed} icon={ArrowRight} />
              <ProgressBar label="Addressable Use Expansion" value={results.productOutcomes.addressableUseExpansion} icon={Briefcase} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700">
              Wellness Verified™ · Core Research Artifact
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Human Outcomes <span className="text-blue-600 underline decoration-blue-200">Mapping Canvas</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
              A structured synthesis tool for mapping how interface conditions influence behavioral mechanisms,
              user capability, and downstream adoption patterns. In this case study, the canvas is used to
              evaluate conversational AI under cognitive load, with particular attention to early interaction
              friction, trust calibration, and equitable value realization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setViewMode('single')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                viewMode === 'single' ? 'bg-blue-600 text-white shadow-md' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Single view
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                viewMode === 'compare' ? 'bg-blue-600 text-white shadow-md' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <GitCompare size={16} /> Compare
            </button>
          </div>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">How to read this canvas</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                The canvas models a simple chain: <span className="font-semibold text-slate-800">design conditions → mechanisms → capability effects → human and product outcomes</span>.
                It is not a predictive analytics model. It is a structured reasoning instrument used during synthesis to make
                causal assumptions explicit and legible.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setTimeHorizon('session')}
                className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                  timeHorizon === 'session' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Session-level
              </button>
              <button
                onClick={() => setTimeHorizon('extended')}
                className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                  timeHorizon === 'extended' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Repeated use
              </button>
            </div>
          </div>
        </div>

        <main className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-4">
            <ControlPanel scenario="A" values={scenarioA} />
            {viewMode === 'compare' ? <ControlPanel scenario="B" values={scenarioB} /> : null}
          </div>

          <div className="space-y-6 lg:col-span-8">
            <div className="overflow-x-auto border-b border-slate-200">
              <div className="flex min-w-max gap-4">
                {tabMeta.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 border-b-2 px-2 py-3 text-sm font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <tab.icon size={16} /> {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`grid grid-cols-1 gap-6 ${viewMode === 'compare' ? 'md:grid-cols-2' : ''}`}>
              <ScenarioResultCard title={viewMode === 'compare' ? 'Scenario A' : 'Current configuration'} results={resultsA} accent="bg-blue-600 text-white" />
              {viewMode === 'compare' ? (
                <ScenarioResultCard title="Scenario B" results={resultsB} accent="bg-violet-600 text-white" />
              ) : null}
            </div>

            {viewMode === 'compare' ? (
              <SectionCard title="Direct comparison" subtitle="Change in support between Scenario A and Scenario B.">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { label: 'Capability Support', a: resultsA.capabilitySupportIndex, b: resultsB.capabilitySupportIndex },
                    { label: 'Activation Success', a: resultsA.humanOutcomes.activationSuccess, b: resultsB.humanOutcomes.activationSuccess },
                    { label: 'Trust Durability', a: resultsA.productOutcomes.trustDurability, b: resultsB.productOutcomes.trustDurability },
                    { label: 'Adoption Breadth', a: resultsA.humanOutcomes.adoptionBreadth, b: resultsB.humanOutcomes.adoptionBreadth },
                  ].map((item) => {
                    const diff = Math.round(item.b - item.a);
                    const diffClass = diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-500';
                    return (
                      <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{item.label}</div>
                        <div className={`mt-2 text-lg font-black ${diffClass}`}>{diff > 0 ? '+' : ''}{diff}%</div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            ) : (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <SectionCard title="Synthesis insight" subtitle="Interpretive readout for the current configuration.">
                  <div className="rounded-2xl bg-slate-900 p-5 text-white">
                    <p className="text-lg leading-relaxed">{resultsA.synthesisInsight}</p>
                  </div>
                </SectionCard>

                <SectionCard title="Mechanism pathway" subtitle="One visible design pathway from condition to downstream effect.">
                  <div className="space-y-4 text-sm text-slate-700">
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">1</div>
                      <div>
                        <div className="font-semibold">Design condition</div>
                        <p className="text-slate-500">{resultsA.logicPathway.designCondition}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-black text-sky-700">2</div>
                      <div>
                        <div className="font-semibold">Mechanism</div>
                        <p className="text-slate-500">{resultsA.logicPathway.mechanism}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700">3</div>
                      <div>
                        <div className="font-semibold">Capability effect</div>
                        <p className="text-slate-500">{resultsA.logicPathway.capabilityEffect}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">4</div>
                      <div>
                        <div className="font-semibold">Downstream effect</div>
                        <p className="text-slate-500">{resultsA.logicPathway.downstreamEffect}</p>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>
            )}
          </div>
        </main>

        <footer className="flex flex-col gap-3 border-t border-slate-200 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-start gap-2 text-xs leading-relaxed text-slate-400">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              This artifact operationalizes Wellness Verified as a research lens by connecting design conditions to
              mechanisms, capability effects, and long-term outcomes. It is designed for synthesis and concept evaluation,
              not for causal validation or formal certification scoring.
            </span>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            v2.0 · Human Outcomes Mapping Canvas
          </div>
        </footer>
      </div>
    </div>
  );
};

function humanSafeSeed(firstPromptReadiness: number, cognitiveLoad: number) {
  return clamp(firstPromptReadiness * 0.6 + (100 - cognitiveLoad) * 0.4);
}

export default App;
