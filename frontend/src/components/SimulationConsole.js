import React, { useState, useEffect } from 'react';
import './SimulationConsole.css';
import GuidedStepper from './simulation/GuidedStepper';

function SimulationConsole({ onNavigate, showToast }) {
  const [uploadedFiles, setUploadedFiles] = useState({ merchants: null, network: null, bio: null });
  const [portalUrl, setPortalUrl]         = useState('http://localhost:3000/mock-portal/index.html');
  const [merchantCount, setMerchantCount] = useState(5);
  const [simulationSpeed, setSimulationSpeed]       = useState('normal');
  const [networkVariability, setNetworkVariability] = useState(true);
  const [isRunning, setIsRunning]         = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType]       = useState('idle'); // idle | success | error | loading
  const [loadingCsvs, setLoadingCsvs]     = useState(true);
  const [preFilledFiles, setPreFilledFiles] = useState({});
  const [progress, setProgress]           = useState(null); // 0-100 during run

  useEffect(() => { checkAvailableCsvs(); }, []);

  const setStatus = (msg, type = 'idle') => {
    setStatusMessage(msg);
    setStatusType(type);
  };

  const checkAvailableCsvs = async () => {
    try {
      const response = await fetch('http://localhost:3000/merchants/available-csvs');
      const data     = await response.json();
      if (data.csvFiles) {
        const newFiles    = {};
        const newPrefilled = {};
        for (const [type, fileInfo] of Object.entries(data.csvFiles)) {
          if (fileInfo?.fileName) {
            newFiles[type]     = fileInfo.fileName;
            newPrefilled[type] = true;
          }
        }
        if (Object.keys(newFiles).length > 0) {
          setUploadedFiles(prev => ({ ...prev, ...newFiles }));
          setPreFilledFiles(newPrefilled);
          if (newFiles.merchants) {
            try {
              const loadRes  = await fetch('http://localhost:3000/merchants/load-default', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: newFiles.merchants }),
              });
              if (loadRes.ok) {
                const loadData = await loadRes.json();
                const names    = Object.values(newFiles).join(', ');
                setStatus(`✅ Loaded ${loadData.merchantCount} merchants from ${names}`, 'success');
                showToast?.(`${loadData.merchantCount} merchants loaded`, 'success');
              } else {
                setStatus(`⚠️ Found CSV files but failed to load`, 'error');
              }
            } catch {
              setStatus(`⚠️ Found CSV files (click to upload manually)`, 'error');
            }
          } else {
            const names = Object.values(newFiles).join(', ');
            setStatus(`📁 Found existing CSV files: ${names}`, 'idle');
          }
        }
      }
    } catch { /* silent */ }
    finally { setLoadingCsvs(false); }
  };

  const handleFileUpload = (fileType, fileName) => {
    setUploadedFiles(prev => ({ ...prev, [fileType]: fileName }));
    setStatus(`✅ Uploaded ${fileName}`, 'success');
    showToast?.(`Uploaded ${fileName}`, 'success');
  };

  const handleRunSimulation = async () => {
    if (!uploadedFiles.merchants) {
      setStatus('❌ Please upload merchant data CSV first', 'error');
      showToast?.('Upload merchant CSV first', 'error');
      return;
    }
    setIsRunning(true);
    setProgress(10);
    setStatus('🚀 Starting simulation…', 'loading');

    try {
      // Fake progress ticks while waiting
      const ticker = setInterval(() => setProgress(p => Math.min((p ?? 10) + 8, 85)), 400);

      const response = await fetch('http://localhost:3000/simulate/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantCount, portalUrl, simulationSpeed, networkVariability }),
      });
      const data = await response.json();
      clearInterval(ticker);

      if (data.success) {
        setProgress(100);
        setStatus(`✅ Simulation started — ${data.merchantCount} agents spawned`, 'success');
        showToast?.(`${data.merchantCount} agents launched 🚀`, 'success');
        setTimeout(() => { onNavigate?.('insights'); }, 1600);
      } else {
        setProgress(null);
        setStatus(`❌ ${data.message}`, 'error');
        showToast?.('Simulation failed', 'error');
      }
    } catch (err) {
      setProgress(null);
      setStatus(`❌ Error: ${err.message}`, 'error');
      showToast?.('Connection error', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="simulation-console">
      {/* Page header */}
      <div className="console-header">
        <div className="console-header-left">
          <h2>Run <span>Simulation</span></h2>
          <p>// configure agents and launch onboarding simulation</p>
        </div>
        {uploadedFiles.merchants && (
          <div className="console-ready-badge">
            <span className="ready-dot" />
            Ready to launch
          </div>
        )}
      </div>

      {/* Status bar */}
      {statusMessage && (
        <div className={`console-status-bar status-${statusType}`}>
          {statusType === 'loading' && <span className="status-spinner" />}
          <span className="status-text">{statusMessage}</span>
        </div>
      )}

      {/* Progress bar */}
      {progress !== null && (
        <div className="console-progress-wrap">
          <div className="console-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Main stepper */}
      <GuidedStepper
        uploadedFiles={uploadedFiles}
        onFileUpload={handleFileUpload}
        portalUrl={portalUrl}
        onUrlChange={setPortalUrl}
        merchantCount={merchantCount}
        onMerchantCountChange={setMerchantCount}
        simulationSpeed={simulationSpeed}
        onSpeedChange={setSimulationSpeed}
        networkVariability={networkVariability}
        onNetworkVariabilityChange={setNetworkVariability}
        onRunSimulation={handleRunSimulation}
        isRunning={isRunning}
        statusMessage={statusMessage}
        loadingCsvs={loadingCsvs}
      />
    </div>
  );
}

export default SimulationConsole;