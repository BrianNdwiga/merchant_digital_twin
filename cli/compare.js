#!/usr/bin/env node

// CLI Scenario Comparison Tool - Compares two simulation scenarios

const INSIGHT_SERVICE_URL = process.env.INSIGHT_SERVICE_URL || 'http://localhost:3000';

// Fetch data from Insight Service
async function fetchData(endpoint) {
  try {
    const response = await fetch(`${INSIGHT_SERVICE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`❌ Failed to fetch ${endpoint}:`, error.message);
    return null;
  }
}

// Format percentage
function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

// Print section header
function printHeader(title) {
  console.log('\n' + '═'.repeat(70));
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
}

// Print subsection
function printSubsection(title) {
  console.log('\n' + '─'.repeat(70));
  console.log(`  ${title}`);
  console.log('─'.repeat(70));
}

// Generate and display the comparison report
async function generateComparisonReport() {
  console.clear();
  
  printHeader('SCENARIO COMPARISON REPORT');
  console.log(`  Generated: ${new Date().toLocaleString()}`);
  console.log(`  Insight Service: ${INSIGHT_SERVICE_URL}`);
  
  // Step 1: Get available scenarios
  console.log('\n📊 Fetching available scenarios...\n');
  
  const scenariosData = await fetchData('/insights/scenarios');
  
  if (!scenariosData || scenariosData.scenarios.length === 0) {
    console.error('\n❌ No scenarios found');
    console.log('💡 Run the scenario-runner first:');
    console.log('   cd scenario-runner && npm start\n');
    process.exit(1);
  }
  
  const scenarios = scenariosData.scenarios;
  console.log(`✅ Found ${scenarios.length} scenarios: ${scenarios.join(', ')}\n`);
  
  // Step 2: Determine which scenarios to compare
  let scenarioA, scenarioB;
  
  // Check command line arguments
  const args = process.argv.slice(2);
  if (args.length >= 2) {
    scenarioA = args[0];
    scenarioB = args[1];
  } else {
    // Default: compare first two scenarios, or BASELINE vs first non-baseline
    if (scenarios.includes('BASELINE')) {
      scenarioA = 'BASELINE';
      scenarioB = scenarios.find(s => s !== 'BASELINE') || scenarios[1];
    } else {
      scenarioA = scenarios[0];
      scenarioB = scenarios[1];
    }
  }
  
  if (!scenarioA || !scenarioB) {
    console.error('❌ Need at least 2 scenarios to compare');
    process.exit(1);
  }
  
  console.log(`🔍 Comparing: ${scenarioA} vs ${scenarioB}\n`);
  
  // Step 3: Fetch comparison data
  const comparison = await fetchData(`/insights/compare?scenarioA=${scenarioA}&scenarioB=${scenarioB}`);
  
  if (!comparison) {
    console.error('\n❌ Could not fetch comparison data');
    process.exit(1);
  }
  
  if (comparison.error) {
    console.error(`\n❌ ${comparison.error}: ${comparison.message}`);
    process.exit(1);
  }
  
  // Step 4: Display comparison
  printSubsection('SCENARIO OVERVIEW');
  
  console.log(`\n  📋 Scenario A: ${comparison.scenarioA.id}`);
  console.log(`     Merchants: ${comparison.scenarioA.totalMerchants}`);
  console.log(`     Success Rate: ${comparison.scenarioA.successRatePercent}`);
  console.log(`     Avg Retries: ${comparison.scenarioA.averageRetries}`);
  console.log(`     Avg Time: ${comparison.scenarioA.averageCompletionTimeSec}s`);
  console.log(`     Experience Score: ${comparison.scenarioA.experienceScore}`);
  
  console.log(`\n  📋 Scenario B: ${comparison.scenarioB.id}`);
  console.log(`     Merchants: ${comparison.scenarioB.totalMerchants}`);
  console.log(`     Success Rate: ${comparison.scenarioB.successRatePercent}`);
  console.log(`     Avg Retries: ${comparison.scenarioB.averageRetries}`);
  console.log(`     Avg Time: ${comparison.scenarioB.averageCompletionTimeSec}s`);
  console.log(`     Experience Score: ${comparison.scenarioB.experienceScore}`);
  
  // Step 5: Display deltas
  printSubsection('PERFORMANCE COMPARISON');
  
  const comp = comparison.comparison;
  
  console.log('\n  Success Rate:');
  const successIcon = comp.successRateImprovement > 0 ? '📈' : comp.successRateImprovement < 0 ? '📉' : '➡️';
  const successColor = comp.successRateImprovement > 0 ? '+' : '';
  console.log(`     ${successIcon} ${successColor}${comp.successRateImprovementPercent} (${scenarioB} vs ${scenarioA})`);
  
  console.log('\n  Retry Attempts:');
  const retryIcon = comp.retryReduction > 0 ? '✅' : comp.retryReduction < 0 ? '⚠️' : '➡️';
  const retryText = comp.retryReduction > 0 ? `Reduced by ${comp.retryReduction}` : `Increased by ${Math.abs(comp.retryReduction)}`;
  console.log(`     ${retryIcon} ${retryText} attempts (${comp.retryReductionPercent})`);
  
  console.log('\n  Completion Time:');
  const timeIcon = comp.completionTimeImprovement ? '⚡' : '🐌';
  const timeText = comp.completionTimeImprovement 
    ? `Faster by ${Math.abs(comp.completionTimeDeltaSec)}s`
    : `Slower by ${Math.abs(comp.completionTimeDeltaSec)}s`;
  console.log(`     ${timeIcon} ${timeText}`);
  
  console.log('\n  Experience Score:');
  const expIcon = comp.experienceScoreDelta > 0 ? '🟢' : comp.experienceScoreDelta < 0 ? '🔴' : '🟡';
  const expColor = comp.experienceScoreDelta > 0 ? '+' : '';
  console.log(`     ${expIcon} ${expColor}${comp.experienceScoreDelta} points`);
  
  // Step 6: Recommendation
  printSubsection('RECOMMENDATION');
  
  const rec = comparison.recommendation;
  const recIcon = rec.recommendedScenario === scenarioB ? '🎯' : '📌';
  
  console.log(`\n  ${recIcon} Recommended Scenario: ${rec.recommendedScenario}`);
  console.log(`     Reason: ${rec.reason}`);
  console.log(`     Confidence: ${rec.confidence} (sample size: ${rec.sampleSize})`);
  
  // Step 7: Actionable insights
  printSubsection('ACTIONABLE INSIGHTS');
  
  console.log('');
  
  if (rec.recommendedScenario === scenarioB) {
    console.log(`  ✅ ${scenarioB} shows better performance`);
    
    if (comp.successRateImprovement > 0.1) {
      console.log(`     → Success rate improved significantly (+${comp.successRateImprovementPercent})`);
      console.log(`     → Consider rolling out ${scenarioB} to production`);
    }
    
    if (comp.retryReduction > 0.5) {
      console.log(`     → Users need fewer retries (${comp.retryReductionPercent} reduction)`);
      console.log(`     → This reduces frustration and support load`);
    }
    
    if (comp.experienceScoreDelta > 0.15) {
      console.log(`     → Experience score improved substantially (+${comp.experienceScoreDelta})`);
      console.log(`     → Strong indicator of better user satisfaction`);
    }
    
    console.log(`\n  💡 Next Steps:`);
    console.log(`     1. Review ${scenarioB} implementation details`);
    console.log(`     2. Run A/B test with real users (10-20% traffic)`);
    console.log(`     3. Monitor production metrics closely`);
    console.log(`     4. Gradual rollout if metrics hold`);
    
  } else {
    console.log(`  ⚠️  ${scenarioA} performs better or equivalent`);
    
    if (comp.successRateImprovement < -0.05) {
      console.log(`     → ${scenarioB} has lower success rate (${comp.successRateImprovementPercent})`);
      console.log(`     → Investigate what's causing failures`);
    }
    
    if (comp.experienceScoreDelta < -0.1) {
      console.log(`     → ${scenarioB} provides worse user experience`);
      console.log(`     → Not recommended for production`);
    }
    
    if (Math.abs(comp.experienceScoreDelta) < 0.05) {
      console.log(`     → Both scenarios perform similarly`);
      console.log(`     → Consider other factors (cost, complexity, maintenance)`);
    }
    
    console.log(`\n  💡 Next Steps:`);
    console.log(`     1. Analyze why ${scenarioB} underperforms`);
    console.log(`     2. Iterate on ${scenarioB} design`);
    console.log(`     3. Re-run simulation after improvements`);
    console.log(`     4. Stick with ${scenarioA} for now`);
  }
  
  // Step 8: Statistical note
  if (rec.confidence === 'LOW') {
    console.log(`\n  ⚠️  Note: Low confidence due to small sample size (${rec.sampleSize})`);
    console.log(`     → Run simulation with more merchants for reliable results`);
    console.log(`     → Aim for at least 50 merchants per scenario`);
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('');
}

// Run the comparison report
generateComparisonReport().catch(error => {
  console.error('\n❌ Report generation failed:', error);
  process.exit(1);
});
