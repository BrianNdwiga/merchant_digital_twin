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
  events = [];
}

// Get all merchant summaries (final outcomes)
function getMerchantSummaries(scenarioId = null) {
  const summaries = {};
  
  events.forEach(event => {
    if (event.event === 'SUMMARY') {
      // Filter by scenario if specified
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
      message: 'No simulation data available yet'
    };
  }
  
  // Calculate metrics
  const totalMerchants = summaries.length;
  const successfulMerchants = summaries.filter(s => s.success).length;
  const successRate = successfulMerchants / totalMerchants;
  
  const totalCompletionTime = summaries.reduce((sum, s) => sum + (s.completionTimeMs || 0), 0);
  const averageCompletionTimeMs = Math.round(totalCompletionTime / totalMerchants);
  
  const totalAttempts = summaries.reduce((sum, s) => sum + s.totalAttempts, 0);
  const averageRetries = parseFloat((totalAttempts / totalMerchants).toFixed(2));
  
  const totalExperienceScore = summaries.reduce((sum, s) => sum + (s.experienceScore || 0), 0);
  const avgExperienceScore = parseFloat((totalExperienceScore / totalMerchants).toFixed(2));
  
  // Calculate overall experience score using formula
  // experienceScore = (successRate * 0.5) - (avgRetries * 0.1) + (avgExperienceScore * 0.4)
  const calculatedExperienceScore = parseFloat(
    (successRate * 0.5 - (averageRetries - 1) * 0.1 + avgExperienceScore * 0.4).toFixed(2)
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
  
  // Calculate metrics for each network
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
  
  // Calculate metrics for each literacy level
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
  
  // Calculate metrics for each scenario
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

module.exports = {
  storeEvent,
  getEventCount,
  clearEvents,
  getSummaryInsights,
  getInsightsByNetwork,
  getInsightsByLiteracy,
  getInsightsByScenario,
  events  // Export for comparison module
};
