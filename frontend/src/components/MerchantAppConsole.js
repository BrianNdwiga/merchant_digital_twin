import React, { useState, useEffect, useRef } from 'react';
import './MerchantAppConsole.css';
import AIRecommendations from './insights/AIRecommendations';

// ── Step metadata ─────────────────────────────────────────────────────────────
const STEP_META = {
  CONNECTING:          { icon: '🔌', label: 'Connecting to Appium' },
  APP_RESTART:         { icon: '🔄', label: 'Restarting app' },
  LOGIN_PIN:           { icon: '🔐', label: 'Entering login PIN' },
  LOGIN_PIN_ENTERED:   { icon: '✅', label: 'Login PIN entered' },
  LOGIN_PIN_SKIPPED:   { icon: '⚠️', label: 'Login PIN skipped' },
  WAITING_FOR_HOME:    { icon: '⏳', label: 'Waiting for home screen' },
  HOME_LOADED:         { icon: '🏠', label: 'Home screen loaded' },
  POPUP_DISMISSED:     { icon: '✖️', label: 'Popup dismissed' },
  NAV_TRANSACT:        { icon: '📲', label: 'Tapping Transact tab' },
  TAP_REQUEST_PAYMENT: { icon: '💳', label: 'Tapping Request Payment' },
  TAP_REQUEST_ROW:     { icon: '👆', label: 'Tapping Request Payment row' },
  TAP_FROM_CUSTOMER:   { icon: '👤', label: 'Request Payment From Customer' },
  ENTER_PHONE:         { icon: '📞', label: 'Entering phone number' },
  SUBMIT_PHONE:        { icon: '▶️', label: 'CONTINUE (phone)' },
  NETWORK_DELAY:       { icon: '📡', label: 'Network delay' },
  NETWORK_TIMEOUT:     { icon: '⏱️', label: 'Network timeout' },
  SCENARIO_INJECT:     { icon: '🧪', label: 'Scenario injected' },
  ENTER_AMOUNT:        { icon: '💰', label: 'Entering amount' },
  SUBMIT_AMOUNT:       { icon: '▶️', label: 'CONTINUE (amount)' },
  ENTER_DESCRIPTION:   { icon: '📝', label: 'Entering description' },
  SUBMIT_DESCRIPTION:  { icon: '▶️', label: 'CONTINUE (description)' },
  CONFIRMATION_SCREEN: { icon: '🔍', label: 'Confirmation screen' },
  TAP_CONFIRM:         { icon: '✅', label: 'Tapping Confirm' },
  ENTER_PIN:           { icon: '🔐', label: 'Entering PIN' },
  PIN_ENTERED:         { icon: '⏳', label: 'PIN entered — awaiting result' },
  PIN_SKIPPED:         { icon: '⚠️', label: 'PIN skipped (set MPESA_PIN in .env)' },
  PAYMENT_COMPLETE:    { icon: '🎉', label: 'Payment submitted' },
  ERROR:               { icon: '❌', label: 'Error' },
};

// ── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'normal',          icon: '✅', label: 'Normal Flow',       desc: 'Standard payment with good network', color: '#22c55e' },
  { id: 'slow_network',    icon: '📡', label: 'Slow Network (2G)', desc: 'Simulates 2G EDGE delays',           color: '#f59e0b' },
  { id: 'network_timeout', icon: '⏱️', label: 'Network Timeout',   desc: 'Connection drop then recovery',      color: '#ef4444' },
  { id: 'slow_device',     icon: '📱', label: 'Slow Device',       desc: 'Low-end device render delays',       color: '#8b5cf6' },
  { id: 'wrong_pin',       icon: '🔐', label: 'Wrong PIN',         desc: 'Wrong PIN first, then correct',      color: '#ec4899' },
  { id: 'low_balance',     icon: '💸', label: 'Low Balance',       desc: 'Amount exceeds account balance',     color: '#f97316' },
];

