#!/usr/bin/env node

// CLI Report Tool - Fetches and displays simulation insights

const INSIGHT_SERVICE_URL = process.env.INSIGHT_SERVICE_URL || 'http://localhost:3000';

// Fetch data from Insight Service
async function fetchInsights(endpoint) {
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

// Generate and display the report
async function generateReport() {
  console.clear();
  
  printHeader('DIGITAL TWIN SIMULATION REPORT');
  console.log(`  Generated: ${new Date().toLocaleString()}`);
  console.log(`  Insight Service: ${INSIGHT_SERVICE_URL}`);
  
  // Fetch all insights
  console.log('\n📊 Fetching simulation insights...\n');
  
  const summary = await fetchInsights('/insights/summary');
  const byNetwork = await fetchInsights('/insights/by-network');
  const byLiteracy = await fetchInsights('/insights/by-literacy');
  const byScenario = await fetchInsights('/insights/by-scenario');
  
  if (!summary) {
    console.error('\n❌ Could not connect to Insight Service');
    console.log('💡 Make sure the insight service is running:');
    console.log('   cd insight-service && npm start\n');
    process.exit(1);
  }
  
  // Overall Summary
  printSubsection('OVERALL METRICS');
  
  if (summary.totalMerchants === 0) {
    console.log('\n  ⚠️  No simulation data available yet');
    console.log('  💡 Run the simulation orchestrator to generate data\n');
    process.exit(0);
  }
  
  console.log(`
  Total Merchants Simulated:    ${summary.totalMerchants}
  Success Rate:                 ${formatPercent(summary.successRate)} (${Math.round(summary.successRate * summary.totalMerchants)} succeeded)
  Average Completion Time:      ${summary.averageCompletionTimeSec}s (${summary.averageCompletionTimeMs}ms)
  Average Retry Attempts:       ${summary.averageRetries}
  Overall Experience Score:     ${summary.experienceScore} / 1.0
  `);
  
  // Experience Score Interpretation
  const expScore = summary.experienceScore;
  let interpretation = '';
  let emoji = '';
  
  if (expScore >= 0.7) {
    interpretation = 'Excellent - Users have smooth experience';
    emoji = '🟢';
  } else if (expScore >= 0.5) {
    interpretation = 'Good - Minor friction points exist';
    emoji = '🟡';
  } else if (expScore >= 0.3) {
    interpretation = 'Fair - Significant improvement needed';
    emoji = '🟠';
  } else {
    interpretation = 'Poor - Critical issues affecting users';
    emoji = '🔴';
  }
  
  console.log(`  ${emoji} Experience Assessment: ${interpretation}`);
  
  // Network Breakdown
  if (byNetwork && Object.keys(byNetwork).length > 0) {
    printSubsection('FAILURES BY NETWORK PROFILE');
    
    // Sort by failure rate descending
    const networkEntries = Object.entries(byNetwork).sort((a, b) => b[1].failureRate - a[1].failureRate);
    
    console.log('');
    networkEntries.forEach(([network, data]) => {
      const bar = '█'.repeat(Math.round(data.failureRate * 50));
      console.log(`  ${network.padEnd(15)} ${data.failureRatePercent.padStart(6)} ${bar}`);
      console.log(`  ${''.padEnd(15)} Avg Time: ${(data.avgCompletionTimeMs / 1000).toFixed(1)}s | Attempts: ${data.avgAttempts}`);
      console.log('');
    });
  }
  
  // Digital Literacy Breakdown
  if (byLiteracy && Object.keys(byLiteracy).length > 0) {
    printSubsection('FAILURES BY DIGITAL LITERACY');
    
    // Sort by failure rate descending
    const literacyEntries = Object.entries(byLiteracy).sort((a, b) => b[1].failureRate - a[1].failureRate);
    
    console.log('');
    literacyEntries.forEach(([literacy, data]) => {
      const bar = '█'.repeat(Math.round(data.failureRate * 50));
      const label = literacy.charAt(0).toUpperCase() + literacy.slice(1);
      console.log(`  ${label.padEnd(15)} ${data.failureRatePercent.padStart(6)} ${bar}`);
      console.log(`  ${''.padEnd(15)} Avg Time: ${(data.avgCompletionTimeMs / 1000).toFixed(1)}s | Attempts: ${data.avgAttempts}`);
      console.log('');
    });
  }
  
  // Scenario Breakdown
  if (byScenario && Object.keys(byScenario).length > 0) {
    printSubsection('PERFORMANCE BY SCENARIO TYPE');
    
    // Sort by failure rate descending
    const scenarioEntries = Object.entries(byScenario).sort((a, b) => b[1].failureRate - a[1].failureRate);
    
    console.log('');
    scenarioEntries.forEach(([scenario, data]) => {
      const bar = '█'.repeat(Math.round(data.failureRate * 50));
      const label = scenario.replace(/_/g, ' ');
      console.log(`  ${label.padEnd(20)} ${data.failureRatePercent.padStart(6)} ${bar}`);
      console.log(`  ${''.padEnd(20)} Success: ${formatPercent(data.successRate)} | Exp Score: ${data.avgExperienceScore}`);
      console.log('');
    });
  }
  
  // Recommendations
  printSubsection('RECOMMENDATIONS');
  
  console.log('');
  
  // Network recommendations
  if (byNetwork) {
    const worstNetwork = Object.entries(byNetwork).sort((a, b) => b[1].failureRate - a[1].failureRate)[0];
    if (worstNetwork && worstNetwork[1].failureRate > 0.3) {
      console.log(`  📡 Network: ${worstNetwork[0]} has ${worstNetwork[1].failureRatePercent} failure rate`);
      console.log(`     → Consider optimizing for low-bandwidth scenarios`);
      console.log(`     → Implement better retry mechanisms for poor networks\n`);
    }
  }
  
  // Literacy recommendations
  if (byLiteracy) {
    const worstLiteracy = Object.entries(byLiteracy).sort((a, b) => b[1].failureRate - a[1].failureRate)[0];
    if (worstLiteracy && worstLiteracy[1].failureRate > 0.3) {
      console.log(`  📚 Digital Literacy: ${worstLiteracy[0]} users struggle (${worstLiteracy[1].failureRatePercent} failure)`);
      console.log(`     → Simplify UI/UX for less tech-savvy users`);
      console.log(`     → Add more guidance and help text\n`);
    }
  }
  
  // Overall recommendation
  if (summary.experienceScore < 0.5) {
    console.log(`  ⚠️  Overall experience score is low (${summary.experienceScore})`);
    console.log(`     → Review and address top failure scenarios`);
    console.log(`     → Consider A/B testing improvements before rollout\n`);
  } else if (summary.experienceScore >= 0.7) {
    console.log(`  ✅ System is performing well (score: ${summary.experienceScore})`);
    console.log(`     → Ready for production rollout`);
    console.log(`     → Continue monitoring edge cases\n`);
  }
  
  console.log('═'.repeat(70));
  console.log('');
}

// Run the report
generateReport().catch(error => {
  console.error('\n❌ Report generation failed:', error);
  process.exit(1);
});
