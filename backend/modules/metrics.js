// In-memory storage for simulation events
let events = [];

// Store a simulation event
function storeEvent(event) {
  events.push({
    ...event,
    receivedAt: Date.now()
  });
}

// Get total event count
function getEventCount() {
  return events.length;
}

// Clear all events
function clearEvents() {
  events.length = 0;
}

// Get all merchant summaries (final outcomes)
function getMerchantSummaries(scenarioId = null) {
  const summaries = {};
  
  events.forEach(event => {
    // Accept both 'SUMMARY' and 'ONBOARDING_SUMMARY' event types
    if (event.event === 'SUMMARY' || event.event === 'ONBOARDING_SUMMARY') {
      if (scenarioId && event.scenarioId !== scenarioId) {
        return;
      }
      
      const key = scenarioId ? event.merchantId : `${event.scenarioId}_${event.merchantId}`;
      summaries[key] = {
        ...event.summary,
        scenarioId: event.scenarioId
      };
    }
  });
  
  return Object.values(summaries);
}

// Calculate overall summary insights
function getSummaryInsights(scenarioId = null) {
  const summaries = getMerchantSummaries(scenarioId);
  
  if (summaries.length === 0) {
    return {
      totalMerchants: 0,
      successRate: 0,
      averageCompletionTimeMs: 0,
      averageRetries: 0,
      experienceScore: 0,
      successRatePercent: '0%',
      averageCompletionTimeSec: 0,
      message: 'No simulation data available yet'
    };
  }
  
  const totalMerchants = summaries.length;
  const successfulMerchants = summaries.filter(s => s.success).length;
  const successRate = successfulMerchants / totalMerchants;
  
  const totalCompletionTime = summaries.reduce((sum, s) => sum + (s.completionTimeMs || s.timeBeforeFailure || 0), 0);
  const averageCompletionTimeMs = Math.round(totalCompletionTime / totalMerchants);
  
  const totalAttempts = summaries.reduce((sum, s) => sum + (s.totalAttempts || 0), 0);
  const averageRetries = totalAttempts > 0 ? parseFloat((totalAttempts / totalMerchants).toFixed(2)) : 0;
  
  const totalExperienceScore = summaries.reduce((sum, s) => sum + (s.experienceScore || 0), 0);
  const avgExperienceScore = parseFloat((totalExperienceScore / totalMerchants).toFixed(2));
  
  const calculatedExperienceScore = parseFloat(
    (successRate * 0.5 - (averageRetries > 0 ? (averageRetries - 1) * 0.1 : 0) + avgExperienceScore * 0.4).toFixed(2)
  );
  
  return {
    totalMerchants,
    successRate: parseFloat(successRate.toFixed(2)),
    successRatePercent: `${(successRate * 100).toFixed(1)}%`,
    averageCompletionTimeMs,
    averageCompletionTimeSec: parseFloat((averageCompletionTimeMs / 1000).toFixed(1)),
    averageRetries,
    experienceScore: calculatedExperienceScore,
    avgIndividualExperienceScore: avgExperienceScore
  };
}

// Get insights grouped by network profile
function getInsightsByNetwork() {
  const summaries = getMerchantSummaries();
  
  if (summaries.length === 0) {
    return { message: 'No simulation data available yet' };
  }
  
  const networkGroups = {};
  
  summaries.forEach(summary => {
    const network = summary.networkProfile || 'unknown';
    
    if (!networkGroups[network]) {
      networkGroups[network] = {
        total: 0,
        successful: 0,
        failed: 0,
        totalAttempts: 0,
        totalCompletionTime: 0,
        totalExperienceScore: 0
      };
    }
    
    const group = networkGroups[network];
    group.total++;
    
    if (summary.success) {
      group.successful++;
    } else {
      group.failed++;
    }
    
    group.totalAttempts += summary.totalAttempts;
    group.totalCompletionTime += summary.completionTimeMs || 0;
    group.totalExperienceScore += summary.experienceScore || 0;
  });
  
  const insights = {};
  
  Object.keys(networkGroups).forEach(network => {
    const group = networkGroups[network];
    
    insights[network] = {
      totalMerchants: group.total,
      successRate: parseFloat((group.successful / group.total).toFixed(2)),
      failureRate: parseFloat((group.failed / group.total).toFixed(2)),
      failureRatePercent: `${((group.failed / group.total) * 100).toFixed(1)}%`,
      avgAttempts: parseFloat((group.totalAttempts / group.total).toFixed(2)),
      avgCompletionTimeMs: Math.round(group.totalCompletionTime / group.total),
      avgExperienceScore: parseFloat((group.totalExperienceScore / group.total).toFixed(2))
    };
  });
  
  return insights;
}

