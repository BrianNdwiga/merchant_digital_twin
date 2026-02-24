import React, { useState, useEffect } from 'react';
import './Dashboard.css';

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [byNetwork, setByNetwork] = useState(null);
  const [byLiteracy, setByLiteracy] = useState(null);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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
        fetch('http://localhost:3000/insights/by-literacy')
      ]);

      const summaryData = await summaryRes.json();
      const scenariosData = await scenariosRes.json();
      const networkData = await networkRes.json();
      const literacyData = await literacyRes.json();

      setSummary(summaryData);
      setScenarios(scenariosData.scenarios || []);
      setByNetwork(networkData);
      setByLiteracy(literacyData);
      setLoading(false);
      setError(null);
    } catch (err) {
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
      const [scenarioA, scenarioB] = selectedScenarios;
      const res = await fetch(
        `http://localhost:3000/insights/compare?scenarioA=${scenarioA}&scenarioB=${scenarioB}`
      );
      const data = await res.json();
      setComparison(data);
    } catch (err) {
      console.error('Failed to compare scenarios:', err);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-icon">⚠️</div>
        <h3>Connection Error</h3>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="retry-button">
          Retry Connection
        </button>
      </div>
    );
  }

  if (!summary || (summary.totalMerchants === 0 && !scenarios.length)) {
    return (
      <div className="dashboard-empty">
        <div className="empty-icon">📊</div>
        <h3>No Simulation Data</h3>
        <p>Run a simulation to see insights and metrics</p>
        <div className="empty-hint">
          <p>Start a simulation from the Simulation Console</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 0.7) return '#4ade80';
    if (score >= 0.5) return '#fbbf24';
    if (score >= 0.3) return '#fb923c';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 0.7) return 'Excellent';
    if (score >= 0.5) return 'Good';
    if (score >= 0.3) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="dashboard fade-in">
      <div className="dashboard-header">
        <h2>Simulation Dashboard</h2>
        <p>Real-time insights from scenario experiments</p>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <MetricCard
          label="Total Merchants"
          value={summary.totalMerchants}
          icon="🏪"
          color="#60a5fa"
        />
        <MetricCard
          label="Success Rate"
          value={summary.successRatePercent}
          icon="✅"
          color={summary.successRate >= 0.8 ? '#4ade80' : '#fbbf24'}
        />
        <MetricCard
          label="Avg Completion Time"
          value={`${summary.averageCompletionTimeSec}s`}
          icon="⏱️"
          color="#a78bfa"
        />
        <MetricCard
          label="Experience Score"
          value={summary.experienceScore != null ? summary.experienceScore.toFixed(2) : 'N/A'}
          icon="⭐"
          color={getScoreColor(summary.experienceScore || 0)}
          subtitle={getScoreLabel(summary.experienceScore || 0)}
        />
      </div>

      {/* Scenarios Overview & Comparison */}
      {scenarios.length > 0 && (
        <div className="dashboard-section">
          <h3>Scenario Comparison</h3>
          <p className="section-desc">Select two scenarios to compare performance</p>
          <div className="scenarios-list">
            {scenarios.map(scenario => (
              <button
                key={scenario}
                className={`scenario-chip ${selectedScenarios.includes(scenario) ? 'selected' : ''}`}
                onClick={() => toggleScenario(scenario)}
              >
                <span className="chip-icon">
                  {selectedScenarios.includes(scenario) ? '✓' : '○'}
                </span>
                <span className="scenario-name">{scenario}</span>
              </button>
            ))}
          </div>
          {selectedScenarios.length === 2 && (
            <button className="compare-btn" onClick={compareScenarios}>
              Compare Scenarios
            </button>
          )}
          
          {comparison && !comparison.error && (
            <div className="comparison-results">
              <div className="comparison-grid">
                <ComparisonCard scenario={comparison.scenarioA} label="Scenario A" />
                <ComparisonCard scenario={comparison.scenarioB} label="Scenario B" />
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
        <div className="dashboard-section">
          <h3>Performance by Network</h3>
          <div className="breakdown-grid">
            {Object.entries(byNetwork).map(([network, data]) => (
              <BreakdownCard
                key={network}
                title={network}
                data={data}
                icon="📡"
              />
            ))}
          </div>
        </div>
      )}

      {/* Literacy Breakdown */}
      {byLiteracy && Object.keys(byLiteracy).length > 0 && (
        <div className="dashboard-section">
          <h3>Performance by Digital Literacy</h3>
          <div className="breakdown-grid">
            {Object.entries(byLiteracy).map(([literacy, data]) => (
              <BreakdownCard
                key={literacy}
                title={literacy.charAt(0).toUpperCase() + literacy.slice(1)}
                data={data}
                icon="📚"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon, color, subtitle }) {
  return (
    <div className="metric-card">
      <div className="metric-icon" style={{ color }}>{icon}</div>
      <div className="metric-content">
        <div className="metric-label">{label}</div>
        <div className="metric-value" style={{ color }}>{value}</div>
        {subtitle && <div className="metric-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

function BreakdownCard({ title, data, icon }) {
  return (
    <div className="breakdown-card">
      <div className="breakdown-header">
        <span className="breakdown-icon">{icon}</span>
        <span className="breakdown-title">{title}</span>
      </div>
      <div className="breakdown-stats">
        <div className="stat-row">
          <span className="stat-label">Merchants:</span>
          <span className="stat-value">{data.totalMerchants}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Success Rate:</span>
          <span className="stat-value" style={{ 
            color: data.successRate >= 0.8 ? '#4ade80' : data.successRate >= 0.6 ? '#fbbf24' : '#ef4444'
          }}>
            {data.successRate != null ? (data.successRate * 100).toFixed(1) : '0'}%
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Avg Attempts:</span>
          <span className="stat-value">{data.avgAttempts != null ? data.avgAttempts.toFixed(1) : 'N/A'}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Exp Score:</span>
          <span className="stat-value">{data.avgExperienceScore != null ? data.avgExperienceScore.toFixed(2) : 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

function ComparisonCard({ scenario, label }) {
  return (
    <div className="comparison-card">
      <div className="comparison-header">
        <span className="comparison-label">{label}</span>
        <span className="comparison-id">{scenario.id}</span>
      </div>
      <div className="comparison-stats">
        <div className="stat-row">
          <span>Success Rate:</span>
          <span>{scenario.successRatePercent}</span>
        </div>
        <div className="stat-row">
          <span>Avg Time:</span>
          <span>{scenario.averageCompletionTimeSec}s</span>
        </div>
        <div className="stat-row">
          <span>Experience:</span>
          <span>{scenario.experienceScore != null ? scenario.experienceScore.toFixed(2) : 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}
