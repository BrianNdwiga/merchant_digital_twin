import React, { useState, useEffect, useRef } from 'react';

// ─── Inline Styles (replaces Dashboard.css) ───────────────────────────────────
const COLORS = {
  primary: '#00a651',
  primaryDark: '#008a44',
  primaryGlow: 'rgba(0,166,81,0.35)',
  primaryFaint: 'rgba(0,166,81,0.08)',
  bg: '#080d10',
  surface: '#0e1619',
  surfaceAlt: '#111a1e',
  border: '#1a2d25',
  borderBright: '#1e3d2e',
  text: '#e2f0e8',
  textMuted: '#6b8c78',
  textSub: '#3d5c4a',
  purple: '#7c5cfc',
  purpleDark: '#5a3fd4',
  purpleGlow: 'rgba(124,92,252,0.3)',
  warn: '#f59e0b',
  danger: '#ef4444',
  success: '#4ade80',
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Nunito:wght@400;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: ${COLORS.bg}; color: ${COLORS.text}; font-family: 'Nunito', sans-serif; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(1.6); opacity: 0; }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes scanline {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes floatDot {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 10px ${COLORS.primaryGlow}; }
    50% { box-shadow: 0 0 30px ${COLORS.primaryGlow}, 0 0 60px rgba(0,166,81,0.15); }
  }
  @keyframes countUp {
    from { opacity: 0; transform: scale(0.7); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes borderTrace {
    0%   { clip-path: inset(0 100% 100% 0); }
    25%  { clip-path: inset(0 0 100% 0); }
    50%  { clip-path: inset(0 0 0 100%); }
    75%  { clip-path: inset(100% 0 0 0); }
    100% { clip-path: inset(0 100% 100% 0); }
  }

  .dashboard { max-width: 1440px; margin: 0 auto; padding: 2.5rem 2rem; animation: fadeIn 0.4s ease; position: relative; overflow: hidden; }
  .dashboard::before {
    content: '';
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse 60% 40% at 20% 10%, rgba(0,166,81,0.04) 0%, transparent 70%),
                radial-gradient(ellipse 40% 60% at 80% 80%, rgba(124,92,252,0.04) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
  .dashboard > * { position: relative; z-index: 1; }

  /* ── HEADER ── */
  .db-header { margin-bottom: 2.5rem; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
  .db-header-left h2 { font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 800; letter-spacing: -0.03em; color: ${COLORS.text}; line-height: 1.1; }
  .db-header-left h2 span { color: ${COLORS.primary}; }
  .db-header-left p { color: ${COLORS.textMuted}; font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 0.35rem; font-family: 'DM Mono', monospace; }
  .live-badge { display: flex; align-items: center; gap: 0.5rem; background: ${COLORS.primaryFaint}; border: 1px solid ${COLORS.border}; border-radius: 100px; padding: 0.4rem 1rem; font-size: 0.75rem; font-weight: 600; color: ${COLORS.primary}; font-family: 'DM Mono', monospace; letter-spacing: 0.06em; }
  .live-dot { width: 8px; height: 8px; border-radius: 50%; background: ${COLORS.primary}; position: relative; }
  .live-dot::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; background: ${COLORS.primary}; animation: pulse-ring 1.5s ease-out infinite; }

  /* ── METRICS GRID ── */
  .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
  .metric-card {
    background: ${COLORS.surface};
    border: 1px solid ${COLORS.border};
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    cursor: default;
    position: relative;
    overflow: hidden;
    animation: fadeSlideUp 0.5s ease both;
  }
  .metric-card::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 60%); pointer-events: none; }
  .metric-card:nth-child(1) { animation-delay: 0.05s; }
  .metric-card:nth-child(2) { animation-delay: 0.1s; }
  .metric-card:nth-child(3) { animation-delay: 0.15s; }
  .metric-card:nth-child(4) { animation-delay: 0.2s; }
  .metric-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${COLORS.borderBright}; border-color: ${COLORS.borderBright}; }
  .metric-icon-wrap { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
  .metric-label { font-size: 0.7rem; color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 0.1em; font-family: 'DM Mono', monospace; margin-bottom: 0.3rem; }
  .metric-value { font-size: 1.9rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1; animation: countUp 0.4s ease both; }
  .metric-subtitle { font-size: 0.7rem; color: ${COLORS.textMuted}; margin-top: 0.2rem; font-family: 'DM Mono', monospace; }

  /* ── CTA BUTTON ── */
  .cta-button {
    display: inline-flex; align-items: center; gap: 0.75rem;
    padding: 0.875rem 1.75rem;
    background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%);
    color: white; border: none; border-radius: 12px;
    font-size: 0.95rem; font-weight: 700; cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 4px 20px ${COLORS.primaryGlow};
    font-family: 'Nunito', sans-serif;
    letter-spacing: 0.02em;
    margin-bottom: 1.5rem;
    animation: fadeSlideUp 0.5s 0.25s ease both;
  }
  .cta-button:hover { transform: translateY(-3px); box-shadow: 0 8px 32px ${COLORS.primaryGlow}; }
  .cta-button:active { transform: translateY(0); }
  .cta-button.secondary { background: linear-gradient(135deg, ${COLORS.purple} 0%, ${COLORS.purpleDark} 100%); box-shadow: 0 4px 20px ${COLORS.purpleGlow}; }
  .cta-button.secondary:hover { box-shadow: 0 8px 32px ${COLORS.purpleGlow}; }
  .cta-icon { font-size: 1.1rem; }

  /* ── DASHBOARD SECTION ── */
  .dashboard-section {
    background: ${COLORS.surface};
    border: 1px solid ${COLORS.border};
    border-radius: 16px;
    padding: 1.75rem;
    margin-bottom: 1.25rem;
    animation: fadeSlideUp 0.5s ease both;
    transition: border-color 0.3s;
  }
  .dashboard-section:hover { border-color: ${COLORS.borderBright}; }
  .section-header { display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 0.4rem; }
  .dashboard-section h3 { font-size: 1rem; font-weight: 700; color: ${COLORS.text}; letter-spacing: 0.01em; }
  .section-tag { font-size: 0.65rem; padding: 0.2rem 0.6rem; border-radius: 100px; background: ${COLORS.primaryFaint}; color: ${COLORS.primary}; font-family: 'DM Mono', monospace; letter-spacing: 0.06em; border: 1px solid ${COLORS.border}; }
  .section-desc { color: ${COLORS.textMuted}; font-size: 0.78rem; margin-bottom: 1.25rem; font-family: 'DM Mono', monospace; letter-spacing: 0.04em; }

  /* ── SCENARIOS ── */
  .scenarios-list { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1.25rem; }
  .scenario-chip {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.5rem 1rem; border: 1.5px solid ${COLORS.border};
    border-radius: 10px; background: ${COLORS.surfaceAlt};
    cursor: pointer; transition: all 0.2s ease;
    color: ${COLORS.textMuted}; font-size: 0.82rem; font-weight: 600;
    font-family: 'DM Mono', monospace;
  }
  .scenario-chip:hover { border-color: ${COLORS.purple}; color: ${COLORS.text}; background: rgba(124,92,252,0.08); transform: translateY(-2px); }
  .scenario-chip.selected { border-color: ${COLORS.purple}; background: rgba(124,92,252,0.15); color: #c4b5fd; }
  .chip-icon { font-size: 0.9rem; }
  .compare-btn {
    padding: 0.65rem 1.5rem; background: ${COLORS.purple}; color: white;
    border: none; border-radius: 10px; font-weight: 700; cursor: pointer;
    transition: all 0.2s ease; font-family: 'Nunito', sans-serif; font-size: 0.875rem;
  }
  .compare-btn:hover { background: ${COLORS.purpleDark}; transform: translateY(-2px); box-shadow: 0 6px 20px ${COLORS.purpleGlow}; }

  /* ── COMPARISON ── */
  .comparison-results { margin-top: 1.5rem; animation: fadeSlideUp 0.4s ease both; }
  .comparison-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
  .comparison-card { background: ${COLORS.surfaceAlt}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 1rem; transition: border-color 0.2s; }
  .comparison-card:hover { border-color: ${COLORS.borderBright}; }
  .comparison-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid ${COLORS.border}; }
  .comparison-label { font-size: 0.7rem; color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 0.08em; font-family: 'DM Mono', monospace; }
  .comparison-id { font-weight: 700; color: ${COLORS.text}; font-size: 0.85rem; }
  .comparison-stats { display: flex; flex-direction: column; gap: 0.5rem; }
  .recommendation { padding: 1rem 1.25rem; background: rgba(124,92,252,0.1); border: 1px solid rgba(124,92,252,0.25); border-radius: 10px; text-align: center; color: ${COLORS.text}; font-size: 0.875rem; }
  .confidence { margin-left: 0.5rem; padding: 0.2rem 0.6rem; background: ${COLORS.purple}; color: white; border-radius: 6px; font-size: 0.75rem; font-weight: 700; font-family: 'DM Mono', monospace; }

  /* ── BREAKDOWN ── */
  .breakdown-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
  .breakdown-card { background: ${COLORS.surfaceAlt}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 1.1rem; transition: all 0.25s ease; }
  .breakdown-card:hover { border-color: ${COLORS.borderBright}; transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.35); }
  .breakdown-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid ${COLORS.border}; }
  .breakdown-icon { font-size: 1.1rem; }
  .breakdown-title { font-size: 0.82rem; font-weight: 700; color: ${COLORS.text}; }
  .stat-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; padding: 0.25rem 0; }
  .stat-label { color: ${COLORS.textMuted}; font-family: 'DM Mono', monospace; }
  .stat-value { font-weight: 600; color: ${COLORS.text}; font-family: 'DM Mono', monospace; font-size: 0.82rem; }

  /* ── PROGRESS BAR ── */
  .progress-bar-wrap { height: 4px; border-radius: 100px; background: ${COLORS.surfaceAlt}; overflow: hidden; margin-top: 0.5rem; border: 1px solid ${COLORS.border}; }
  .progress-bar-fill { height: 100%; border-radius: 100px; transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); }

  /* ── LOADING ── */
  .dashboard-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 1.5rem; }
  .loader-ring { width: 52px; height: 52px; border: 3px solid ${COLORS.border}; border-top-color: ${COLORS.primary}; border-radius: 50%; animation: spin 0.9s linear infinite; }
  .dashboard-loading p { color: ${COLORS.textMuted}; font-family: 'DM Mono', monospace; font-size: 0.8rem; letter-spacing: 0.08em; }

  /* ── ERROR ── */
  .dashboard-error { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; text-align: center; gap: 1rem; }
  .error-icon { font-size: 3.5rem; }
  .dashboard-error h3 { font-size: 1.4rem; color: ${COLORS.text}; }
  .dashboard-error p { color: ${COLORS.textMuted}; font-size: 0.875rem; max-width: 360px; }
  .retry-button { background: ${COLORS.primary}; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'Nunito', sans-serif; }
  .retry-button:hover { background: ${COLORS.primaryDark}; transform: translateY(-2px); box-shadow: 0 6px 20px ${COLORS.primaryGlow}; }

  /* ── EMPTY / WELCOME ── */
  .dashboard-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; text-align: center; padding: 3rem 1.5rem; }
  .dashboard-empty h3 { font-size: clamp(1.6rem, 3vw, 2.5rem); font-weight: 800; letter-spacing: -0.03em; color: ${COLORS.text}; margin-bottom: 0.5rem; }
  .dashboard-empty h3 span { color: ${COLORS.primary}; }
  .welcome-subtitle { font-size: 0.875rem; color: ${COLORS.textMuted}; margin-bottom: 3rem; font-family: 'DM Mono', monospace; letter-spacing: 0.04em; }
  .flow-diagram { display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin: 2rem 0 3rem; flex-wrap: wrap; }
  .flow-step { display: flex; flex-direction: column; align-items: center; gap: 0.7rem; padding: 1.5rem 1.25rem; background: ${COLORS.surface}; border: 1.5px solid ${COLORS.border}; border-radius: 16px; min-width: 110px; transition: all 0.3s ease; cursor: default; }
  .flow-step:hover { border-color: ${COLORS.primary}; transform: translateY(-6px); box-shadow: 0 12px 32px ${COLORS.primaryGlow}; }
  .flow-icon { font-size: 2rem; animation: floatDot 3s ease-in-out infinite; }
  .flow-step:nth-child(3) .flow-icon { animation-delay: 0.5s; }
  .flow-step:nth-child(5) .flow-icon { animation-delay: 1s; }
  .flow-step:nth-child(7) .flow-icon { animation-delay: 1.5s; }
  .flow-label { font-size: 0.75rem; font-weight: 700; color: ${COLORS.text}; text-align: center; }
  .flow-arrow { font-size: 1.25rem; color: ${COLORS.primary}; font-weight: bold; opacity: 0.6; }
  .info-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-top: 2rem; max-width: 900px; width: 100%; }
  .info-card { background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 14px; padding: 1.5rem; text-align: left; transition: all 0.3s ease; cursor: default; }
  .info-card:hover { border-color: ${COLORS.borderBright}; transform: translateY(-4px); box-shadow: 0 10px 32px rgba(0,0,0,0.35); }
  .info-icon { font-size: 2rem; margin-bottom: 0.75rem; }
  .info-card h4 { font-size: 0.95rem; font-weight: 700; color: ${COLORS.text}; margin-bottom: 0.5rem; }
  .info-card p { font-size: 0.8rem; color: ${COLORS.textMuted}; line-height: 1.65; }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .dashboard { padding: 1.5rem 1rem; }
    .metrics-grid { grid-template-columns: repeat(2, 1fr); }
    .comparison-grid { grid-template-columns: 1fr; }
    .flow-diagram { flex-direction: column; gap: 0.5rem; }
    .flow-arrow { transform: rotate(90deg); }
    .info-cards { grid-template-columns: 1fr; }
    .breakdown-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 480px) {
    .metrics-grid { grid-template-columns: 1fr; }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getScoreColor = (score) => {
  if (score >= 0.8) return COLORS.success;
  if (score >= 0.6) return COLORS.warn;
  if (score >= 0.4) return '#fb923c';
  return COLORS.danger;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, icon, color, subtitle, delay = 0 }) {
  return (
    <div className="metric-card" style={{ animationDelay: `${delay}s` }}>
      <div className="metric-icon-wrap" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <span style={{ fontSize: '1.4rem' }}>{icon}</span>
      </div>
      <div>
        <div className="metric-label">{label}</div>
        <div className="metric-value" style={{ color }}>{value}</div>
        {subtitle && <div className="metric-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

function BreakdownCard({ title, data, icon }) {
  const rate = data.successRate ?? 0;
  const rateColor = getScoreColor(rate);
  return (
    <div className="breakdown-card">
      <div className="breakdown-header">
        <span className="breakdown-icon">{icon}</span>
        <span className="breakdown-title">{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div className="stat-row">
          <span className="stat-label">Merchants</span>
          <span className="stat-value">{data.totalMerchants}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Success</span>
          <span className="stat-value" style={{ color: rateColor }}>
            {rate != null ? (rate * 100).toFixed(1) : '0'}%
          </span>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${rate * 100}%`, background: `linear-gradient(90deg, ${rateColor}88, ${rateColor})` }} />
        </div>
        <div className="stat-row" style={{ marginTop: '0.25rem' }}>
          <span className="stat-label">Avg Attempts</span>
          <span className="stat-value">{data.avgAttempts != null ? data.avgAttempts.toFixed(1) : '—'}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Exp Score</span>
          <span className="stat-value">{data.avgExperienceScore != null ? data.avgExperienceScore.toFixed(2) : '—'}</span>
        </div>
      </div>
    </div>
  );
}

function ComparisonCard({ scenario, label }) {
  return (
    <div className="comparison-card">
      <div className="comparison-header">
        <span className="comparison-label">{label}</span>
        <span className="comparison-id">{scenario.id}</span>
      </div>
      <div className="comparison-stats">
        <div className="stat-row">
          <span className="stat-label">Success Rate</span>
          <span className="stat-value" style={{ color: COLORS.primary }}>{scenario.successRatePercent}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Avg Time</span>
          <span className="stat-value">{scenario.averageCompletionTimeSec}s</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Experience</span>
          <span className="stat-value">{scenario.experienceScore != null ? scenario.experienceScore.toFixed(2) : '—'}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function Dashboard({ onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [byNetwork, setByNetwork] = useState(null);
  const [byLiteracy, setByLiteracy] = useState(null);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const styleInjected = useRef(false);

  useEffect(() => {
    if (!styleInjected.current) {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
      styleInjected.current = true;
    }
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, scenariosRes, networkRes, literacyRes] = await Promise.all([
        fetch('http://localhost:3000/insights/summary'),
        fetch('http://localhost:3000/insights/scenarios'),
        fetch('http://localhost:3000/insights/by-network'),
        fetch('http://localhost:3000/insights/by-literacy'),
      ]);
      setSummary(await summaryRes.json());
      const sc = await scenariosRes.json();
      setScenarios(sc.scenarios || []);
      setByNetwork(await networkRes.json());
      setByLiteracy(await literacyRes.json());
      setLoading(false);
      setError(null);
    } catch {
      setError('Failed to fetch dashboard data. Make sure services are running.');
      setLoading(false);
    }
  };

  const toggleScenario = (scenario) => {
    if (selectedScenarios.includes(scenario)) {
      setSelectedScenarios(selectedScenarios.filter(s => s !== scenario));
    } else if (selectedScenarios.length < 2) {
      setSelectedScenarios([...selectedScenarios, scenario]);
    } else {
      setSelectedScenarios([selectedScenarios[1], scenario]);
    }
  };

  const compareScenarios = async () => {
    if (selectedScenarios.length !== 2) return;
    try {
      const [a, b] = selectedScenarios;
      const res = await fetch(`http://localhost:3000/insights/compare?scenarioA=${a}&scenarioB=${b}`);
      setComparison(await res.json());
    } catch (err) {
      console.error('Failed to compare scenarios:', err);
    }
  };

  // ── Loading ──
  if (loading) return (
    <div className="dashboard-loading">
      <div className="loader-ring" />
      <p>Loading dashboard data…</p>
    </div>
  );

  // ── Error ──
  if (error) return (
    <div className="dashboard-error">
      <div className="error-icon">⚠️</div>
      <h3>Connection Error</h3>
      <p>{error}</p>
      <button onClick={fetchDashboardData} className="retry-button">Retry Connection</button>
    </div>
  );

  // ── Empty / Welcome ──
  if (!summary || (summary.totalMerchants === 0 && !scenarios.length)) return (
    <div className="dashboard-empty">
      <h3>Merchant <span>Twin</span> Simulation</h3>
      <p className="welcome-subtitle">// ai-powered decision intelligence for onboarding optimization</p>
      <div className="flow-diagram">
        {[['📊','CSV Upload'],['🤖','AI Merchants'],['🌐','Onboarding Portal'],['💡','Insights']].map(([icon, label], i) => (
          <React.Fragment key={label}>
            <div className="flow-step">
              <div className="flow-icon">{icon}</div>
              <div className="flow-label">{label}</div>
            </div>
            {i < 3 && <div className="flow-arrow">→</div>}
          </React.Fragment>
        ))}
      </div>
      <button className="cta-button" onClick={() => onNavigate('console')}>
        <span className="cta-icon">▶</span> Start Simulation
      </button>
      <div className="info-cards">
        {[
          ['🎭','Synthetic Merchants','AI agents simulate real merchant personas with varying digital literacy and network conditions'],
          ['📈','Live Monitoring','Watch merchants navigate your onboarding flow in real-time and detect friction points'],
          ['🔮','AI Recommendations','Get actionable insights to improve completion rates and reduce drop-offs'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="info-card">
            <div className="info-icon">{icon}</div>
            <h4>{title}</h4>
            <p>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const successColor = getScoreColor(summary.successRate);
  const dropRate = ((1 - summary.successRate) * 100).toFixed(1);

  // ── Main Dashboard ──
  return (
    <div className="dashboard">
      {/* Header */}
      <div className="db-header">
        <div className="db-header-left">
          <h2>Simulation <span>Dashboard</span></h2>
          <p>// real-time merchant onboarding insights</p>
        </div>
        <div className="live-badge">
          <div className="live-dot" />
          LIVE · auto-refresh 5s
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <MetricCard label="Merchants Loaded" value={summary.totalMerchants} icon="🏪" color={COLORS.primary} delay={0.05} />
        <MetricCard label="Active Agents" value={summary.totalMerchants} icon="🤖" color={COLORS.purple} subtitle="Simulating journeys" delay={0.1} />
        <MetricCard label="Success Rate" value={summary.successRatePercent} icon="✅" color={successColor} delay={0.15} />
        <MetricCard label="Drop-off Rate" value={`${dropRate}%`} icon="⚠️" color={summary.successRate >= 0.8 ? COLORS.success : COLORS.danger} delay={0.2} />
      </div>

      <button className="cta-button secondary" onClick={() => onNavigate('console')}>
        <span className="cta-icon">▶</span> Run New Simulation
      </button>

      {/* Scenarios */}
      {scenarios.length > 0 && (
        <div className="dashboard-section" style={{ animationDelay: '0.25s' }}>
          <div className="section-header">
            <h3>Scenario Comparison</h3>
            <span className="section-tag">COMPARE</span>
          </div>
          <p className="section-desc">// select two scenarios to compare performance</p>
          <div className="scenarios-list">
            {scenarios.map(s => (
              <button key={s} className={`scenario-chip ${selectedScenarios.includes(s) ? 'selected' : ''}`} onClick={() => toggleScenario(s)}>
                <span className="chip-icon">{selectedScenarios.includes(s) ? '✓' : '○'}</span>
                <span>{s}</span>
              </button>
            ))}
          </div>
          {selectedScenarios.length === 2 && (
            <button className="compare-btn" onClick={compareScenarios}>Compare Scenarios →</button>
          )}
          {comparison && !comparison.error && (
            <div className="comparison-results">
              <div className="comparison-grid">
                <ComparisonCard scenario={comparison.scenarioA} label="SCENARIO A" />
                <ComparisonCard scenario={comparison.scenarioB} label="SCENARIO B" />
              </div>
              <div className="recommendation">
                <strong>Recommended:</strong> {comparison.recommendation.recommendedScenario}
                <span className="confidence">{comparison.recommendation.confidence}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Network Breakdown */}
      {byNetwork && Object.keys(byNetwork).length > 0 && (
        <div className="dashboard-section" style={{ animationDelay: '0.3s' }}>
          <div className="section-header">
            <h3>Performance by Network</h3>
            <span className="section-tag">NETWORK</span>
          </div>
          <div className="breakdown-grid">
            {Object.entries(byNetwork).map(([network, data]) => (
              <BreakdownCard key={network} title={network} data={data} icon="📡" />
            ))}
          </div>
        </div>
      )}

      {/* Literacy Breakdown */}
      {byLiteracy && Object.keys(byLiteracy).length > 0 && (
        <div className="dashboard-section" style={{ animationDelay: '0.35s' }}>
          <div className="section-header">
            <h3>Performance by Digital Literacy</h3>
            <span className="section-tag">LITERACY</span>
          </div>
          <div className="breakdown-grid">
            {Object.entries(byLiteracy).map(([literacy, data]) => (
              <BreakdownCard key={literacy} title={literacy.charAt(0).toUpperCase() + literacy.slice(1)} data={data} icon="📚" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;