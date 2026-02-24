import React from 'react';
import './UrlInput.css';

function UrlInput({ portalUrl, onUrlChange }) {
  return (
    <div className="url-input">
      <h3>🔗 Portal Configuration</h3>
      <label>Onboarding Portal URL</label>
      <input
        type="text"
        value={portalUrl}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="http://localhost:3000/mock-portal/index.html"
        className="portal-input"
      />
      <p className="input-hint">Local file path or URL where agents will attempt onboarding</p>
    </div>
  );
}

export default UrlInput;
