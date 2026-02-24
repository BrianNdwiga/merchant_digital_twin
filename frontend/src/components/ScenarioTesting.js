import React, { useState, useEffect } from 'react';
import './ScenarioTesting.css';

function ScenarioTesting() {
  const [scenarios, setScenarios] = useState([]);
  const [baselineScenario, setBaselineScenario] = useState('baseline');
  const [modifiedScenario, setModifiedScenario] = useState({
    name: 'Modified Flow',
    modifications: []
  });
  const [comparisonResults, setComparisonResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const response = await fetch('http://localhost:3000/scenarios/list');
      const data = await response.json();
      setScenarios(data.scenarios || []);
    } catch (error) {
      console.error('Failed to fetch scenarios:', error);
    }
  };

  const addModification = (type) => {
    const modification = {
      id: Date.now(),
      type: type,
      description: getModificationDescription(type)
    };

    setModifiedScenario(prev => ({
      ...prev,
      modifications: [...prev.modifications, modification]
    }));
  };

  const removeModification = (id) => {
    setModifiedScenario(prev => ({
      ...prev,
      modifications: prev.modifications.filter(m => m.id !== id)
    }));
  };

  const getModificationDescription = (type) => {
    const descriptions = {
      'remove_step': 'Remove onboarding step',
      'add_verification': 'Add verification step',
      'reorder_steps': 'Reorder steps',
      'add_required_field': 'Add required field',
      'simplify_form': 'Simplify form fields',
      'add_help_text': 'Add help text'
    };
    return descriptions[type] || type;
  };

  const runComparison = async () => {
    if (modifiedScenario.modifications.length === 0) {
      alert('Please add at least one modification');
      return;
    }

    setIsRunning(true);

    try {
      // Simulate running comparison
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mock comparison results
      const mockResults = {
        baseline: {
          completionRate: 0.65,
          avgTime: 45000,
          dropOffRate: 0.35,
          frictionScore: 0.42
        },
        modified: {
          completionRate: 0.78,
          avgTime: 38000,
          dropOffRate: 0.22,
          frictionScore: 0.28
        },
        deltas: {
          completionRate: +0.13,
          avgTime: -7000,
          dropOffRate: -0.13,
          frictionScore: -0.14
        }
      };

      setComparisonResults(mockResults);
    } catch (error) {
      console.error('Comparison error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="scenario-testing">
      <div className="testing-header">
        <h2>🧪 Scenario Testing</h2>
        <p>Experiment with hypothetical flow modifications</p>
      </div>

      <div className="testing-grid">
        {/* Baseline Selection */}
        <div className="testing-card">
          <h3>📊 Baseline Scenario</h3>
          <select
            value={baselineScenario}
            onChange={(e) => setBaselineScenario(e.target.value)}
            className="scenario-select"
          >
            {scenarios.map(scenario => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
          <p className="scenario-desc">
            Current onboarding flow to compare against
          </p>
        </div>

        {/* Modification Builder */}
        <div className="testing-card modifications-card">
          <h3>🔧 Flow Modifications</h3>
          
          <div className="modification-buttons">
            <button onClick={() => addModification('remove_step')} className="mod-btn">
              ➖ Remove Step
            </button>
            <button onClick={() => addModification('add_verification')} className="mod-btn">
              ✅ Add Verification
            </button>
            <button onClick={() => addModification('reorder_steps')} className="mod-btn">
              🔄 Reorder Steps
            </button>
            <button onClick={() => addModification('add_required_field')} className="mod-btn">
              📝 Add Required Field
            </button>
            <button onClick={() => addModification('simplify_form')} className="mod-btn">
              ✨ Simplify Form
            </button>
            <button onClick={() => addModification('add_help_text')} className="mod-btn">
              💡 Add Help Text
            </button>
          </div>

          <div className="modifications-list">
            <h4>Applied Modifications:</h4>
            {modifiedScenario.modifications.length > 0 ? (
              modifiedScenario.modifications.map(mod => (
                <div key={mod.id} className="modification-item">
                  <span className="mod-desc">{mod.description}</span>
                  <button
                    onClick={() => removeModification(mod.id)}
                    className="remove-mod-btn"
                  >
                    ✕
                  </button>
                </div>
              ))
            ) : (
              <p className="no-modifications">No modifications yet</p>
            )}
          </div>

          <button
            onClick={runComparison}
            disabled={isRunning || modifiedScenario.modifications.length === 0}
            className="run-comparison-btn"
          >
            {isRunning ? '⏳ Running...' : '▶️ RUN COMPARISON'}
          </button>
        </div>

        {/* Comparison Results */}
        {comparisonResults && (
          <div className="testing-card results-card">
            <h3>📈 Comparison Results</h3>
            
            <div className="results-grid">
              <ComparisonMetric
                label="Completion Rate"
                baseline={comparisonResults.baseline.completionRate}
                modified={comparisonResults.modified.completionRate}
                delta={comparisonResults.deltas.completionRate}
                format="percentage"
                higherIsBetter={true}
              />
              
              <ComparisonMetric
                label="Avg Time"
                baseline={comparisonResults.baseline.avgTime}
                modified={comparisonResults.modified.avgTime}
                delta={comparisonResults.deltas.avgTime}
                format="time"
                higherIsBetter={false}
              />
              
              <ComparisonMetric
                label="Drop-off Rate"
                baseline={comparisonResults.baseline.dropOffRate}
                modified={comparisonResults.modified.dropOffRate}
                delta={comparisonResults.deltas.dropOffRate}
                format="percentage"
                higherIsBetter={false}
              />
              
              <ComparisonMetric
                label="Friction Score"
                baseline={comparisonResults.baseline.frictionScore}
                modified={comparisonResults.modified.frictionScore}
                delta={comparisonResults.deltas.frictionScore}
                format="decimal"
                higherIsBetter={false}
              />
            </div>

            <div className="results-summary">
              <h4>Summary</h4>
              <p>
                The modified flow shows{' '}
                <strong>
                  {comparisonResults.deltas.completionRate > 0 ? 'improved' : 'decreased'}
                </strong>{' '}
                completion rate and{' '}
                <strong>
                  {comparisonResults.deltas.frictionScore < 0 ? 'reduced' : 'increased'}
                </strong>{' '}
                friction. Time to completion{' '}
                <strong>
                  {comparisonResults.deltas.avgTime < 0 ? 'decreased' : 'increased'}
                </strong>{' '}
                by {comparisonResults.deltas.avgTime != null ? Math.abs(comparisonResults.deltas.avgTime / 1000).toFixed(1) : '0'}s.
              </p>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="testing-card info-card">
          <h3>ℹ️ How It Works</h3>
          <ul className="info-list">
            <li>Select a baseline scenario to compare against</li>
            <li>Add hypothetical modifications to the flow</li>
            <li>Run virtual simulation with modified flow</li>
            <li>Compare metrics: completion rate, time, friction</li>
            <li>No actual portal changes are made</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ComparisonMetric({ label, baseline, modified, delta, format, higherIsBetter }) {
  const formatValue = (value) => {
    if (value == null) return 'N/A';
    if (format === 'percentage') {
      return `${(value * 100).toFixed(1)}%`;
    } else if (format === 'time') {
      return `${(value / 1000).toFixed(1)}s`;
    } else if (format === 'decimal') {
      return value.toFixed(2);
    }
    return value;
  };

  const formatDelta = (value) => {
    if (value == null) return 'N/A';
    const prefix = value > 0 ? '+' : '';
    if (format === 'percentage') {
      return `${prefix}${(value * 100).toFixed(1)}%`;
    } else if (format === 'time') {
      return `${prefix}${(value / 1000).toFixed(1)}s`;
    } else if (format === 'decimal') {
      return `${prefix}${value.toFixed(2)}`;
    }
    return `${prefix}${value}`;
  };

  const isImprovement = higherIsBetter ? delta > 0 : delta < 0;
  const deltaClass = isImprovement ? 'positive' : 'negative';

  return (
    <div className="comparison-metric">
      <div className="metric-label">{label}</div>
      <div className="metric-values">
        <div className="value-row">
          <span className="value-label">Baseline:</span>
          <span className="value">{formatValue(baseline)}</span>
        </div>
        <div className="value-row">
          <span className="value-label">Modified:</span>
          <span className="value">{formatValue(modified)}</span>
        </div>
      </div>
      <div className={`metric-delta ${deltaClass}`}>
        {isImprovement ? '↑' : '↓'} {formatDelta(delta)}
      </div>
    </div>
  );
}

export default ScenarioTesting;
