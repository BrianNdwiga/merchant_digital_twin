import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import SimulationConsole from './components/SimulationConsole';
import LiveInsights from './components/LiveInsights';
import ScenarioTesting from './components/ScenarioTesting';
import MerchantAppConsole from './components/MerchantAppConsole';

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

  const handleNavigate = (tab) => {
    setActiveTab(tab);
  };

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: '🪴' },
    { id: 'console',   label: 'Run Simulation', icon: '🚀' },
    { id: 'insights',  label: 'Live Insights', icon: '🔭' },
    { id: 'testing',   label: 'Scenarios', icon: '🧩' },
    { id: 'merchants-app', label: 'Business App Simulation', icon: '💳' },
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
        <div className="nav-track">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleNavigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {activeTab === item.id && <span className="nav-active-bar" />}
            </button>
          ))}
        </div>
      </nav>

      <main className="app-main">
        <div className="view-wrapper fade-in" key={activeTab}>
          {activeTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {activeTab === 'console'   && <SimulationConsole onNavigate={handleNavigate} />}
          {activeTab === 'insights'  && <LiveInsights />}
          {activeTab === 'testing'   && <ScenarioTesting />}
          {activeTab === 'merchants-app' && <MerchantAppConsole onNavigate={handleNavigate} />}
        </div>
      </main>
    </div>
  );
}

function StatusIndicator({ status }) {
  const map = {
    online:   { color: '#00a651', label: 'Backend Online' },
    offline:  { color: '#ef4444', label: 'Backend Offline' },
    checking: { color: '#f59e0b', label: 'Checking…' },
  };
  const { color, label } = map[status] ?? map.checking;

  return (
    <div className="status-indicator">
      <span
        className="status-dot"
        style={{
          backgroundColor: color,
          //boxShadow: `0 0 0 0 ${color}`,
          animation: status === 'checking' ? 'dotPulse 1.4s ease infinite' : 'none',
        }}
      />
      <span className="status-label">{label}</span>
    </div>
  );
}

export default App;