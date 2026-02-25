import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import SimulationConsole from './components/SimulationConsole';
import LiveInsights from './components/LiveInsights';
import ScenarioTesting from './components/ScenarioTesting';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('http://localhost:3000/health');
        const data = await res.json();
        setBackendStatus(data.status === 'healthy' ? 'online' : 'offline');
      } catch {
        setBackendStatus('offline');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'console', label: 'Run Simulation', icon: '▶️' },
    { id: 'insights', label: 'Live Insights', icon: '📈' },
    { id: 'testing', label: 'Scenarios', icon: '🧪' }
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">🎯</div>
          <div className="brand-text">
            <h1>Merchant Digital Twin</h1>
            <p>Simulation Control Platform</p>
          </div>
        </div>
        <div className="header-status">
          <StatusIndicator status={backendStatus} />
        </div>
      </header>

      <nav className="app-nav">
        {navigation.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="app-main">
        {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === 'console' && <SimulationConsole onNavigate={setActiveTab} />}
        {activeTab === 'insights' && <LiveInsights />}
        {activeTab === 'testing' && <ScenarioTesting />}
      </main>
    </div>
  );
}

function StatusIndicator({ status }) {
  const colors = {
    online: '#4ade80',
    offline: '#ef4444',
    checking: '#fbbf24'
  };

  return (
    <div className="status-indicator">
      <div 
        className="status-dot" 
        style={{ 
          backgroundColor: colors[status],
          animation: status === 'checking' ? 'pulse 1.5s infinite' : 'none'
        }}
      />
      <span className="status-label">
        {status === 'online' ? 'Backend Online' : status === 'offline' ? 'Backend Offline' : 'Checking...'}
      </span>
    </div>
  );
}

export default App;
