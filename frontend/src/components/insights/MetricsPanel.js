import React from 'react';
import './MetricsPanel.css';

function MetricsPanel({ summary }) {
  const getScoreColor = (score) => {
    if (score >= 0.7) return '#4ade80';
    if (score >= 0.5) return '#fbbf24';
    if (score >= 0.3) return '#fb923c';
    return '#ef4444';
  };

  const dropOffRate = summary.successRate ? ((1 - summary.successRate) * 100).toFixed(1) : '0.0';

  return (
    <div className="metrics-panel">
      <div className="metric-card hover-lift">
        <div className="metric-icon" style={{ color: '#60a5fa' }}>🏪</div>
        <div className="metric-content">
          <div className="metric-label">Total Merchants</div>
          <div className="metric-value animated-counter">{summary.totalMerchants}</div>
          <div className="metric-subtitle">Active simulations</div>
        </div>
      </div>

      <div className="metric-card hover-lift">
        <div className="metric-icon" style={{ color: summary.successRate >= 0.8 ? '#4ade80' : '#fbbf24' }}>
          {summary.successRate >= 0.8 ? '✅' : '⚠️'}
        </div>
        <div className="metric-content">
          <div className="metric-label">Completion Rate</div>
          <div className="metric-value animated-counter" style={{ color: summary.successRate >= 0.8 ? '#4ade80' : '#fbbf24' }}>
            {summary.successRatePercent}
          </div>
          <div className="metric-subtitle">
            {summary.successRate >= 0.8 ? 'Excellent performance' : 'Needs improvement'}
          </div>
        </div>
      </div>

      <div className="metric-card hover-lift">
        <div className="metric-icon" style={{ color: '#ef4444' }}>📉</div>
        <div className="metric-content">
          <div className="metric-label">Drop-off Rate</div>
          <div className="metric-value animated-counter" style={{ color: '#ef4444' }}>
            {dropOffRate}%
          </div>
          <div className="metric-subtitle">Merchants not completing</div>
        </div>
      </div>

      <div className="metric-card hover-lift">
        <div className="metric-icon" style={{ color: '#a78bfa' }}>⏱️</div>
        <div className="metric-content">
          <div className="metric-label">Avg Completion Time</div>
          <div className="metric-value animated-counter">{summary.averageCompletionTimeSec}s</div>
          <div className="metric-subtitle">Per merchant journey</div>
        </div>
      </div>
    </div>
  );
}

export default MetricsPanel;
