import React, { useState, useEffect } from 'react';
import './GuidedStepper.css';

function GuidedStepper({ 
  uploadedFiles, 
  onFileUpload, 
  portalUrl, 
  onUrlChange,
  merchantCount,
  onMerchantCountChange,
  onRunSimulation,
  isRunning,
  statusMessage
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [validationSummary, setValidationSummary] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState('web');

  const steps = [
    { id: 1, title: 'Upload Merchant CSV', icon: '📊' },
    { id: 2, title: 'Upload Network Metrics', icon: '📡' },
    { id: 3, title: 'Upload Bio/Persona CSV', icon: '👥' },
    { id: 4, title: 'Select Channel', icon: '📱' },
    { id: 5, title: 'Configure Portal', icon: '🌐' },
    { id: 6, title: 'Review & Run', icon: '✅' }
  ];

  useEffect(() => {
    // Auto-advance when files are uploaded
    if (uploadedFiles.merchants && currentStep === 1) {
      setCurrentStep(2);
    }
    if (uploadedFiles.network && currentStep === 2) {
      setCurrentStep(3);
    }
    if (uploadedFiles.bio && currentStep === 3) {
      setCurrentStep(4);
    }
  }, [uploadedFiles, currentStep]);

  useEffect(() => {
    // Generate validation summary when all files are uploaded
    if (uploadedFiles.merchants && uploadedFiles.network && uploadedFiles.bio) {
      generateValidationSummary();
    }
  }, [uploadedFiles]);

  const generateValidationSummary = () => {
    // Mock validation - in real app, this would come from backend
    setValidationSummary({
      merchantPersonas: 3,
      networkProfiles: 4,
      totalMerchants: merchantCount,
      estimatedDuration: Math.ceil(merchantCount * 2.5) + 's'
    });
  };

  const handleFileUpload = async (fileType, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', fileType);

    try {
      const response = await fetch('http://localhost:3000/merchants/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        onFileUpload(fileType, file.name);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const canProceedToStep = (stepId) => {
    switch (stepId) {
      case 1: return true;
      case 2: return uploadedFiles.merchants;
      case 3: return uploadedFiles.merchants && uploadedFiles.network;
      case 4: return uploadedFiles.merchants && uploadedFiles.network && uploadedFiles.bio;
      case 5: return uploadedFiles.merchants && uploadedFiles.network && uploadedFiles.bio;
      case 6: return uploadedFiles.merchants && uploadedFiles.network && uploadedFiles.bio && portalUrl;
      default: return false;
    }
  };

  const isStepComplete = (stepId) => {
    switch (stepId) {
      case 1: return uploadedFiles.merchants;
      case 2: return uploadedFiles.network;
      case 3: return uploadedFiles.bio;
      case 4: return selectedChannel;
      case 5: return portalUrl;
      case 6: return false;
      default: return false;
    }
  };

  return (
    <div className="guided-stepper">
      <div className="stepper-header">
        <h2>Run Simulation</h2>
        <p>Follow the steps to configure and launch your merchant simulation</p>
      </div>

      <div className="stepper-progress">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div 
              className={`step-indicator ${currentStep === step.id ? 'active' : ''} ${isStepComplete(step.id) ? 'complete' : ''} ${canProceedToStep(step.id) ? 'enabled' : 'disabled'}`}
              onClick={() => canProceedToStep(step.id) && setCurrentStep(step.id)}
            >
              <div className="step-number">
                {isStepComplete(step.id) ? '✓' : step.id}
              </div>
              <div className="step-title">{step.title}</div>
            </div>
            {index < steps.length - 1 && (
              <div className={`step-connector ${isStepComplete(step.id) ? 'complete' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="stepper-content">
        {currentStep === 1 && (
          <StepContent
            icon="📊"
            title="Upload Merchant Data CSV"
            description="Upload a CSV file containing merchant profiles with business details and characteristics"
          >
            <FileUploadZone
              fileType="merchants"
              uploadedFile={uploadedFiles.merchants}
              onUpload={(file) => handleFileUpload('merchants', file)}
              accept=".csv"
            />
          </StepContent>
        )}

        {currentStep === 2 && (
          <StepContent
            icon="📡"
            title="Upload Network Metrics CSV"
            description="Upload network conditions data to simulate various connectivity scenarios"
          >
            <FileUploadZone
              fileType="network"
              uploadedFile={uploadedFiles.network}
              onUpload={(file) => handleFileUpload('network', file)}
              accept=".csv"
            />
          </StepContent>
        )}

        {currentStep === 3 && (
          <StepContent
            icon="👥"
            title="Upload Bio/Persona CSV"
            description="Upload merchant personas with digital literacy levels and behavioral patterns"
          >
            <FileUploadZone
              fileType="bio"
              uploadedFile={uploadedFiles.bio}
              onUpload={(file) => handleFileUpload('bio', file)}
              accept=".csv"
            />
            {validationSummary && (
              <div className="validation-summary">
                <h4>✅ Data Loaded Successfully</h4>
                <p>Detected {validationSummary.merchantPersonas} merchant personas and {validationSummary.networkProfiles} network profiles</p>
              </div>
            )}
          </StepContent>
        )}

        {currentStep === 4 && (
          <StepContent
            icon="📱"
            title="Select Channel"
            description="Choose the onboarding channel to simulate"
          >
            <div className="channel-selector">
              <ChannelOption
                id="web"
                icon="🌐"
                title="Web Portal"
                description="Desktop/mobile browser experience"
                selected={selectedChannel === 'web'}
                onClick={() => setSelectedChannel('web')}
              />
              <ChannelOption
                id="ussd"
                icon="📞"
                title="USSD"
                description="Feature phone text interface"
                selected={selectedChannel === 'ussd'}
                onClick={() => setSelectedChannel('ussd')}
              />
              <ChannelOption
                id="app"
                icon="📱"
                title="Mobile App"
                description="Native mobile application"
                selected={selectedChannel === 'app'}
                onClick={() => setSelectedChannel('app')}
              />
            </div>
          </StepContent>
        )}

        {currentStep === 5 && (
          <StepContent
            icon="🌐"
            title="Enter Onboarding Portal URL"
            description="Provide the URL of the merchant onboarding portal to test"
          >
            <div className="url-input-container">
              <input
                type="url"
                className="url-input"
                value={portalUrl}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://your-portal.com/onboarding"
              />
              <div className="merchant-count-control">
                <label>Number of Merchants to Simulate:</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={merchantCount}
                  onChange={(e) => onMerchantCountChange(parseInt(e.target.value))}
                />
              </div>
            </div>
          </StepContent>
        )}

        {currentStep === 6 && (
          <StepContent
            icon="✅"
            title="Review & Run Simulation"
            description="Review your configuration and start the simulation"
          >
            <div className="review-summary">
              <div className="summary-section">
                <h4>📊 Data Files</h4>
                <ul>
                  <li>✅ Merchants: {uploadedFiles.merchants}</li>
                  <li>✅ Network: {uploadedFiles.network}</li>
                  <li>✅ Personas: {uploadedFiles.bio}</li>
                </ul>
              </div>
              <div className="summary-section">
                <h4>⚙️ Configuration</h4>
                <ul>
                  <li>Channel: {selectedChannel.toUpperCase()}</li>
                  <li>Portal: {portalUrl}</li>
                  <li>Merchants: {merchantCount}</li>
                  {validationSummary && (
                    <li>Est. Duration: {validationSummary.estimatedDuration}</li>
                  )}
                </ul>
              </div>
            </div>
            <button
              className="run-simulation-btn"
              onClick={onRunSimulation}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <span className="spinner-small"></span>
                  Running Simulation...
                </>
              ) : (
                <>
                  <span className="btn-icon">▶️</span>
                  Start Simulation
                </>
              )}
            </button>
            {statusMessage && (
              <div className="status-message">{statusMessage}</div>
            )}
          </StepContent>
        )}
      </div>

      <div className="stepper-navigation">
        <button
          className="nav-btn secondary"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          ← Previous
        </button>
        <button
          className="nav-btn primary"
          onClick={() => setCurrentStep(Math.min(6, currentStep + 1))}
          disabled={!canProceedToStep(currentStep + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function StepContent({ icon, title, description, children }) {
  return (
    <div className="step-content-wrapper">
      <div className="step-content-header">
        <div className="step-icon">{icon}</div>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="step-content-body">
        {children}
      </div>
    </div>
  );
}

function FileUploadZone({ fileType, uploadedFile, onUpload, accept }) {
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
  };

  return (
    <div
      className={`file-upload-zone ${uploadedFile ? 'uploaded' : ''}`}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {uploadedFile ? (
        <div className="upload-success">
          <div className="success-icon">✅</div>
          <div className="file-name">{uploadedFile}</div>
          <label className="change-file-btn">
            Change File
            <input
              type="file"
              accept={accept}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      ) : (
        <>
          <div className="upload-icon">📁</div>
          <p>Drag & drop your CSV file here</p>
          <label className="upload-btn">
            Browse Files
            <input
              type="file"
              accept={accept}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </label>
        </>
      )}
    </div>
  );
}

function ChannelOption({ id, icon, title, description, selected, onClick }) {
  return (
    <div
      className={`channel-option ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="channel-icon">{icon}</div>
      <div className="channel-info">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <div className="channel-check">{selected ? '✓' : ''}</div>
    </div>
  );
}

export default GuidedStepper;
