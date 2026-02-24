import React from 'react';
import './MetricsPanel.css';

function MetricsPanel({ summary }) {
  const getScoreColor = (score) => {
    if (score >= 0.7) return '#4ade80';
    if (score >= 0.5) return '#fbbf24';
    if (score >= 0.3) return '#fb923c';
    return '#ef4444';
  };

  return (
    <div className="metrics-panel">
      <div className="metric-card">
        <div className="metric-icon" style={{ color: '#60a5fa' }}>🏪</div>
        <div className="metric-content">
          <div className="metric-label">Total Merchants</div>
          <div className="metric-value">{summary.totalMerchants}</div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon" style={{ color: summary.successRate >= 0.8 ? '#4ade80' : '#fbbf24' }}>✅</div>
        <div className="metric-content">
          <div className="metric-label">Success Rate</div>
          <div className="metric-value">{summary.successRatePercent}</div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon" style={{ color: '#a78bfa' }}>⏱️</div>
        <div className="metric-content">
          <div className="metric-label">Avg Completion Time</div>
          <div className="metric-value">{summary.averageCompletionTimeSec}s</div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon" style={{ color: getScoreColor(summary.experienceScore || 0) }}>⭐</div>
        <div className="metric-content">
          <div className="metric-label">Experience Score</div>
          <div className="metric-value">{summary.experienceScore != null ? summary.experienceScore.toFixed(2) : 'N/A'}</div>
        </div>
      </div>
    </div>
  );
}

export default MetricsPanel;