// ── Step row ──────────────────────────────────────────────────────────────────
function StepRow({ step, detail, isActive, isError }) {
  const meta = STEP_META[step] || { icon: '📍', label: step };
  const isNetwork = step === 'NETWORK_DELAY' || step === 'NETWORK_TIMEOUT';
  const isPinWait = step === 'PIN_ENTERED' && isActive;

  let cls = 'cc-step';
  if (isError)        cls += ' cc-step-error';
  else if (isPinWait) cls += ' cc-step-pin-waiting';
  else if (isNetwork) cls += ' cc-step-network';
  else if (isActive)  cls += ' cc-step-active';
  else                cls += ' cc-step-done';

  return (
    <div className={cls}>
      <span className="cc-step-icon">{meta.icon}</span>
      <div className="cc-step-body">
        <div className="cc-step-name">{meta.label}</div>
        {detail && <div className="cc-step-detail">{detail}</div>}
      </div>
      {isActive && <span className="cc-step-pulse" />}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function MerchantAppConsole() {
  const [scenario, setScenario]       = useState('normal');
  const [running, setRunning]         = useState(false);
  const [steps, setSteps]             = useState([]);
  const [currentStep, setCurrentStep] = useState(null);
  const [errorStep, setErrorStep]     = useState(null); // eslint-disable-line no-unused-vars
  const [done, setDone]               = useState(false);
  const [insights, setInsights]       = useState(null);
  const stepsEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  // Poll AI insights while active
  useEffect(() => {
    if (!running && !done) return;
    const iv = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:3000/insights/live');
        setInsights(await res.json());
      } catch { /* silent */ }
    }, 4000);
    return () => clearInterval(iv);
  }, [running, done]);

  // WebSocket for live APP_STEP events
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000');

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type !== 'event') return;
        const ev = msg.data;

        if (ev.event === 'APP_STEP') {
          setSteps(prev => [...prev, { step: ev.step, detail: ev.detail || '' }]);
          setCurrentStep(ev.step);
          if (ev.step === 'ERROR') setErrorStep(ev.step);
          if (ev.step === 'PAYMENT_COMPLETE') {
            setDone(true);
            setRunning(false);
            setCurrentStep(null);
          }
        }
        if (ev.event === 'PAYMENT_FAILED') {
          setErrorStep('ERROR');
          setRunning(false);
          setCurrentStep(null);
        }
      } catch { /* ignore */ }
    };

    return () => ws.close();
  }, []);

  const handleRun = async () => {
    setSteps([]);
    setCurrentStep(null);
    setErrorStep(null);
    setDone(false);
    setRunning(true);
    setInsights(null);

    try {
      const res = await fetch('http://localhost:3000/simulate/merchant/appium', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ scenario }),
      });
      const data = await res.json();
      if (!data.success) setRunning(false);
    } catch {
      setRunning(false);
    }
  };

  const selectedScenario = SCENARIOS.find(s => s.id === scenario);

  return (
    <div className="cc-root">
      {/* Header */}
      <header className="cc-header">
        <div className="cc-header-left">
          <div className="cc-eyebrow"><span className="cc-eyebrow-dot" />App Simulation</div>
          <h2 className="cc-title">Merchant <em>App Console</em></h2>
          <p className="cc-subtitle">Appium-driven M-PESA Business app simulation with live AI insights</p>
        </div>
        <div className="cc-header-badges">
          {running && <div className="cc-running-badge"><span className="cc-running-dot" />RUNNING</div>}
          {done && !running && <div className="cc-done-badge">🎉 COMPLETE</div>}
        </div>
      </header>

      {/* Scenario selector */}
      <section className="cc-section">
        <p className="cc-section-label">Select Scenario</p>
        <div className="cc-scenario-grid">
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              className={`cc-scenario-card${scenario === s.id ? ' selected' : ''}`}
              style={{ '--sc': s.color }}
              onClick={() => !running && setScenario(s.id)}
              disabled={running}
            >
              <span className="cc-scenario-icon">{s.icon}</span>
              <span className="cc-scenario-label">{s.label}</span>
              <span className="cc-scenario-desc">{s.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Run button */}
      <div className="cc-run-row">
        <button className={`cc-run-btn${running ? ' running' : ''}`} onClick={handleRun} disabled={running}>
          {running
            ? <><span className="cc-btn-spinner" /> Simulating {selectedScenario?.label}...</>
            : <>▶ Run App Simulation — {selectedScenario?.label}</>
          }
        </button>
        {steps.length > 0 && !running && (
          <button className="cc-reset-btn" onClick={() => { setSteps([]); setDone(false); setErrorStep(null); }}>
            ↺ Reset
          </button>
        )}
      </div>

      {/* Live steps + AI panel */}
      {steps.length > 0 && (
        <div className="cc-layout">
          <div className="cc-steps-panel">
            <div className="cc-steps-title">
              <span className={`cc-steps-dot${running ? ' cc-steps-dot-live' : ''}`} />
              Live Steps
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6b7280' }}>
                {steps.length} steps
              </span>
            </div>
            <div className="cc-steps-list">
              {steps.map((s, i) => (
                <StepRow
                  key={i}
                  step={s.step}
                  detail={s.detail}
                  isActive={s.step === currentStep && running}
                  isError={s.step === 'ERROR'}
                />
              ))}
              <div ref={stepsEndRef} />
            </div>
          </div>

          <div className="cc-ai-panel">
            <div className="cc-steps-title">
              <span className="cc-steps-dot" style={{ background: '#6366f1' }} />
              AI Recommendations
            </div>
            {insights?.aiRecommendations ? (
              <AIRecommendations recommendations={insights.aiRecommendations} />
            ) : (
              <div className="cc-ai-loading">
                <span className="cc-btn-spinner" />
                Gathering insights...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MerchantAppConsole;
