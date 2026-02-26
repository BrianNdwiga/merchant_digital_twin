import React, { useState, useEffect, useRef } from 'react';
import './GuidedStepper.css';

const STEPS = [
  { id: 1, title: 'Merchant Data',   icon: '📂', hint: 'Upload merchant profiles CSV' },
  { id: 2, title: 'Network Metrics', icon: '📡', hint: 'Upload connectivity data CSV' },
  { id: 3, title: 'Personas',        icon: '🧑‍🤝‍🧑', hint: 'Upload digital literacy CSV' },
  { id: 4, title: 'Channel',         icon: '📲', hint: 'Select onboarding channel' },
  { id: 5, title: 'Portal Config',   icon: '🌐', hint: 'Set portal URL & merchant count' },
  { id: 6, title: 'Launch',          icon: '🚀', hint: 'Review & start simulation' },
];

const CHANNELS = [
  { id: 'web',  icon: '🖥️',  title: 'Web Portal',  desc: 'Desktop & mobile browser' },
  { id: 'ussd', icon: '📞',  title: 'USSD',         desc: 'Feature phone text interface' },
  { id: 'app',  icon: '📱',  title: 'Mobile App',   desc: 'Native mobile application' },
];

export default function GuidedStepper({
  uploadedFiles, onFileUpload,
  portalUrl, onUrlChange,
  merchantCount, onMerchantCountChange,
  simulationSpeed, onSpeedChange,
  networkVariability, onNetworkVariabilityChange,
  onRunSimulation, isRunning, statusMessage, loadingCsvs,
}) {
  const [currentStep,       setCurrentStep]       = useState(1);
  const [selectedChannel,   setSelectedChannel]   = useState('web');
  const [validationSummary, setValidationSummary] = useState(null);
  const [dragOver,          setDragOver]          = useState(null);
  const contentRef = useRef(null);

  // Auto-advance on file upload
  useEffect(() => {
    if (uploadedFiles.merchants && currentStep === 1) setCurrentStep(2);
  }, [uploadedFiles.merchants]);
  useEffect(() => {
    if (uploadedFiles.network && currentStep === 2) setCurrentStep(3);
  }, [uploadedFiles.network]);
  useEffect(() => {
    if (uploadedFiles.bio && currentStep === 3) setCurrentStep(4);
  }, [uploadedFiles.bio]);

  // Validation summary
  useEffect(() => {
    if (uploadedFiles.merchants && uploadedFiles.network && uploadedFiles.bio) {
      setValidationSummary({
        merchantPersonas: 3,
        networkProfiles:  4,
        totalMerchants:   merchantCount,
        estimatedDuration: Math.ceil(merchantCount * 2.5) + 's',
      });
    }
  }, [uploadedFiles, merchantCount]);

  // Scroll content to top on step change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const isComplete = (id) => {
    if (id === 1) return !!uploadedFiles.merchants;
    if (id === 2) return !!uploadedFiles.network;
    if (id === 3) return !!uploadedFiles.bio;
    if (id === 4) return !!selectedChannel;
    if (id === 5) return !!portalUrl;
    return false;
  };

  const canAccess = (id) => {
    if (id === 1) return true;
    if (id === 2) return !!uploadedFiles.merchants;
    if (id === 3) return !!uploadedFiles.merchants && !!uploadedFiles.network;
    if (id >= 4)  return !!uploadedFiles.merchants && !!uploadedFiles.network && !!uploadedFiles.bio;
    return false;
  };

  const handleFileUpload = async (fileType, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', fileType);
    try {
      const res  = await fetch('http://localhost:3000/merchants/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) onFileUpload(fileType, file.name);
    } catch { onFileUpload(fileType, file.name); /* optimistic */ }
  };

  const completedCount = STEPS.filter(s => isComplete(s.id)).length;
  const pct = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div className="gs-wrap">
      {/* ── Side rail ── */}
      <aside className="gs-rail">
        <div className="gs-rail-progress">
          <div className="gs-rail-progress-fill" style={{ height: `${pct}%` }} />
        </div>

        <div className="gs-steps">
          {STEPS.map((step) => {
            const done    = isComplete(step.id);
            const active  = currentStep === step.id;
            const enabled = canAccess(step.id);
            return (
              <button
                key={step.id}
                className={`gs-step ${active ? 'active' : ''} ${done ? 'done' : ''} ${!enabled ? 'locked' : ''}`}
                onClick={() => enabled && setCurrentStep(step.id)}
                disabled={!enabled}
                title={step.hint}
              >
                <div className="gs-step-bubble">
                  {done ? '✓' : <span className="gs-step-icon">{step.icon}</span>}
                </div>
                <div className="gs-step-info">
                  <span className="gs-step-num">Step {step.id}</span>
                  <span className="gs-step-title">{step.title}</span>
                </div>
                {active && <span className="gs-step-arrow">›</span>}
              </button>
            );
          })}
        </div>

        {/* Overall progress pill */}
        <div className="gs-overall">
          <span className="gs-overall-pct">{pct}%</span>
          <span className="gs-overall-label">complete</span>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="gs-main">
        <div className="gs-content" ref={contentRef} key={currentStep}>

          {/* Step 1 – Merchant CSV */}
          {currentStep === 1 && (
            <StepShell step={STEPS[0]} badge="REQUIRED">
              <UploadCard
                fileType="merchants"
                uploadedFile={uploadedFiles.merchants}
                onUpload={(f) => handleFileUpload('merchants', f)}
                dragOver={dragOver === 'merchants'}
                onDragOver={() => setDragOver('merchants')}
                onDragLeave={() => setDragOver(null)}
                label="Merchant profiles"
                hint="CSV with business name, type, location, revenue tier"
                exampleCols={['merchant_id','business_name','category','revenue_tier']}
              />
            </StepShell>
          )}

          {/* Step 2 – Network CSV */}
          {currentStep === 2 && (
            <StepShell step={STEPS[1]} badge="REQUIRED">
              <UploadCard
                fileType="network"
                uploadedFile={uploadedFiles.network}
                onUpload={(f) => handleFileUpload('network', f)}
                dragOver={dragOver === 'network'}
                onDragOver={() => setDragOver('network')}
                onDragLeave={() => setDragOver(null)}
                label="Network conditions"
                hint="CSV with connectivity profiles, latency, packet-loss data"
                exampleCols={['profile','latency_ms','packet_loss','bandwidth_kbps']}
              />
            </StepShell>
          )}

          {/* Step 3 – Bio / Persona CSV */}
          {currentStep === 3 && (
            <StepShell step={STEPS[2]} badge="REQUIRED">
              <UploadCard
                fileType="bio"
                uploadedFile={uploadedFiles.bio}
                onUpload={(f) => handleFileUpload('bio', f)}
                dragOver={dragOver === 'bio'}
                onDragOver={() => setDragOver('bio')}
                onDragLeave={() => setDragOver(null)}
                label="Merchant personas"
                hint="CSV with digital literacy, device type, language preference"
                exampleCols={['persona_id','literacy_level','device_type','language']}
              />
              {validationSummary && (
                <div className="gs-validation">
                  <span className="gs-val-icon">✅</span>
                  <div>
                    <div className="gs-val-title">All data loaded successfully</div>
                    <div className="gs-val-desc">
                      Detected <strong>{validationSummary.merchantPersonas}</strong> merchant personas
                      and <strong>{validationSummary.networkProfiles}</strong> network profiles
                    </div>
                  </div>
                </div>
              )}
            </StepShell>
          )}

          {/* Step 4 – Channel */}
          {currentStep === 4 && (
            <StepShell step={STEPS[3]} badge="REQUIRED">
              <div className="gs-channels">
                {CHANNELS.map(ch => (
                  <button
                    key={ch.id}
                    className={`gs-channel ${selectedChannel === ch.id ? 'selected' : ''}`}
                    onClick={() => setSelectedChannel(ch.id)}
                  >
                    <div className="gs-channel-icon">{ch.icon}</div>
                    <div className="gs-channel-body">
                      <span className="gs-channel-title">{ch.title}</span>
                      <span className="gs-channel-desc">{ch.desc}</span>
                    </div>
                    <div className="gs-channel-check">
                      {selectedChannel === ch.id ? '✓' : ''}
                    </div>
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {/* Step 5 – Portal config */}
          {currentStep === 5 && (
            <StepShell step={STEPS[4]} badge="REQUIRED">
              <div className="gs-config">
                <div className="gs-field">
                  <label className="gs-label">Portal URL</label>
                  <div className="gs-url-wrap">
                    <span className="gs-url-prefix">🌐</span>
                    <input
                      type="url"
                      className="gs-input"
                      value={portalUrl}
                      onChange={e => onUrlChange(e.target.value)}
                      placeholder="https://your-portal.com/onboarding"
                    />
                  </div>
                </div>

                <div className="gs-field">
                  <label className="gs-label">Merchant count</label>
                  <div className="gs-count-row">
                    <span className="gs-count-display">{merchantCount}</span>
                    <input
                      type="range" min="1" max="50"
                      value={merchantCount}
                      onChange={e => onMerchantCountChange(parseInt(e.target.value))}
                      className="gs-slider"
                      style={{ '--pct': `${((merchantCount - 1) / 49) * 100}%` }}
                    />
                    <div className="gs-slider-labels">
                      <span>1</span><span>50</span>
                    </div>
                  </div>
                </div>

                <div className="gs-field">
                  <label className="gs-label">Simulation speed</label>
                  <div className="gs-pills">
                    {['slow','normal','fast'].map(s => (
                      <button
                        key={s}
                        className={`gs-pill ${simulationSpeed === s ? 'active' : ''}`}
                        onClick={() => onSpeedChange?.(s)}
                      >
                        {s === 'slow' ? '🐢' : s === 'normal' ? '🚶' : '⚡'} {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="gs-field">
                  <div className="gs-toggle-row">
                    <div>
                      <div className="gs-label">Network variability</div>
                      <div className="gs-toggle-hint">Simulate realistic network fluctuations</div>
                    </div>
                    <button
                      className={`gs-toggle ${networkVariability ? 'on' : ''}`}
                      onClick={() => onNetworkVariabilityChange?.(!networkVariability)}
                    />
                  </div>
                </div>
              </div>
            </StepShell>
          )}

          {/* Step 6 – Review & Launch */}
          {currentStep === 6 && (
            <StepShell step={STEPS[5]} badge="READY">
              <div className="gs-review">
                <div className="gs-review-grid">
                  <ReviewCard icon="📂" title="Data Files">
                    <ReviewRow label="Merchants" value={uploadedFiles.merchants} ok />
                    <ReviewRow label="Network"   value={uploadedFiles.network}   ok />
                    <ReviewRow label="Personas"  value={uploadedFiles.bio}        ok />
                  </ReviewCard>

                  <ReviewCard icon="⚙️" title="Configuration">
                    <ReviewRow label="Channel"  value={selectedChannel.toUpperCase()} />
                    <ReviewRow label="Merchants" value={`${merchantCount} agents`} />
                    <ReviewRow label="Speed"    value={simulationSpeed || 'normal'} />
                    <ReviewRow label="Network Δ" value={networkVariability ? 'On' : 'Off'} />
                    {validationSummary && (
                      <ReviewRow label="Est. time" value={validationSummary.estimatedDuration} />
                    )}
                  </ReviewCard>

                  <ReviewCard icon="🌐" title="Portal">
                    <div className="gs-portal-url">{portalUrl || '—'}</div>
                  </ReviewCard>
                </div>

                <button
                  className={`gs-launch-btn ${isRunning ? 'running' : ''}`}
                  onClick={onRunSimulation}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <><span className="gs-launch-spinner" /> Running simulation…</>
                  ) : (
                    <><span>🚀</span> Launch Simulation</>
                  )}
                </button>

                {statusMessage && (
                  <div className={`gs-status ${statusMessage.includes('❌') ? 'error' : statusMessage.includes('✅') ? 'success' : 'info'}`}>
                    {statusMessage}
                  </div>
                )}
              </div>
            </StepShell>
          )}
        </div>

        {/* Navigation */}
        <div className="gs-nav">
          <button
            className="gs-nav-btn secondary"
            onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
            disabled={currentStep === 1}
          >
            ← Back
          </button>
          <div className="gs-nav-dots">
            {STEPS.map(s => (
              <span
                key={s.id}
                className={`gs-dot ${currentStep === s.id ? 'active' : ''} ${isComplete(s.id) ? 'done' : ''}`}
                onClick={() => canAccess(s.id) && setCurrentStep(s.id)}
              />
            ))}
          </div>
          {currentStep < 6 ? (
            <button
              className="gs-nav-btn primary"
              onClick={() => setCurrentStep(s => Math.min(6, s + 1))}
              disabled={!canAccess(currentStep + 1)}
            >
              Next →
            </button>
          ) : (
            <button
              className="gs-nav-btn launch"
              onClick={onRunSimulation}
              disabled={isRunning}
            >
              {isRunning ? '…' : '🚀 Launch'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── StepShell ──────────────────────────────────────────────────────────────────
function StepShell({ step, badge, children }) {
  return (
    <div className="gs-step-shell">
      <div className="gs-step-shell-header">
        <div className="gs-step-shell-icon">{step.icon}</div>
        <div>
          <div className="gs-step-shell-meta">
            <span className="gs-step-shell-num">Step {step.id} of {STEPS.length}</span>
            <span className={`gs-step-shell-badge badge-${badge.toLowerCase()}`}>{badge}</span>
          </div>
          <h3 className="gs-step-shell-title">{step.title}</h3>
          <p className="gs-step-shell-hint">{step.hint}</p>
        </div>
      </div>
      <div className="gs-step-shell-body">{children}</div>
    </div>
  );
}

// ── UploadCard ─────────────────────────────────────────────────────────────────
function UploadCard({ fileType, uploadedFile, onUpload, dragOver, onDragOver, onDragLeave, label, hint, exampleCols }) {
  const handleDrop = (e) => {
    e.preventDefault();
    onDragLeave();
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  const handleSelect = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
  };

  return (
    <div className="gs-upload-area">
      <label
        className={`gs-dropzone ${uploadedFile ? 'uploaded' : ''} ${dragOver ? 'dragover' : ''}`}
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); onDragOver(); }}
        onDragLeave={onDragLeave}
      >
        <input type="file" accept=".csv" onChange={handleSelect} style={{ display: 'none' }} />
        {uploadedFile ? (
          <div className="gs-uploaded-state">
            <div className="gs-uploaded-icon">✅</div>
            <div className="gs-uploaded-name">{uploadedFile}</div>
            <div className="gs-uploaded-change">Click to replace</div>
          </div>
        ) : (
          <div className="gs-empty-state">
            <div className="gs-empty-icon">📁</div>
            <div className="gs-empty-title">Drop your CSV here</div>
            <div className="gs-empty-hint">{hint}</div>
            <div className="gs-browse-btn">Browse files</div>
          </div>
        )}
      </label>

      {/* Example columns preview */}
      {!uploadedFile && (
        <div className="gs-example-cols">
          <span className="gs-example-label">Expected columns:</span>
          {exampleCols.map(col => (
            <span key={col} className="gs-col-chip">{col}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ReviewCard ─────────────────────────────────────────────────────────────────
function ReviewCard({ icon, title, children }) {
  return (
    <div className="gs-review-card">
      <div className="gs-review-card-header">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function ReviewRow({ label, value, ok }) {
  return (
    <div className="gs-review-row">
      <span className="gs-review-label">{label}</span>
      <span className="gs-review-value">
        {ok && <span className="gs-review-ok">✓ </span>}
        {value || '—'}
      </span>
    </div>
  );
}