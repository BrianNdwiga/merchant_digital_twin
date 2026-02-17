// Scenario comparison engine

const { getSummaryInsights } = require('./metrics');

// Compare two scenarios and provide recommendations
function compareScenarios(scenarioA, scenarioB) {
  // Get insights for both scenarios
  const insightsA = getSummaryInsights(scenarioA);
  const insightsB = getSummaryInsights(scenarioB);
  
  // Check if both scenarios have data
  if (insightsA.totalMerchants === 0 || insightsB.totalMerchants === 0) {
    return {
      error: 'Insufficient data',
      message: `Missing simulation data for one or both scenarios`,
      scenarioA: {
        id: scenarioA,
        hasMerchants: insightsA.totalMerchants
      },
      scenarioB: {
        id: scenarioB,
        hasMerchants: insightsB.totalMerchants
      }
    };
  }
  
  // Calculate deltas
  const successRateImprovement = parseFloat((insightsB.successRate - insightsA.successRate).toFixed(3));
  const successRateImprovementPercent = `${(successRateImprovement * 100).toFixed(1)}%`;
  
  const retryReduction = parseFloat((insightsA.averageRetries - insightsB.averageRetries).toFixed(2));
  const retryReductionPercent = insightsA.averageRetries > 0 
    ? `${((retryReduction / insightsA.averageRetries) * 100).toFixed(1)}%`
    : '0%';
  
  const completionTimeDelta = insightsA.averageCompletionTimeMs - insightsB.averageCompletionTimeMs;
  const completionTimeDeltaSec = parseFloat((completionTimeDelta / 1000).toFixed(2));
  const completionTimeImprovement = completionTimeDelta > 0;
  
  const experienceScoreDelta = parseFloat((insightsB.experienceScore - insightsA.experienceScore).toFixed(3));
  
  // Determine recommended scenario
  // Primary: Experience score
  // Secondary: Success rate
  // Tertiary: Completion time
  let recommendedScenario = scenarioA;
  let recommendationReason = '';
  
  if (experienceScoreDelta > 0.05) {
    recommendedScenario = scenarioB;
    recommendationReason = `Higher experience score (+${experienceScoreDelta})`;
  } else if (experienceScoreDelta < -0.05) {
    recommendedScenario = scenarioA;
    recommendationReason = `Higher experience score (${scenarioA} leads by ${Math.abs(experienceScoreDelta)})`;
  } else if (successRateImprovement > 0.05) {
    recommendedScenario = scenarioB;
    recommendationReason = `Better success rate (+${successRateImprovementPercent})`;
  } else if (successRateImprovement < -0.05) {
    recommendedScenario = scenarioA;
    recommendationReason = `Better success rate`;
  } else if (completionTimeImprovement) {
    recommendedScenario = scenarioB;
    recommendationReason = `Faster completion time (-${Math.abs(completionTimeDeltaSec)}s)`;
  } else {
    recommendedScenario = scenarioA;
    recommendationReason = 'Baseline performance is adequate';
  }
  
  // Calculate confidence level
  const sampleSize = Math.min(insightsA.totalMerchants, insightsB.totalMerchants);
  let confidence = 'LOW';
  if (sampleSize >= 50) confidence = 'HIGH';
  else if (sampleSize >= 20) confidence = 'MEDIUM';
  
  return {
    scenarioA: {
      id: scenarioA,
      totalMerchants: insightsA.totalMerchants,
      successRate: insightsA.successRate,
      successRatePercent: insightsA.successRatePercent,
      averageRetries: insightsA.averageRetries,
      averageCompletionTimeMs: insightsA.averageCompletionTimeMs,
      averageCompletionTimeSec: insightsA.averageCompletionTimeSec,
      experienceScore: insightsA.experienceScore
    },
    scenarioB: {
      id: scenarioB,
      totalMerchants: insightsB.totalMerchants,
      successRate: insightsB.successRate,
      successRatePercent: insightsB.successRatePercent,
      averageRetries: insightsB.averageRetries,
      averageCompletionTimeMs: insightsB.averageCompletionTimeMs,
      averageCompletionTimeSec: insightsB.averageCompletionTimeSec,
      experienceScore: insightsB.experienceScore
    },
    comparison: {
      successRateImprovement,
      successRateImprovementPercent,
      retryReduction,
      retryReductionPercent,
      completionTimeDelta,
      completionTimeDeltaSec,
      completionTimeImprovement,
      experienceScoreDelta
    },
    recommendation: {
      recommendedScenario,
      reason: recommendationReason,
      confidence,
      sampleSize
    }
  };
}

// Get list of all scenarios that have data
function getAvailableScenarios() {
  const { events } = require('./metrics');
  const scenarios = new Set();
  
  events.forEach(event => {
    if (event.scenarioId) {
      scenarios.add(event.scenarioId);
    }
  });
  
  return Array.from(scenarios);
}

module.exports = {
  compareScenarios,
  getAvailableScenarios
};
