import React, { useState, useEffect, useRef } from 'react';
import './LiveInsights.css';
import MetricsPanel from './insights/MetricsPanel';
import SimulationTimeline from './insights/SimulationTimeline';
import AIAssistantPanel from './insights/AIAssistantPanel';
import AIInsights from './insights/AIInsights';
import AIRecommendations from './insights/AIRecommendations';

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
  const [wsStatus, setWsStatus] = useState('connecting'); // connecting | live | polling
  const [eventCount, setEventCount] = useState(0);
  const wsRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    fetchInsights();
    fetchEvents();
    connectWebSocket();

    const insightsInterval = setInterval(fetchInsights, 5000);
    const eventsInterval   = setInterval(fetchEvents,   3000);

    return () => {
      clearInterval(insightsInterval);
      clearInterval(eventsInterval);
      wsRef.current?.close();
    };
  }, []);

  const connectWebSocket = () => {
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
            const formatted = {
              timestamp:  new Date(message.data.timestamp).toLocaleTimeString(),
              message:    formatEventMessage(message.data),
              type:       message.data.event || message.data.eventType,
              merchantId: message.data.merchantId,
              id:         Date.now() + Math.random(),
            };
            setEvents(prev => [formatted, ...prev].slice(0, 50));
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

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (!summary || summary.totalMerchants === 0) return (
    <div className="li-empty">
      <div className="li-empty-orb li-orb-1" />
      <div className="li-empty-orb li-orb-2" />
      <div className="li-empty-icon">🔭</div>
      <h3 className="li-empty-title">No Simulation Data</h3>
      <p className="li-empty-sub">Run a simulation to see live insights</p>
    </div>
  );

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

      {/* ── Main layout ── */}
      <div className="li-layout">
        <div className="li-main">
          <SimulationTimeline events={events} getEventClass={getEventClass} timelineRef={timelineRef} />
          <AIInsights insights={insights} />
        </div>
        <div className="li-sidebar">
          <AIAssistantPanel insights={insights} summary={summary} />
        </div>
      </div>
    </div>
  );
}

export default LiveInsights;