// Get insights grouped by digital literacy
function getInsightsByLiteracy() {
  const summaries = getMerchantSummaries();
  
  if (summaries.length === 0) {
    return { message: 'No simulation data available yet' };
  }
  
  const literacyGroups = {};
  
  summaries.forEach(summary => {
    const literacy = summary.digitalLiteracy || 'unknown';
    
    if (!literacyGroups[literacy]) {
      literacyGroups[literacy] = {
        total: 0,
        successful: 0,
        failed: 0,
        totalAttempts: 0,
        totalCompletionTime: 0,
        totalExperienceScore: 0
      };
    }
    
    const group = literacyGroups[literacy];
    group.total++;
    
    if (summary.success) {
      group.successful++;
    } else {
      group.failed++;
    }
    
    group.totalAttempts += summary.totalAttempts;
    group.totalCompletionTime += summary.completionTimeMs || 0;
    group.totalExperienceScore += summary.experienceScore || 0;
  });
  
  const insights = {};
  
  Object.keys(literacyGroups).forEach(literacy => {
    const group = literacyGroups[literacy];
    
    insights[literacy] = {
      totalMerchants: group.total,
      successRate: parseFloat((group.successful / group.total).toFixed(2)),
      failureRate: parseFloat((group.failed / group.total).toFixed(2)),
      failureRatePercent: `${((group.failed / group.total) * 100).toFixed(1)}%`,
      avgAttempts: parseFloat((group.totalAttempts / group.total).toFixed(2)),
      avgCompletionTimeMs: Math.round(group.totalCompletionTime / group.total),
      avgExperienceScore: parseFloat((group.totalExperienceScore / group.total).toFixed(2))
    };
  });
  
  return insights;
}

// Get insights grouped by scenario/issue type
function getInsightsByScenario() {
  const summaries = getMerchantSummaries();
  
  if (summaries.length === 0) {
    return { message: 'No simulation data available yet' };
  }
  
  const scenarioGroups = {};
  
  summaries.forEach(summary => {
    const scenario = summary.issueType || 'unknown';
    
    if (!scenarioGroups[scenario]) {
      scenarioGroups[scenario] = {
        total: 0,
        successful: 0,
        failed: 0,
        totalAttempts: 0,
        totalCompletionTime: 0,
        totalExperienceScore: 0
      };
    }
    
    const group = scenarioGroups[scenario];
    group.total++;
    
    if (summary.success) {
      group.successful++;
    } else {
      group.failed++;
    }
    
    group.totalAttempts += summary.totalAttempts;
    group.totalCompletionTime += summary.completionTimeMs || 0;
    group.totalExperienceScore += summary.experienceScore || 0;
  });
  
  const insights = {};
  
  Object.keys(scenarioGroups).forEach(scenario => {
    const group = scenarioGroups[scenario];
    
    insights[scenario] = {
      totalMerchants: group.total,
      successRate: parseFloat((group.successful / group.total).toFixed(2)),
      failureRate: parseFloat((group.failed / group.total).toFixed(2)),
      failureRatePercent: `${((group.failed / group.total) * 100).toFixed(1)}%`,
      avgAttempts: parseFloat((group.totalAttempts / group.total).toFixed(2)),
      avgCompletionTimeMs: Math.round(group.totalCompletionTime / group.total),
      avgExperienceScore: parseFloat((group.totalExperienceScore / group.total).toFixed(2))
    };
  });
  
  return insights;
}

// Get recent events for live log display
function getRecentEvents(limit = 50) {
  // Return most recent events with all fields preserved for BPMN visualization
  return events
    .slice(-limit)
    .reverse()
    .map(event => ({
      merchantId:     event.merchantId,
      event:          event.event,
      eventType:      event.eventType || event.event,
      timestamp:      event.timestamp || event.receivedAt,
      step:           event.step,
      field:          event.field,
      error:          event.error,
      reason:         event.reason,
      retryCount:     event.retryCount,
      latency:        event.latency,
      loadTimeMs:     event.loadTimeMs,
      scenarioId:     event.scenarioId,
      networkProfile: event.networkProfile,
      digitalLiteracy: event.digitalLiteracy,
      deviceType:     event.deviceType,
      summary:        event.summary,
    }));
}

module.exports = {
  storeEvent,
  getEventCount,
  clearEvents,
  getSummaryInsights,
  getInsightsByNetwork,
  getInsightsByLiteracy,
  getInsightsByScenario,
  getRecentEvents,
  events
};
