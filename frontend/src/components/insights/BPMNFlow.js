import React, { useEffect, useRef, useState, useCallback } from 'react';
import './BPMNFlow.css';

// ── The 5 fixed onboarding steps ─────────────────────────────────────────────
const ONBOARDING_STEPS = [
  { id: 'portal_landing',  label: 'Portal\nLanding',   icon: '🌐' },
  { id: 'business_info',   label: 'Business\nInfo',    icon: '🏢' },
  { id: 'contact_info',    label: 'Contact\nInfo',     icon: '📞' },
  { id: 'documentation',   label: 'Documents',         icon: '📄' },
  { id: 'submission',      label: 'Submit',            icon: '✅' },
];

// ── Build a structured journey from raw events for one merchant ───────────────
function buildMerchantJourney(merchantEvents) {
  const sorted = [...merchantEvents].sort((a, b) =>
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  // Find the summary event
  const summary = sorted.find(e =>
    e.event === 'ONBOARDING_SUMMARY' || e.event === 'SUMMARY'
  );

  const outcome = summary?.summary || {};
  const networkProfile  = outcome.networkProfile  || sorted.find(e => e.networkProfile)?.networkProfile  || 'unknown';
  const digitalLiteracy = outcome.digitalLiteracy || sorted.find(e => e.digitalLiteracy)?.digitalLiteracy || 'unknown';
  const deviceType      = outcome.deviceType      || sorted.find(e => e.deviceType)?.deviceType           || 'unknown';

  // Map events to steps
  const stepData = {};
  ONBOARDING_STEPS.forEach(s => {
    stepData[s.id] = { status: 'pending', frictions: [], loadTimeMs: null };
  });

  sorted.forEach(ev => {
    const step = ev.step || null;
    const type = ev.event || ev.eventType || '';

    if (type === 'PAGE_LOAD' || type === 'PAGE_LOAD_FAILED') {
      const s = stepData['portal_landing'];
      s.loadTimeMs = ev.loadTimeMs || ev.latency || null;
      s.status = type === 'PAGE_LOAD_FAILED' ? 'error' : 'visited';
    }

    if (step && stepData[step]) {
      const s = stepData[step];
      if (type === 'VALIDATION_ERROR') {
        s.frictions.push({ type: 'validation', field: ev.field });
        s.status = s.status === 'error' ? 'error' : 'friction';
      }
      if (type === 'DOCUMENT_UPLOAD_CONFUSION') {
        s.frictions.push({ type: 'confusion' });
        s.status = s.status === 'error' ? 'error' : 'friction';
      }
      if (type === 'FIELD_FILLED' && s.status === 'pending') {
        s.status = 'visited';
      }
      if (type === 'ONBOARDING_FAILED' || type === 'PAGE_LOAD_FAILED') {
        s.status = 'error';
      }
    }
  });

  // Apply final outcome to the last reached step
  const failedAtStep = outcome.failedAtStep; // 1-indexed
  const success = outcome.success || false;

  if (success) {
    // All steps completed
    ONBOARDING_STEPS.forEach(s => {
      if (stepData[s.id].status === 'pending') stepData[s.id].status = 'visited';
    });
    stepData['submission'].status = 'success';
  } else if (failedAtStep) {
    const failedStepId = ONBOARDING_STEPS[failedAtStep - 1]?.id;
    if (failedStepId) stepData[failedStepId].status = 'error';
    // Steps before failure were visited
    for (let i = 0; i < failedAtStep - 1; i++) {
      const sid = ONBOARDING_STEPS[i]?.id;
      if (sid && stepData[sid].status === 'pending') stepData[sid].status = 'visited';
    }
  }

  return {
    steps: ONBOARDING_STEPS.map(s => ({ ...s, ...stepData[s.id] })),
    outcome,
    networkProfile,
    digitalLiteracy,
    deviceType,
    success,
    completionTimeMs: outcome.completionTimeMs || outcome.timeBeforeFailure || null,
  };
}

// ── Canvas drawing ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  success:  { bg: '#d1fae5', border: '#10b981', text: '#065f46', glow: 'rgba(16,185,129,0.4)' },
  error:    { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', glow: 'rgba(239,68,68,0.4)' },
  friction: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', glow: 'rgba(245,158,11,0.4)' },
  visited:  { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3', glow: 'rgba(99,102,241,0.3)' },
  pending:  { bg: '#1e293b', border: '#334155', text: '#64748b', glow: 'none' },
};

function drawRoundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth = 2) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function renderJourneyCanvas(canvas, journey, dpr) {
  const NODE_W = 110;
  const NODE_H = 80;
  const H_GAP  = 60;   // gap between nodes
  const STEP   = NODE_W + H_GAP;
  const PAD_X  = 40;
  const PAD_Y  = 30;
  const FRICTION_H = 22;

  const totalSteps = journey.steps.length;
  const logicalW = PAD_X * 2 + totalSteps * NODE_W + (totalSteps - 1) * H_GAP;

  // Calculate extra height for friction badges
  const maxFrictions = Math.max(...journey.steps.map(s => s.frictions.length));
  const logicalH = PAD_Y * 2 + NODE_H + (maxFrictions > 0 ? FRICTION_H * maxFrictions + 12 : 0) + 40;

  canvas.width  = logicalW  * dpr;
  canvas.height = logicalH  * dpr;
  canvas.style.width  = logicalW  + 'px';
  canvas.style.height = logicalH  + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, logicalW, logicalH);

  const nodeY = PAD_Y;

  journey.steps.forEach((step, i) => {
    const x = PAD_X + i * STEP;
    const colors = STATUS_COLORS[step.status] || STATUS_COLORS.pending;

    // Draw connector arrow before this node
    if (i > 0) {
      const prevX = PAD_X + (i - 1) * STEP + NODE_W;
      const midY  = nodeY + NODE_H / 2;
      ctx.save();
      ctx.strokeStyle = step.status === 'pending' ? '#334155' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.setLineDash(step.status === 'pending' ? [4, 4] : []);
      ctx.beginPath();
      ctx.moveTo(prevX, midY);
      ctx.lineTo(x, midY);
      ctx.stroke();
      ctx.setLineDash([]);
      // Arrowhead
      ctx.fillStyle = step.status === 'pending' ? '#334155' : '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(x, midY);
      ctx.lineTo(x - 8, midY - 5);
      ctx.lineTo(x - 8, midY + 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Glow for active/error/success
    if (colors.glow !== 'none') {
      ctx.save();
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur  = 12;
      drawRoundRect(ctx, x, nodeY, NODE_W, NODE_H, 10, colors.bg, colors.border, 2.5);
      ctx.restore();
    } else {
      drawRoundRect(ctx, x, nodeY, NODE_W, NODE_H, 10, colors.bg, colors.border, 2);
    }

    // Icon
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(step.icon, x + NODE_W / 2, nodeY + 22);

    // Label (supports \n)
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const lines = step.label.split('\n');
    lines.forEach((line, li) => {
      const lineY = nodeY + 42 + li * 13;
      ctx.fillText(line, x + NODE_W / 2, lineY, NODE_W - 12);
    });

    // Load time badge (portal_landing only)
    if (step.id === 'portal_landing' && step.loadTimeMs) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.font = '9px DM Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${step.loadTimeMs}ms`, x + NODE_W / 2, nodeY + NODE_H - 8);
    }

    // Friction badges below node
    step.frictions.forEach((f, fi) => {
      const badgeY = nodeY + NODE_H + 8 + fi * FRICTION_H;
      const label  = f.type === 'validation' ? `⚠ ${f.field || 'field'}` : '😕 confused';
      ctx.save();
      drawRoundRect(ctx, x + 4, badgeY, NODE_W - 8, FRICTION_H - 4, 5,
        'rgba(245,158,11,0.15)', '#f59e0b', 1);
      ctx.fillStyle = '#92400e';
      ctx.font = '9px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + NODE_W / 2, badgeY + (FRICTION_H - 4) / 2, NODE_W - 16);
      ctx.restore();
    });
  });
}

// ── Per-merchant card ─────────────────────────────────────────────────────────
function MerchantJourneyCard({ merchantId, journey }) {
  const canvasRef  = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !journey) return;
    const dpr = window.devicePixelRatio || 1;
    renderJourneyCanvas(canvas, journey, dpr);
  }, [journey]);

  const durationLabel = journey.completionTimeMs
    ? `${(journey.completionTimeMs / 1000).toFixed(1)}s`
    : null;

  const networkBadge = journey.networkProfile !== 'unknown' ? journey.networkProfile : null;
  const literacyBadge = journey.digitalLiteracy !== 'unknown' ? journey.digitalLiteracy : null;

  return (
    <div className="merchant-flow-card">
      <div className="merchant-flow-header">
        <div className="merchant-flow-title">
          <span className="merchant-status-icon">
            {journey.success ? '✅' : '❌'}
          </span>
          <span className="merchant-id">Merchant #{merchantId}</span>
        </div>
        <div className="merchant-flow-meta">
          {networkBadge  && <span className="bpmn-meta-badge network">{networkBadge}</span>}
          {literacyBadge && <span className="bpmn-meta-badge literacy">{literacyBadge}</span>}
          {durationLabel && <span className="bpmn-meta-badge duration">{durationLabel}</span>}
          <span className="merchant-step-count">
            {journey.steps.filter(s => s.status !== 'pending').length}/{journey.steps.length} steps
          </span>
        </div>
      </div>
      <div ref={wrapperRef} className="bpmn-canvas-wrapper">
        <canvas ref={canvasRef} className="bpmn-canvas" />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function BPMNFlow({ events }) {
  const [merchantJourneys, setMerchantJourneys] = useState([]);
  const [viewMode, setViewMode]         = useState('all');
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [filter, setFilter]             = useState('all'); // all | failed | friction

  // Also fetch full merchant event data from the dedicated endpoint
  const [fetchedJourneys, setFetchedJourneys] = useState(null);

  const fetchByMerchant = useCallback(async () => {
    try {
      const res  = await fetch('http://localhost:3000/events/by-merchant');
      const data = await res.json();
      if (data.merchants && Object.keys(data.merchants).length > 0) {
        const journeys = Object.entries(data.merchants).map(([id, evs]) => ({
          merchantId: id,
          journey: buildMerchantJourney(evs),
        })).sort((a, b) => a.merchantId.localeCompare(b.merchantId));
        setFetchedJourneys(journeys);
      }
    } catch { /* silent — fall back to prop events */ }
  }, []);

  useEffect(() => {
    fetchByMerchant();
    const interval = setInterval(fetchByMerchant, 5000);
    return () => clearInterval(interval);
  }, [fetchByMerchant]);

  // Build from prop events as fallback / live updates
  useEffect(() => {
    if (!events || events.length === 0) return;
    const merchantMap = {};
    events.forEach(ev => {
      const id = ev.merchantId || ev.merchant_id || ev.agentId;
      if (!id) return;
      if (!merchantMap[id]) merchantMap[id] = [];
      merchantMap[id].push(ev);
    });
    const journeys = Object.entries(merchantMap).map(([id, evs]) => ({
      merchantId: id,
      journey: buildMerchantJourney(evs),
    })).sort((a, b) => a.merchantId.localeCompare(b.merchantId));
    setMerchantJourneys(journeys);
    if (!selectedMerchant && journeys.length > 0) setSelectedMerchant(journeys[0].merchantId);
  }, [events, selectedMerchant]);

  // Prefer fetched (complete) data over prop-derived
  const allJourneys = fetchedJourneys || merchantJourneys;

  useEffect(() => {
    if (allJourneys.length > 0 && !selectedMerchant) {
      setSelectedMerchant(allJourneys[0].merchantId);
    }
  }, [allJourneys, selectedMerchant]);

  if (!allJourneys || allJourneys.length === 0) {
    return (
      <div className="bpmn-container">
        <div className="bpmn-header-fixed">
          <div className="bpmn-header"><h3>Merchant Journey Flows</h3></div>
        </div>
        <div className="bpmn-content-scrollable">
          <div className="bpmn-empty">
            <div className="bpmn-empty-icon">📊</div>
            <p>No flow data available</p>
            <p className="bpmn-empty-hint">Run a simulation to see merchant journey flows</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter
  let visible = viewMode === 'single'
    ? allJourneys.filter(j => j.merchantId === (selectedMerchant || allJourneys[0]?.merchantId))
    : allJourneys;

  if (filter === 'failed')  visible = visible.filter(j => !j.journey.success);
  if (filter === 'friction') visible = visible.filter(j =>
    j.journey.steps.some(s => s.status === 'friction' || s.frictions.length > 0)
  );

  const failedCount   = allJourneys.filter(j => !j.journey.success).length;
  const frictionCount = allJourneys.filter(j => j.journey.steps.some(s => s.frictions.length > 0)).length;

  return (
    <div className="bpmn-container">
      <div className="bpmn-header-fixed">
        <div className="bpmn-header">
          <h3>Merchant Journey Flows</h3>
          <div className="bpmn-controls">
            {/* View toggle */}
            <div className="bpmn-view-toggle">
              <button className={`bpmn-view-btn ${viewMode === 'all' ? 'active' : ''}`} onClick={() => setViewMode('all')}>
                <span>📊</span><span>All ({allJourneys.length})</span>
              </button>
              <button className={`bpmn-view-btn ${viewMode === 'single' ? 'active' : ''}`} onClick={() => setViewMode('single')}>
                <span>🎯</span><span>Single</span>
              </button>
            </div>

            {/* Filter pills */}
            <div className="bpmn-view-toggle">
              <button className={`bpmn-view-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
              <button className={`bpmn-view-btn ${filter === 'failed' ? 'active' : ''}`} onClick={() => setFilter('failed')}>
                ❌ Failed ({failedCount})
              </button>
              <button className={`bpmn-view-btn ${filter === 'friction' ? 'active' : ''}`} onClick={() => setFilter('friction')}>
                ⚠️ Friction ({frictionCount})
              </button>
            </div>

            {viewMode === 'single' && (
              <select
                className="bpmn-merchant-select"
                value={selectedMerchant || allJourneys[0]?.merchantId}
                onChange={e => setSelectedMerchant(e.target.value)}
              >
                {allJourneys.map(j => (
                  <option key={j.merchantId} value={j.merchantId}>
                    {j.journey.success ? '✅' : '❌'} Merchant #{j.merchantId}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="bpmn-content-scrollable">
        {visible.length === 0 ? (
          <div className="bpmn-empty" style={{ minHeight: 200 }}>
            <p>No merchants match this filter</p>
          </div>
        ) : (
          <div className="merchant-flows-container">
            {visible.map(j => (
              <MerchantJourneyCard key={j.merchantId} merchantId={j.merchantId} journey={j.journey} />
            ))}
          </div>
        )}

        <div className="bpmn-legend">
          <div className="bpmn-legend-item"><span className="bpmn-legend-dot success" /><span>Completed</span></div>
          <div className="bpmn-legend-item"><span className="bpmn-legend-dot error"   /><span>Failed</span></div>
          <div className="bpmn-legend-item"><span className="bpmn-legend-dot warning" /><span>Friction</span></div>
          <div className="bpmn-legend-item"><span className="bpmn-legend-dot active"  /><span>Visited</span></div>
          <div className="bpmn-legend-item"><span className="bpmn-legend-dot pending" /><span>Not reached</span></div>
        </div>
      </div>
    </div>
  );
}

export default BPMNFlow;
