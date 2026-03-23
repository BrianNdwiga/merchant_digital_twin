import React, { useState, useEffect } from 'react';
import './ScenarioTesting.css';

const MODIFICATION_CONFIG = {
  remove_step:         { emoji: '➖', label: 'Remove Step',        color: '#ff6b6b' },
  add_verification:    { emoji: '✅', label: 'Add Verification',   color: '#51cf66' },
  reduce_fields:       { emoji: '📝', label: 'Reduce Fields',      color: '#339af0' },
  add_help_text:       { emoji: '💡', label: 'Add Help Text',      color: '#ffd43b' },
  improve_performance: { emoji: '⚡', label: 'Improve Performance', color: '#cc5de8' },
  simplify_ui:         { emoji: '✨', label: 'Simplify UI',        color: '#20c997' },
};

function ScenarioTesting() {
  const [scenarios,         setScenarios]         = useState([]);
  const [baselineScenario,  setBaselineScenario]  = useState('baseline');
  const [modifiedScenario,  setModifiedScenario]  = useState({ name: 'Modified Flow', modifications: [] });
  const [comparisonResults, setComparisonResults] = useState(null);
  const [aiPrediction,      setAiPrediction]      = useState(null);
  const [isRunning,         setIsRunning]         = useState(false);
  const [isPredicting,      setIsPredicting]      = useState(false);
  const [activeTab,         setActiveTab]         = useState('build'); // build | results
  const [runProgress,       setRunProgress]       = useState(0);

  useEffect(() => { fetchScenarios(); }, []);

  const fetchScenarios = async () => {
    try {
      const res  = await fetch('http://localhost:3000/scenarios/list');
      const data = await res.json();
      setScenarios(data.scenarios || []);
    } catch { /* silent */ }
  };

  const addModification = (type) => {
    const mod = { id: Date.now(), type, description: getModificationDescription(type) };
    setModifiedScenario(prev => ({ ...prev, modifications: [...prev.modifications, mod] }));
    predictImpact(type);
  };

  const removeModification = (id) => {
    setModifiedScenario(prev => ({ ...prev, modifications: prev.modifications.filter(m => m.id !== id) }));
  };

  const getModificationDescription = (type) => ({
    remove_step:         'Remove onboarding step',
    add_verification:    'Add verification step',
    reorder_steps:       'Reorder steps',
    add_required_field:  'Add required field',
    simplify_form:       'Simplify form fields',
    add_help_text:       'Add help text',
    reduce_fields:       'Reduce required fields',
    improve_performance: 'Improve page load performance',
    simplify_ui:         'Simplify user interface',
  })[type] || type;

  const predictImpact = async (changeType) => {
    setIsPredicting(true);
    try {
      const res  = await fetch('http://localhost:3000/scenario/predict', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ scenarioChange: { type: changeType, description: getModificationDescription(changeType) } }),
      });
      const data = await res.json();
      if (data.success) setAiPrediction(data.prediction);
    } catch { /* silent */ }
    finally { setIsPredicting(false); }
  };

  const runComparison = async () => {
    if (modifiedScenario.modifications.length === 0) return;
    setIsRunning(true);
    setRunProgress(0);
    setActiveTab('results');

    try {
      setRunProgress(15);
      await new Promise(r => setTimeout(r, 300));
      setRunProgress(35);
      await new Promise(r => setTimeout(r, 400));

      setRunProgress(55);
      const combinedPrediction = await getCombinedPrediction();
      setRunProgress(75);
      await new Promise(r => setTimeout(r, 300));

      const results = generateResultsFromPrediction(combinedPrediction);
      setRunProgress(100);
      await new Promise(r => setTimeout(r, 200));
      setComparisonResults(results);
    } catch (error) {
      console.error('Comparison error:', error);
      setComparisonResults(generateSimulatedResults(modifiedScenario.modifications));
    } finally {
      setIsRunning(false);
    }
  };

  const getCombinedPrediction = async () => {
    try {
      const res = await fetch('http://localhost:3000/scenario/predict-combined', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baselineScenarioId: baselineScenario,
          modifications: modifiedScenario.modifications.map(m => ({ type: m.type, description: m.description })),
        }),
      });
      if (!res.ok) throw new Error('Prediction failed');
      const data = await res.json();
      if (data.success && data.prediction) return data.prediction;
      throw new Error('Invalid prediction response');
    } catch {
      return generateCombinedFallbackPrediction(modifiedScenario.modifications);
    }
  };

  const generateResultsFromPrediction = (prediction) => {
    const baseline = {
      completionRate: prediction.predictedImpact?.completionRate?.current      || 0.65,
      avgTime:        prediction.predictedImpact?.avgCompletionTime?.current   || 45000,
      dropOffRate:    prediction.predictedImpact?.dropOffRate?.current         || 0.35,
      frictionScore:  prediction.predictedImpact?.frictionScore?.current       || 0.42,
    };
    const modified = {
      completionRate: prediction.predictedImpact?.completionRate?.predicted    || baseline.completionRate * 1.15,
      avgTime:        prediction.predictedImpact?.avgCompletionTime?.predicted || baseline.avgTime * 0.85,
      dropOffRate:    prediction.predictedImpact?.dropOffRate?.predicted       || baseline.dropOffRate * 0.75,
      frictionScore:  prediction.predictedImpact?.frictionScore?.predicted     || baseline.frictionScore * 0.70,
    };
    return { baseline, modified, deltas: calculateDeltas(baseline, modified) };
  };

  const calculateDeltas = (baseline, modified) => ({
    completionRate: modified.completionRate - baseline.completionRate,
    avgTime:        modified.avgTime        - baseline.avgTime,
    dropOffRate:    modified.dropOffRate    - baseline.dropOffRate,
    frictionScore:  modified.frictionScore  - baseline.frictionScore,
  });

  const generateCombinedFallbackPrediction = (modifications) => {
    let completionRate = 0.65, avgTime = 45000, dropOffRate = 0.35, frictionScore = 0.42;

    modifications.forEach(mod => {
      switch (mod.type) {
        case 'remove_step':         completionRate += 0.08; avgTime -= 5000;  dropOffRate -= 0.08; frictionScore -= 0.10; break;
        case 'add_verification':    completionRate -= 0.03; avgTime += 3000;  dropOffRate += 0.03; frictionScore += 0.05; break;
        case 'reduce_fields':       completionRate += 0.12; avgTime -= 8000;  dropOffRate -= 0.10; frictionScore -= 0.12; break;
        case 'add_help_text':       completionRate += 0.05; avgTime -= 2000;  dropOffRate -= 0.04; frictionScore -= 0.06; break;
        case 'improve_performance': completionRate += 0.06; avgTime -= 10000; dropOffRate -= 0.05; frictionScore -= 0.08; break;
        case 'simplify_ui':         completionRate += 0.10; avgTime -= 6000;  dropOffRate -= 0.08; frictionScore -= 0.11; break;
        default:                    completionRate += 0.03; avgTime -= 2000;  dropOffRate -= 0.02; frictionScore -= 0.03;
      }
    });

    completionRate = Math.min(0.95, Math.max(0.40, completionRate));
    avgTime        = Math.max(15000, avgTime);
    dropOffRate    = Math.min(0.60, Math.max(0.05, dropOffRate));
    frictionScore  = Math.min(0.80, Math.max(0.10, frictionScore));

    const base = { completionRate: 0.65, avgTime: 45000, dropOffRate: 0.35, frictionScore: 0.42 };
    const completionChange = ((completionRate - base.completionRate) * 100).toFixed(0);
    const timeChange       = ((avgTime - base.avgTime) / 1000).toFixed(1);

    return {
      predictedImpact: {
        completionRate:    { current: base.completionRate, predicted: parseFloat(completionRate.toFixed(2)), change: `${completionChange > 0 ? '+' : ''}${completionChange}%`, direction: completionChange >= 0 ? 'positive' : 'negative' },
        avgCompletionTime: { current: base.avgTime,        predicted: Math.round(avgTime),                  change: `${timeChange > 0 ? '+' : ''}${timeChange}s`,             direction: timeChange <= 0 ? 'positive' : 'negative' },
        dropOffRate:       { current: base.dropOffRate,    predicted: parseFloat(dropOffRate.toFixed(2)),   change: `${((dropOffRate - base.dropOffRate) * 100).toFixed(0)}%`,  direction: dropOffRate <= base.dropOffRate ? 'positive' : 'negative' },
        frictionScore:     { current: base.frictionScore,  predicted: parseFloat(frictionScore.toFixed(2)), change: `${(frictionScore - base.frictionScore).toFixed(2)}`,        direction: frictionScore <= base.frictionScore ? 'positive' : 'negative' },
        confidence: modifications.length <= 2 ? 'high' : modifications.length <= 4 ? 'medium' : 'low',
      },
    };
  };

  const generateSimulatedResults = (modifications) =>
    generateResultsFromPrediction(generateCombinedFallbackPrediction(modifications));

  const modCount = modifiedScenario.modifications.length;

  return (
    <div className="st-root">
      {/* ── Atmospheric background ── */}
      <div className="st-bg-orb st-orb-1" />
      <div className="st-bg-orb st-orb-2" />
      <div className="st-bg-orb st-orb-3" />

      {/* ── Page Header ── */}
      <header className="st-header">
        <div className="st-header-left">
          <div className="st-header-eyebrow">
            <span className="st-eyebrow-dot" />
            Hypothesis Engine
          </div>
          <h1 className="st-title">Scenario <em>Testing</em></h1>
          <p className="st-subtitle">Experiment with hypothetical flow modifications</p>
        </div>
        <div className="st-header-right">
          {modCount > 0 && (
            <div className="st-mod-counter">
              <span className="st-mod-count">{modCount}</span>
              <span className="st-mod-label">modification{modCount !== 1 ? 's' : ''} staged</span>
            </div>
          )}
          <div className="st-tabs">
            {['build', 'results'].map(t => (
              <button
                key={t}
                className={`st-tab ${activeTab === t ? 'active' : ''}`}
                onClick={() => setActiveTab(t)}
              >
                {t === 'build' ? '🔧 Build' : '📊 Results'}
                {t === 'results' && comparisonResults && <span className="st-tab-pip" />}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════ BUILD ════════════════════════════════════ */}
      {activeTab === 'build' && (
        <div className="st-build-layout">

          {/* ── Left column ── */}
          <div className="st-col-left">

            {/* Baseline selector */}
            <div className="st-card">
              <div className="st-card-header">
                <span className="st-card-icon">📊</span>
                <h3 className="st-card-title">Baseline Scenario</h3>
                <span className="st-card-badge">COMPARE</span>
              </div>
              <p className="st-card-hint">Current onboarding flow to compare against</p>
              <div className="st-select-wrap">
                <select
                  value={baselineScenario}
                  onChange={e => setBaselineScenario(e.target.value)}
                  className="st-select"
                >
                  {scenarios.length > 0 ? scenarios.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  )) : (
                    <option value="baseline">Baseline Flow</option>
                  )}
                </select>
                <span className="st-select-arrow">▾</span>
              </div>
            </div>

            {/* How it works */}
            <div className="st-card st-how-card">
              <div className="st-card-header">
                <span className="st-card-icon">ℹ️</span>
                <h3 className="st-card-title">How It Works</h3>
              </div>
              <ol className="st-how-list">
                {[
                  'Select a baseline scenario to compare against',
                  'Add hypothetical modifications to the flow',
                  'Run virtual simulation with modified flow',
                  'Compare metrics: completion rate, time, friction',
                  'No actual portal changes are made',
                ].map((item, i) => (
                  <li key={i} className="st-how-item">
                    <span className="st-how-num">{i + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="st-col-right">

            {/* Modification builder */}
            <div className="st-card st-mod-card">
              <div className="st-card-header">
                <span className="st-card-icon">🔧</span>
                <h3 className="st-card-title">Flow Modifications</h3>
                <span className="st-card-badge">STEP 2</span>
              </div>
              <p className="st-card-hint">Click to stage modifications — AI predictions fire automatically</p>

              <div className="st-mod-palette">
                {Object.entries(MODIFICATION_CONFIG).map(([type, cfg]) => {
                  const alreadyAdded = modifiedScenario.modifications.some(m => m.type === type);
                  return (
                    <button
                      key={type}
                      className={`st-mod-chip ${alreadyAdded ? 'staged' : ''}`}
                      onClick={() => addModification(type)}
                      style={{ '--chip-color': cfg.color }}
                    >
                      <span className="st-mod-chip-emoji">{cfg.emoji}</span>
                      <span className="st-mod-chip-label">{cfg.label}</span>
                      {alreadyAdded && <span className="st-mod-chip-check">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Staged list */}
              <div className="st-staged-wrap">
                <div className="st-staged-header">
                  <span className="st-staged-label">Staged modifications</span>
                  {modCount > 0 && <span className="st-staged-count">{modCount}</span>}
                </div>
                <div className="st-staged-list">
                  {modCount > 0 ? modifiedScenario.modifications.map((mod, idx) => {
                    const cfg = MODIFICATION_CONFIG[mod.type] || { emoji: '⚙️', color: '#868e96' };
                    return (
                      <div
                        key={mod.id}
                        className="st-staged-item"
                        style={{ '--item-color': cfg.color, animationDelay: `${idx * 0.05}s` }}
                      >
                        <span className="st-staged-emoji">{cfg.emoji}</span>
                        <span className="st-staged-desc">{mod.description}</span>
                        <button className="st-staged-remove" onClick={() => removeModification(mod.id)} aria-label="Remove">✕</button>
                      </div>
                    );
                  }) : (
                    <div className="st-staged-empty">
                      <span className="st-staged-empty-icon">🧪</span>
                      <span>No modifications staged yet</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                className={`st-run-btn ${isRunning ? 'running' : ''} ${modCount === 0 ? 'disabled' : ''}`}
                onClick={runComparison}
                disabled={isRunning || modCount === 0}
              >
                {isRunning ? (
                  <><span className="st-btn-spinner" /> Running comparison…</>
                ) : (
                  <><span className="st-btn-icon">▶</span> Run Comparison</>
                )}
                <span className="st-btn-sweep" />
              </button>
            </div>

            {/* AI Prediction */}
            {(aiPrediction || isPredicting) && (
              <div className="st-card st-ai-card">
                <div className="st-card-header">
                  <span className="st-card-icon">🔮</span>
                  <h3 className="st-card-title">AI Impact Prediction</h3>
                  {isPredicting && <span className="st-predicting-badge">Analysing…</span>}
                </div>

                {isPredicting ? (
                  <div className="st-pred-loading">
                    <div className="st-pred-dots">
                      <span /><span /><span />
                    </div>
                    <span>Modeling impact across merchant personas…</span>
                  </div>
                ) : aiPrediction && (
                  <>
                    <div className="st-pred-metrics">
                      {aiPrediction.predictedImpact?.completionRate && (
                        <PredMetric
                          label="Completion Rate"
                          current={(aiPrediction.predictedImpact.completionRate.current * 100).toFixed(1) + '%'}
                          predicted={(aiPrediction.predictedImpact.completionRate.predicted * 100).toFixed(1) + '%'}
                          change={aiPrediction.predictedImpact.completionRate.change}
                          dir={aiPrediction.predictedImpact.completionRate.direction}
                        />
                      )}
                      {aiPrediction.predictedImpact?.avgCompletionTime && (
                        <PredMetric
                          label="Avg Completion Time"
                          current={(aiPrediction.predictedImpact.avgCompletionTime.current / 1000).toFixed(1) + 's'}
                          predicted={(aiPrediction.predictedImpact.avgCompletionTime.predicted / 1000).toFixed(1) + 's'}
                          change={aiPrediction.predictedImpact.avgCompletionTime.change}
                          dir={aiPrediction.predictedImpact.avgCompletionTime.direction}
                        />
                      )}
                    </div>

                    {aiPrediction.riskAssessment && (
                      <div className={`st-risk st-risk-${aiPrediction.riskAssessment.overallRisk}`}>
                        <div className="st-risk-header">
                          <span>{aiPrediction.riskAssessment.overallRisk === 'high' ? '🔴' : aiPrediction.riskAssessment.overallRisk === 'medium' ? '🟡' : '🟢'}</span>
                          <span className="st-risk-level">{aiPrediction.riskAssessment.overallRisk.toUpperCase()} RISK</span>
                        </div>
                        <p className="st-risk-rec">{aiPrediction.riskAssessment.recommendation}</p>
                      </div>
                    )}

                    {aiPrediction.personaImpact?.length > 0 && (
                      <div className="st-persona-block">
                        <div className="st-block-title">👥 Persona Impact</div>
                        {aiPrediction.personaImpact.map((impact, i) => (
                          <div key={i} className="st-persona-item">
                            <div className="st-persona-name">{impact.persona}</div>
                            <div className="st-persona-desc">{impact.impact}</div>
                            <div className="st-persona-improvement">{impact.expectedImprovement}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {aiPrediction.recommendations?.length > 0 && (
                      <div className="st-recs-block">
                        <div className="st-block-title">💡 Recommendations</div>
                        {aiPrediction.recommendations.map((rec, i) => (
                          <div key={i} className={`st-rec-item st-rec-${rec.priority}`}>
                            <div className="st-rec-priority">{rec.priority}</div>
                            <div>
                              <div className="st-rec-title">{rec.title}</div>
                              <div className="st-rec-desc">{rec.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="st-confidence">
                      Confidence: <strong>{aiPrediction.predictedImpact?.confidence || 'medium'}</strong>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════ RESULTS ════════════════════════════════════ */}
      {activeTab === 'results' && (
        <div className="st-results-layout">
          {isRunning && (
            <div className="st-running-banner">
              <span className="st-running-spinner" />
              <span>Running virtual simulation…</span>
              <div className="st-running-track">
                <div className="st-running-fill" style={{ width: `${runProgress}%` }} />
              </div>
              <span className="st-running-pct">{runProgress}%</span>
            </div>
          )}

          {!comparisonResults && !isRunning && (
            <div className="st-results-empty">
              <div className="st-results-empty-icon">📊</div>
              <h3>No results yet</h3>
              <p>Build your scenario and run a comparison</p>
              <button className="st-go-build" onClick={() => setActiveTab('build')}>← Back to Build</button>
            </div>
          )}

          {comparisonResults && (
            <>
              <div className="st-results-grid">
                <ComparisonMetric label="Completion Rate" baseline={comparisonResults.baseline.completionRate} modified={comparisonResults.modified.completionRate} delta={comparisonResults.deltas.completionRate} format="percentage" higherIsBetter={true} />
                <ComparisonMetric label="Avg Time"        baseline={comparisonResults.baseline.avgTime}        modified={comparisonResults.modified.avgTime}        delta={comparisonResults.deltas.avgTime}        format="time"       higherIsBetter={false} />
                <ComparisonMetric label="Drop-off Rate"   baseline={comparisonResults.baseline.dropOffRate}    modified={comparisonResults.modified.dropOffRate}    delta={comparisonResults.deltas.dropOffRate}    format="percentage" higherIsBetter={false} />
                <ComparisonMetric label="Friction Score"  baseline={comparisonResults.baseline.frictionScore}  modified={comparisonResults.modified.frictionScore}  delta={comparisonResults.deltas.frictionScore}  format="decimal"    higherIsBetter={false} />
              </div>

              <div className="st-summary-card">
                <div className="st-summary-header">
                  <span className="st-summary-icon">📋</span>
                  <h3>Summary</h3>
                </div>
                <p className="st-summary-text">
                  The modified flow shows{' '}
                  <strong className={comparisonResults.deltas.completionRate > 0 ? 'pos' : 'neg'}>
                    {comparisonResults.deltas.completionRate > 0 ? 'improved' : 'decreased'}
                  </strong>{' '}
                  completion rate and{' '}
                  <strong className={comparisonResults.deltas.frictionScore < 0 ? 'pos' : 'neg'}>
                    {comparisonResults.deltas.frictionScore < 0 ? 'reduced' : 'increased'}
                  </strong>{' '}
                  friction. Time to completion{' '}
                  <strong className={comparisonResults.deltas.avgTime < 0 ? 'pos' : 'neg'}>
                    {comparisonResults.deltas.avgTime < 0 ? 'decreased' : 'increased'}
                  </strong>{' '}
                  by {Math.abs(comparisonResults.deltas.avgTime / 1000).toFixed(1)}s.
                </p>
                <button className="st-refine-btn" onClick={() => setActiveTab('build')}>← Refine Scenario</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── PredMetric ─────────────────────────────────────────────────────────────────
function PredMetric({ label, current, predicted, change, dir }) {
  const isPos = dir === 'positive';
  return (
    <div className="st-pred-metric">
      <div className="st-pred-metric-label">{label}</div>
      <div className="st-pred-metric-row">
        <span className="st-pred-current">{current}</span>
        <span className="st-pred-arrow">→</span>
        <span className={`st-pred-predicted ${isPos ? 'pos' : 'neg'}`}>{predicted}</span>
        <span className={`st-pred-change ${isPos ? 'pos' : 'neg'}`}>{change}</span>
      </div>
    </div>
  );
}

// ── ComparisonMetric ───────────────────────────────────────────────────────────
function ComparisonMetric({ label, baseline, modified, delta, format, higherIsBetter }) {
  const fmt = (v) => {
    if (v == null) return 'N/A';
    if (format === 'percentage') return `${(v * 100).toFixed(1)}%`;
    if (format === 'time')       return `${(v / 1000).toFixed(1)}s`;
    if (format === 'decimal')    return v.toFixed(2);
    return v;
  };
  const fmtDelta = (v) => {
    if (v == null) return 'N/A';
    const p = v > 0 ? '+' : '';
    if (format === 'percentage') return `${p}${(v * 100).toFixed(1)}%`;
    if (format === 'time')       return `${p}${(v / 1000).toFixed(1)}s`;
    if (format === 'decimal')    return `${p}${v.toFixed(2)}`;
    return `${p}${v}`;
  };

  const isImprovement = higherIsBetter ? delta > 0 : delta < 0;
  // Progress bar: baseline fills to width, modified overlaid
  const baseW = baseline != null ? (format === 'percentage' ? baseline * 100 : Math.min(100, (baseline / 60000) * 100)) : 0;
  const modW  = modified  != null ? (format === 'percentage' ? modified  * 100 : Math.min(100, (modified  / 60000) * 100)) : 0;

  return (
    <div className={`st-cmp-card ${isImprovement ? 'win' : 'lose'}`}>
      <div className="st-cmp-label">{label}</div>
      <div className="st-cmp-values">
        <div className="st-cmp-col">
          <div className="st-cmp-col-tag">Baseline</div>
          <div className="st-cmp-col-val baseline-val">{fmt(baseline)}</div>
          <div className="st-cmp-bar-track">
            <div className="st-cmp-bar baseline-bar" style={{ width: `${baseW}%` }} />
          </div>
        </div>
        <div className="st-cmp-divider">→</div>
        <div className="st-cmp-col">
          <div className="st-cmp-col-tag">Modified</div>
          <div className="st-cmp-col-val modified-val">{fmt(modified)}</div>
          <div className="st-cmp-bar-track">
            <div className={`st-cmp-bar modified-bar ${isImprovement ? 'good' : 'bad'}`} style={{ width: `${modW}%` }} />
          </div>
        </div>
      </div>
      <div className={`st-cmp-delta ${isImprovement ? 'pos' : 'neg'}`}>
        {isImprovement ? '↑' : '↓'} {fmtDelta(delta)}
      </div>
    </div>
  );
}

export default ScenarioTesting;