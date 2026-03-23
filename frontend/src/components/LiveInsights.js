import React, { useState, useEffect, useRef, useCallback } from 'react';
import './LiveInsights.css';
import MetricsPanel from './insights/MetricsPanel';
import SimulationTimeline from './insights/SimulationTimeline';
import AIAssistantPanel from './insights/AIAssistantPanel';
import AIInsights from './insights/AIInsights';
import AIRecommendations from './insights/AIRecommendations';
import BPMNFlow from './insights/BPMNFlow';

// ── Event message formatter (all original logic preserved) ───────────────────
function formatEventMessage(event) {
  const merchantId = event.merchantId || 'Unknown';
  const eventType  = event.event || event.eventType || 'event';
  const network    = event.networkProfile  ? ` [${event.networkProfile}]`  : '';
  const literacy   = event.digitalLiteracy ? ` [${event.digitalLiteracy}]` : '';
  const device     = event.deviceType      ? ` [${event.deviceType}]`      : '';
  const latency    = event.latency         ? ` (${event.latency}ms)`       : '';
  const step       = event.step            ? ` - ${event.step}`            : '';
  const url        = event.url             ? ` at ${event.url}`            : '';

  switch (eventType) {
    case 'ONBOARDING_SUMMARY':
    case 'SUMMARY': {
      const outcome  = event.summary?.success ? '✅ SUCCESS' : '❌ FAILED';
      const time     = event.summary?.completionTimeMs ? ` in ${event.summary.completionTimeMs}ms` : '';
      const attempts = event.summary?.totalAttempts    ? ` (${event.summary.totalAttempts} attempts)` : '';
      return `${outcome} ${merchantId}${time}${attempts}${network}${literacy}`;
    }
    case 'PAGE_LOAD':              return `🌐 ${merchantId} loaded portal${url}${latency}${network}`;
    case 'PAGE_LOAD_FAILED':       return `❌ ${merchantId} failed to load portal${url}: ${event.error || 'unknown'}${network}`;
    case 'FIELD_FILLED':           return `✏️ ${merchantId} filled field: ${event.field || 'unknown'}${latency}${literacy}`;
    case 'VALIDATION_ERROR':       return `⚠️ ${merchantId} validation error on ${event.field || 'field'} - retrying${literacy}`;
    case 'DOCUMENT_UPLOAD_CONFUSION': return `😕 ${merchantId} experiencing confusion with document upload${literacy}`;
    case 'ONBOARDING_COMPLETE':    return `✅ ${merchantId} completed onboarding${latency}${device}${network}`;
    case 'ONBOARDING_FAILED':      return `❌ ${merchantId} onboarding failed${step}: ${event.error || 'unknown'}${device}`;
    case 'ATTEMPT': {
      const result = event.result === 'success' ? '✅' : '🔄';
      return `${result} ${merchantId} attempt ${event.attempt || 1}${latency}${network}${literacy}`;
    }
    case 'ONBOARDING_ATTEMPT': {
      const attemptResult = event.result === 'success' ? '✅' : '🔄';
      return `${attemptResult} ${merchantId} onboarding attempt ${event.attempt || 1}${latency}`;
    }
    case 'AGENT_ERROR':     return `💥 ${merchantId} agent error: ${event.error || 'unknown'}`;
    case 'SIMULATION_START': return `🚀 ${merchantId} started simulation${device}${network}${literacy}`;
    case 'STEP_COMPLETED':  return `✅ ${merchantId} completed${step}${latency}`;
    case 'RETRY_ATTEMPT':   return `🔄 ${merchantId} retrying (attempt ${event.retryCount || event.attempt || 1})${network}`;
    case 'NETWORK_DELAY':   return `📡 ${merchantId} network delay${latency}${network}`;
    case 'TIMEOUT':         return `⏱️ ${merchantId} timeout${step}${network}`;
    default: {
      const context = [network, literacy, device, latency, step].filter(Boolean).join(' ');
      return `📝 ${merchantId}: ${eventType}${context ? ' ' + context : ''}`;
    }
  }
}

// ── Classify event type for styling ─────────────────────────────────────────
function getEventClass(type) {
  if (!type) return 'ev-neutral';
  const t = type.toUpperCase();
  if (t.includes('COMPLETE') || t.includes('SUCCESS')) return 'ev-success';
  if (t.includes('FAIL') || t.includes('ERROR'))       return 'ev-error';
  if (t.includes('RETRY') || t.includes('VALIDATION')) return 'ev-warn';
  if (t.includes('START') || t.includes('LOAD'))       return 'ev-info';
  return 'ev-neutral';
}

