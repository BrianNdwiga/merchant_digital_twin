import React from 'react';
import './AIInsights.css';

function AIInsights({ insights }) {
  if (!insights || !insights.frictionPoints) {
    return (
      <div className="ai-insights-empty">
        <p>No AI insights available yet. Run a simulation to generate insights.</p>
      </div>
    );
  }

  const { frictionPoints, personaStruggles, networkImpact } = insights;

  return (
    <div className="ai-insights">
      <div className="insights-header">
        <h3>🧠 AI-Generated Insights</h3>
        <span className="live-badge">LIVE</span>
      </div>

      {/* Friction Points */}
      {frictionPoints && frictionPoints.length > 0 && (
        <div className="insight-section">
          <h4>⚠️ Key Friction Points</h4>
          <div className="friction-list">
            {frictionPoints.map((friction, idx) => (
              <div key={idx} className={`friction-item severity-${friction.severity}`}>
                <div className="friction-header">
                  <span className="friction-type">{friction.type}</span>
                  <span className={`severity-badge ${friction.severity}`}>
                    {friction.severity}
                  </span>
                </div>
                <div className="friction-description">{friction.description}</div>
                <div className="friction-location">Location: {friction.location}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Persona Struggles */}
      {personaStruggles && personaStruggles.length > 0 && (
        <div className="insight-section">
          <h4>👥 Persona Groups Struggling</h4>
          <div className="persona-list">
            {personaStruggles.map((struggle, idx) => (
              <div key={idx} className="persona-item">
                <div className="persona-header">
                  <span className="persona-name">{struggle.persona}</span>
                  <span className="failure-rate">{struggle.failureRate}% failure</span>
                </div>
                <div className="persona-stats">
                  {struggle.count} of {struggle.total} failed
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill failure"
                    style={{ width: `${struggle.failureRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network Impact */}
      {networkImpact && networkImpact.length > 0 && (
        <div className="insight-section">
          <h4>📡 Network-Related Issues</h4>
          <div className="network-list">
            {networkImpact.map((impact, idx) => (
              <div key={idx} className="network-item">
                <div className="network-header">
                  <span className="network-profile">{impact.profile}</span>
                  <span className="latency">{impact.avgLatency > 0 ? `${impact.avgLatency}ms avg` : 'no latency data'}</span>
                </div>
                <div className="network-stats">
                  <span>Failure Rate: {impact.failureRate}%</span>
                  <span>✅ {impact.successes ?? 0} passed</span>
                  <span>❌ {impact.failures} failed</span>
                  <span>Events: {impact.totalEvents}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill failure"
                    style={{ width: `${impact.failureRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(frictionPoints?.length ?? 0) === 0 && (personaStruggles?.length ?? 0) === 0 && (networkImpact?.length ?? 0) === 0 && (
        <div className="no-issues">
          <div className="success-icon">✅</div>
          <p>No major issues detected. Onboarding flow performing well!</p>
        </div>
      )}
    </div>
  );
}

export default AIInsights;
