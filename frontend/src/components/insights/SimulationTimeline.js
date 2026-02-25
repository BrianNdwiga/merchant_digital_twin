import React from 'react';
import './SimulationTimeline.css';

function SimulationTimeline({ events }) {

  const getEventIcon = (type) => {
    const iconMap = {
      'ONBOARDING_COMPLETE': '✅',
      'ONBOARDING_FAILED': '❌',
      'PAGE_LOAD': '🌐',
      'PAGE_LOAD_FAILED': '❌',
      'FIELD_FILLED': '✏️',
      'VALIDATION_ERROR': '⚠️',
      'DOCUMENT_UPLOAD_CONFUSION': '😕',
      'NETWORK_DELAY': '📡',
      'TIMEOUT': '⏱️',
      'RETRY_ATTEMPT': '🔄',
      'SIMULATION_START': '🚀',
      'STEP_COMPLETED': '✅',
      'AGENT_ERROR': '💥',
      'ONBOARDING_SUMMARY': '📊',
      'SUMMARY': '📊'
    };
    return iconMap[type] || '📝';
  };

  const getEventClass = (type) => {
    if (type?.includes('COMPLETE') || type?.includes('SUCCESS')) return 'success';
    if (type?.includes('FAILED') || type?.includes('ERROR')) return 'error';
    if (type?.includes('WARNING') || type?.includes('DELAY') || type?.includes('RETRY')) return 'warning';
    return 'info';
  };

  const formatEventForTimeline = (event) => {
    const merchantId = event.merchantId || 'Unknown';
    const eventType = event.event || event.eventType || event.type;
    
    let step = '';
    let result = '';
    let details = '';

    switch (eventType) {
      case 'ONBOARDING_SUMMARY':
      case 'SUMMARY':
        step = 'Onboarding Complete';
        result = event.summary?.success ? 'Success' : 'Failed';
        details = event.summary?.completionTimeMs 
          ? `Completed in ${(event.summary.completionTimeMs / 1000).toFixed(1)}s`
          : '';
        break;
      
      case 'PAGE_LOAD':
        step = 'Portal Access';
        result = 'Loaded';
        details = event.latency ? `${event.latency}ms` : '';
        break;
      
      case 'PAGE_LOAD_FAILED':
        step = 'Portal Access';
        result = 'Failed';
        details = event.error || 'Connection error';
        break;
      
      case 'FIELD_FILLED':
        step = 'Business Details';
        result = 'Submitted';
        details = event.field || '';
        break;
      
      case 'VALIDATION_ERROR':
        step = event.field || 'Form Validation';
        result = 'Error Detected';
        details = 'Retrying...';
        break;
      
      case 'DOCUMENT_UPLOAD_CONFUSION':
        step = 'Document Upload';
        result = 'Confusion Detected';
        details = `Literacy: ${event.digitalLiteracy || 'unknown'}`;
        break;
      
      case 'ONBOARDING_COMPLETE':
        step = 'Onboarding';
        result = 'Success';
        details = event.latency ? `${event.latency}ms` : '';
        break;
      
      case 'ONBOARDING_FAILED':
        step = event.step || 'Onboarding';
        result = 'Failed';
        details = event.error || 'Unknown error';
        break;
      
      case 'NETWORK_DELAY':
        step = 'Network';
        result = 'Delay Detected';
        details = `${event.latency || 0}ms - ${event.networkProfile || 'unknown'}`;
        break;
      
      case 'RETRY_ATTEMPT':
        step = 'Retry';
        result = `Attempt ${event.retryCount || event.attempt || 1}`;
        details = event.networkProfile || '';
        break;
      
      case 'SIMULATION_START':
        step = 'Simulation';
        result = 'Started';
        details = `${event.deviceType || ''} ${event.networkProfile || ''}`.trim();
        break;
      
      default:
        step = eventType;
        result = '';
        details = '';
    }

    return { merchantId, step, result, details };
  };

  if (!events || events.length === 0) {
    return (
      <div className="timeline-empty">
        <div className="empty-icon">⏳</div>
        <p>Waiting for simulation events...</p>
      </div>
    );
  }

  return (
    <div className="simulation-timeline">
      <div className="timeline-header">
        <h3>Simulation Timeline</h3>
        <p className="timeline-subtitle">Live merchant journey events</p>
      </div>
      
      <div className="timeline-events">
        {events.map((event, index) => {
          const { merchantId, step, result, details } = formatEventForTimeline(event);
          const eventClass = getEventClass(event.type || event.event || event.eventType);
          const icon = getEventIcon(event.type || event.event || event.eventType);
          
          return (
            <div key={index} className={`timeline-event ${eventClass}`}>
              <div className="event-time">{event.timestamp}</div>
              <div className="event-icon">{icon}</div>
              <div className="event-content">
                <div className="event-merchant">Merchant #{merchantId}</div>
                <div className="event-step">{step}</div>
                {result && <div className="event-result">{result}</div>}
                {details && <div className="event-details">{details}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SimulationTimeline;