// ── Main Component ────────────────────────────────────────────────────────────
function LiveInsights({ showToast }) {
  const [summary,  setSummary]  = useState(null);
  const [events,   setEvents]   = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [eventCount, setEventCount] = useState(0);
  const [activeView, setActiveView] = useState('timeline');
  const [rawEvents, setRawEvents] = useState([]);
  const [queueStats, setQueueStats] = useState(null);
  const wsRef = useRef(null);
  const timelineRef = useRef(null);

  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket('ws://localhost:3000');

      ws.onopen = () => {
        setWsStatus('live');
        showToast?.('WebSocket connected', 'success');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'insights') {
            setInsights(message.data);
            if (message.data.operational) {
              setSummary(prev => ({ ...prev, ...message.data.operational }));
            }
          } else if (message.type === 'event') {
            const raw = message.data;
            const formatted = {
              timestamp:  new Date(message.data.timestamp).toLocaleTimeString(),
              message:    formatEventMessage(message.data),
              type:       message.data.event || message.data.eventType,
              merchantId: message.data.merchantId,
              id:         Date.now() + Math.random(),
            };
            setEvents(prev => [formatted, ...prev].slice(0, 50));
            setRawEvents(prev => [raw, ...prev].slice(0, 50));
            setEventCount(c => c + 1);
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onerror  = () => setWsStatus('polling');
      ws.onclose  = () => {
        setWsStatus('polling');
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current = ws;
    } catch { setWsStatus('polling'); }
  }, [showToast]);

  useEffect(() => {
    fetchInsights();
    fetchEvents();
    connectWebSocket();

    const insightsInterval = setInterval(fetchInsights, 5000);
    const eventsInterval   = setInterval(fetchEvents,   3000);
    const queueInterval    = setInterval(fetchQueueStats, 2000);

    fetchQueueStats();

    return () => {
      clearInterval(insightsInterval);
      clearInterval(eventsInterval);
      clearInterval(queueInterval);
      wsRef.current?.close();
    };
  }, [connectWebSocket]);

  const fetchQueueStats = async () => {
    try {
      const res  = await fetch('http://localhost:3000/queue/stats');
      const data = await res.json();
      setQueueStats(data);
    } catch { /* silent */ }
  };

  const fetchInsights = async () => {
    try {
      const [summaryRes, liveRes] = await Promise.all([
        fetch('http://localhost:3000/insights/summary'),
        fetch('http://localhost:3000/insights/live'),
      ]);
      setSummary(await summaryRes.json());
      setInsights(await liveRes.json());
      setLoading(false);
    } catch { setLoading(false); }
  };

  const fetchEvents = async () => {
    try {
      const res  = await fetch('http://localhost:3000/events/recent?limit=50');
      const data = await res.json();
      if (data.events?.length) {
        setRawEvents(data.events);
        setEvents(data.events.map(ev => ({
          timestamp:  new Date(ev.timestamp).toLocaleTimeString(),
          message:    formatEventMessage(ev),
          type:       ev.event || ev.eventType,
          merchantId: ev.merchantId,
          id:         ev.id || Math.random(),
        })));
      }
    } catch { /* silent */ }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="li-loading">
      <div className="li-loading-ring">
        <div className="li-loading-ring-inner" />
      </div>
      <p className="li-loading-text">Loading insights<span className="li-ellipsis"><span>.</span><span>.</span><span>.</span></span></p>
    </div>
  );

  // ── Simulation in progress (no summary yet but queue is active or events arriving) ──
  const simInProgress = queueStats && (
    (queueStats.active > 0) ||
    (queueStats.waiting > 0) ||
    (eventCount > 0 && (!summary || summary.totalMerchants === 0))
  );

  if (!summary || summary.totalMerchants === 0) {
    if (simInProgress) {
      const total     = (queueStats.waiting || 0) + (queueStats.active || 0) + (queueStats.completed || 0);
      const completed = queueStats.completed || 0;
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

      return (
        <div className="li-sim-progress-root">
          <div className="li-bg-orb li-bg-1" />
          <div className="li-bg-orb li-bg-2" />

          <div className="li-sim-progress-card">
            {/* Header */}
            <div className="li-sim-progress-header">
              <div className="li-sim-progress-icon">⚡</div>
              <div>
                <h2 className="li-sim-progress-title">Simulation Running</h2>
                <p className="li-sim-progress-sub">Merchants are navigating the onboarding portal</p>
              </div>
              <div className="li-running-badge" style={{ marginLeft: 'auto' }}>
                <span className="li-running-dot" />
                <span className="li-running-scanline" />
                LIVE
              </div>
            </div>

            {/* Progress bar */}
            <div className="li-sim-progress-bar-wrap">
              <div className="li-sim-progress-bar-track">
                <div className="li-sim-progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="li-sim-progress-pct">{pct}%</span>
            </div>

            {/* Stats row */}
            <div className="li-sim-stats-row">
              <div className="li-sim-stat">
                <span className="li-sim-stat-val">{queueStats.active || 0}</span>
                <span className="li-sim-stat-label">Active</span>
              </div>
              <div className="li-sim-stat">
                <span className="li-sim-stat-val">{queueStats.waiting || 0}</span>
                <span className="li-sim-stat-label">Queued</span>
              </div>
              <div className="li-sim-stat li-sim-stat-success">
                <span className="li-sim-stat-val">{queueStats.completed || 0}</span>
                <span className="li-sim-stat-label">Done</span>
              </div>
              <div className="li-sim-stat li-sim-stat-error">
                <span className="li-sim-stat-val">{queueStats.failed || 0}</span>
                <span className="li-sim-stat-label">Failed</span>
              </div>
              <div className="li-sim-stat">
                <span className="li-sim-stat-val">{eventCount}</span>
                <span className="li-sim-stat-label">Events</span>
              </div>
            </div>

            {/* Live event feed */}
            {events.length > 0 && (
              <div className="li-sim-live-feed">
                <div className="li-sim-feed-label">
                  <span className="li-eyebrow-dot" style={{ display: 'inline-block' }} />
                  Live event stream
                </div>
                <div className="li-sim-feed-list">
                  {events.slice(0, 8).map((ev, i) => (
                    <div key={ev.id || i} className={`li-sim-feed-item ${ev.type ? getEventClass(ev.type) : ''}`}>
                      <span className="li-sim-feed-time">{ev.timestamp}</span>
                      <span className="li-sim-feed-msg">{ev.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="li-sim-progress-hint">
              Insights will appear here once merchants complete their journeys
            </p>
          </div>
        </div>
      );
    }

    // True empty — no simulation running
    return (
      <div className="li-empty">
        <div className="li-empty-orb li-orb-1" />
        <div className="li-empty-orb li-orb-2" />
        <div className="li-empty-icon">🔭</div>
        <h3 className="li-empty-title">No Simulation Data</h3>
        <p className="li-empty-sub">Run a simulation to see live insights</p>
      </div>
    );
  }

  const wsColor  = wsStatus === 'live'       ? '#00a651' : wsStatus === 'polling' ? '#f59e0b' : '#7c5cfc';
  const wsLabel  = wsStatus === 'live'       ? 'WS LIVE'  : wsStatus === 'polling' ? 'POLLING'  : 'CONNECTING';
  const wsAnim   = wsStatus !== 'connecting' ? 'li-pulse 2s ease infinite' : 'li-spin 1s linear infinite';

  return (
    <div className="li-root">
      {/* Atmospheric background */}
      <div className="li-bg-orb li-bg-1" />
      <div className="li-bg-orb li-bg-2" />

      {/* ── Page header ── */}
      <header className="li-header">
        <div className="li-header-left">
          <div className="li-eyebrow">
            <span className="li-eyebrow-dot" />
            Real-time monitoring
          </div>
          <h2 className="li-title">Live <em>Insights</em></h2>
          <p className="li-subtitle">Real-time simulation monitoring and AI-powered analysis</p>
        </div>

        <div className="li-header-badges">
          {/* WS status */}
          <div className="li-badge" style={{ '--badge-color': wsColor }}>
            <span className="li-badge-dot" style={{ background: wsColor, animation: wsAnim }} />
            <span className="li-badge-label">{wsLabel}</span>
          </div>

          {/* Event counter */}
          {eventCount > 0 && (
            <div className="li-event-counter">
              <span className="li-event-num">{eventCount}</span>
              <span className="li-event-label">events</span>
            </div>
          )}

          {/* Simulation running status */}
          <div className="li-running-badge">
            <span className="li-running-dot" />
            <span className="li-running-scanline" />
            SIMULATION RUNNING
          </div>
        </div>
      </header>

      {/* ── Metrics ── */}
      <MetricsPanel summary={summary} />

      {/* ── View tabs ── */}
      <div className="li-tabs-container">
        <div className="li-tabs">
          <button
            className={`li-tab ${activeView === 'timeline' ? 'li-tab-active' : ''}`}
            onClick={() => setActiveView('timeline')}
          >
            <span className="li-tab-icon">📊</span>
            <span>Timeline</span>
          </button>
          <button
            className={`li-tab ${activeView === 'bpmn' ? 'li-tab-active' : ''}`}
            onClick={() => setActiveView('bpmn')}
          >
            <span className="li-tab-icon">🔄</span>
            <span>BPMN Flow</span>
          </button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="li-layout">
        <div className="li-main">
          {activeView === 'timeline' ? (
            <SimulationTimeline events={events} getEventClass={getEventClass} timelineRef={timelineRef} />
          ) : (
            <BPMNFlow events={rawEvents} merchantId={null} />
          )}
          <AIInsights insights={insights} />
          <AIRecommendations recommendations={insights?.aiRecommendations} />
        </div>
        <div className="li-sidebar">
          <AIAssistantPanel insights={insights} summary={summary} />
        </div>
      </div>
    </div>
  );
}

export default LiveInsights;