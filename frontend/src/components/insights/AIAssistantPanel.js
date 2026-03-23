import React, { useState, useEffect } from 'react';
import './AIAssistantPanel.css';

function AIAssistantPanel({ insights, summary }) {
  const [messages, setMessages] = useState([]);
  const [isThinking] = useState(false);

  useEffect(() => {
    if (insights && (
      insights.frictionPoints?.length > 0 ||
      insights.personaStruggles?.length > 0 ||
      insights.byStep ||
      insights.byNetwork
    )) {
      generateInsightMessages(insights);
    }
  }, [insights]);

  const generateInsightMessages = (insightsData) => {
    const newMessages = [];

    // Top friction point with specific step
    if (insightsData.frictionPoints?.length > 0) {
      const f = insightsData.frictionPoints[0];
      newMessages.push({
        id: 'friction-0',
        type: 'alert',
        text: `${f.count} merchants hit friction at "${f.location}" — ${f.description}`,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    // Persona struggles with actual numbers
    if (insightsData.personaStruggles?.length > 0) {
      insightsData.personaStruggles.slice(0, 2).forEach((s, i) => {
        newMessages.push({
          id: `persona-${i}`,
          type: 'insight',
          text: `${s.persona}: ${s.count}/${s.total} failed (${s.failureRate}% failure rate)`,
          timestamp: new Date().toLocaleTimeString()
        });
      });
    }

    // Network issues with real numbers from byNetwork
    const byNetwork = insightsData.byNetwork || {};
    const edge = byNetwork['2G_EDGE'];
    if (edge?.total > 0 && edge.failed / edge.total > 0.2) {
      newMessages.push({
        id: 'network-2g',
        type: 'warning',
        text: `2G_EDGE: ${edge.failed}/${edge.total} failed — avg ${edge.avgDuration}ms`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
    const poor3g = byNetwork['3G_POOR'];
    if (poor3g?.total > 0 && poor3g.failed / poor3g.total > 0.2) {
      newMessages.push({
        id: 'network-3g',
        type: 'warning',
        text: `3G_POOR: ${poor3g.failed}/${poor3g.total} failed — avg ${poor3g.avgDuration}ms`,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    // Step with highest failure count from byStep
    const byStep = insightsData.byStep || {};
    const stepEntries = Object.entries(byStep)
      .map(([step, s]) => ({ step, ...s, rate: s.total > 0 ? s.failed / s.total : 0 }))
      .filter(s => s.failed > 0)
      .sort((a, b) => b.failed - a.failed);

    if (stepEntries.length > 0) {
      const worst = stepEntries[0];
      newMessages.push({
        id: 'step-worst',
        type: 'recommendation',
        text: `Worst step: "${worst.step}" — ${worst.failed}/${worst.total} failed (${(worst.rate * 100).toFixed(0)}%)`,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    // Operational summary if available
    const op = insightsData.operational;
    if (op?.completionRate > 0) {
      newMessages.push({
        id: 'op-summary',
        type: op.completionRate >= 70 ? 'success' : 'alert',
        text: `${op.completionRate}% completion — ${op.dropoffs} failures out of ${op.activeAgents} merchants`,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    setMessages(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
      if (uniqueNew.length === 0) return prev;
      // Replace all messages on each insights update so data stays fresh
      return newMessages.slice(-10);
    });
  };

  const getMessageIcon = (type) => {
    const icons = {
      alert: '⚠️',
      insight: '💡',
      warning: '📡',
      recommendation: '🎯',
      success: '✅',
      info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  };

  return (
    <div className="ai-assistant-panel">
      <div className="assistant-header">
        <div className="assistant-avatar">🤖</div>
        <div className="assistant-info">
          <h3>AI Assistant</h3>
          <p className="assistant-status">
            {isThinking ? 'Analyzing...' : 'Monitoring simulation'}
          </p>
        </div>
      </div>

      <div className="assistant-messages">
        {messages.length === 0 ? (
          <div className="assistant-empty">
            <div className="empty-icon">💭</div>
            <p>Waiting for insights...</p>
          </div>
        ) : (
          messages.map(message => (
            <div key={message.id} className={`assistant-message ${message.type}`}>
              <div className="message-icon">{getMessageIcon(message.type)}</div>
              <div className="message-content">
                <p className="message-text">{message.text}</p>
                <span className="message-time">{message.timestamp}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="assistant-footer">
        <div className="assistant-hint">
          💡 AI continuously analyzes simulation data
        </div>
      </div>
    </div>
  );
}

export default AIAssistantPanel;
