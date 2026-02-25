import React, { useState } from 'react';
import './SimulationConsole.css';
import GuidedStepper from './simulation/GuidedStepper';

function SimulationConsole({ onNavigate }) {
  const [uploadedFiles, setUploadedFiles] = useState({
    merchants: null,
    network: null,
    bio: null
  });
  const [portalUrl, setPortalUrl] = useState('http://localhost:3000/mock-portal/index.html');
  const [merchantCount, setMerchantCount] = useState(5);
  const [simulationSpeed, setSimulationSpeed] = useState('normal');
  const [networkVariability, setNetworkVariability] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [loadingCsvs, setLoadingCsvs] = useState(true);
  const [preFilledFiles, setPreFilledFiles] = useState({});

  // Check for available CSV files on mount
  React.useEffect(() => {
    checkAvailableCsvs();
  }, []);

  const checkAvailableCsvs = async () => {
    try {
      const response = await fetch('http://localhost:3000/merchants/available-csvs');
      const data = await response.json();
      
      if (data.csvFiles) {
        const newUploadedFiles = {};
        const newPreFilledFiles = {};
        
        for (const [type, fileInfo] of Object.entries(data.csvFiles)) {
          if (fileInfo && fileInfo.fileName) {
            newUploadedFiles[type] = fileInfo.fileName;
            newPreFilledFiles[type] = true;
          }
        }
        
        if (Object.keys(newUploadedFiles).length > 0) {
          setUploadedFiles(prev => ({ ...prev, ...newUploadedFiles }));
          setPreFilledFiles(newPreFilledFiles);
          
          // Load the merchant data into backend cache if merchants file is found
          if (newUploadedFiles.merchants) {
            try {
              const loadResponse = await fetch('http://localhost:3000/merchants/load-default', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: newUploadedFiles.merchants })
              });
              
              if (loadResponse.ok) {
                const loadData = await loadResponse.json();
                console.log(`✅ Loaded ${loadData.merchantCount} merchants from ${newUploadedFiles.merchants}`);
                
                const fileNames = Object.values(newUploadedFiles).join(', ');
                setStatusMessage(`✅ Loaded ${loadData.merchantCount} merchants from pre-existing files: ${fileNames}`);
              } else {
                const fileNames = Object.values(newUploadedFiles).join(', ');
                setStatusMessage(`⚠️ Found CSV files but failed to load: ${fileNames}`);
              }
            } catch (loadError) {
              console.error('Error loading default merchants:', loadError);
              const fileNames = Object.values(newUploadedFiles).join(', ');
              setStatusMessage(`⚠️ Found CSV files: ${fileNames} (Click to upload manually)`);
            }
          } else {
            const fileNames = Object.values(newUploadedFiles).join(', ');
            setStatusMessage(`📁 Found existing CSV files: ${fileNames}`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking available CSVs:', error);
    } finally {
      setLoadingCsvs(false);
    }
  };

  const handleFileUpload = (fileType, fileName) => {
    setUploadedFiles(prev => ({ ...prev, [fileType]: fileName }));
    setStatusMessage(`✅ Uploaded ${fileName}`);
  };

  const handleRunSimulation = async () => {
    if (!uploadedFiles.merchants) {
      setStatusMessage('❌ Please upload merchant data CSV first');
      return;
    }

    setIsRunning(true);
    setStatusMessage('🚀 Starting simulation...');

    try {
      const response = await fetch('http://localhost:3000/simulate/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantCount,
          portalUrl,
          simulationSpeed,
          networkVariability
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setStatusMessage(`✅ Simulation started - ${data.merchantCount} agents spawned`);
        
        // Navigate to Live Insights page after successful start
        setTimeout(() => {
          if (onNavigate) {
            onNavigate('insights');
          }
        }, 1500); // Give user time to see success message
      } else {
        setStatusMessage(`❌ Simulation failed: ${data.message}`);
      }
    } catch (error) {
      setStatusMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="simulation-console">
      <GuidedStepper
        uploadedFiles={uploadedFiles}
        onFileUpload={handleFileUpload}
        portalUrl={portalUrl}
        onUrlChange={setPortalUrl}
        merchantCount={merchantCount}
        onMerchantCountChange={setMerchantCount}
        onRunSimulation={handleRunSimulation}
        isRunning={isRunning}
        statusMessage={statusMessage}
      />
    </div>
  );
}

export default SimulationConsole;
