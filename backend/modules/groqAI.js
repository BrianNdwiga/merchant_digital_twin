// Groq AI Integration Module
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

function isConfigured() {
  return GROQ_API_KEY && GROQ_API_KEY !== 'your_groq_api_key_here';
}

async function callGroqAPI(messages, options = {}) {
  if (!isConfigured()) return null;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || MODEL,
        messages,
        temperature: options.temperature || 0.3,
        max_tokens: options.maxTokens || 3000,
        stream: false
      })
    });

    if (!response.ok) {
      console.error('Groq API error:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Failed to call Groq API:', error.message);
    return null;
  }
}

// Build a rich, developer-focused prompt from simulation data
function buildRecommendationsPrompt(insights) {
  const op = insights.operational;
  const failures = insights.failureBreakdown || {};
  const byLiteracy = insights.byLiteracy || {};
  const byNetwork = insights.byNetwork || {};
  const byStep = insights.byStep || {};

  // Format per-step failure table
  const stepRows = Object.entries(byStep)
    .sort((a, b) => b[1].failed - a[1].failed)
    .map(([step, s]) => `  - ${step}: ${s.failed} failed / ${s.total} total (${((s.failed/s.total)*100).toFixed(0)}% failure rate)`)
    .join('\n') || '  - No step-level data';

  // Format per-literacy breakdown
  const literacyRows = Object.entries(byLiteracy)
    .map(([l, s]) => `  - ${l}: ${s.failed}/${s.total} failed (${((s.failed/s.total)*100).toFixed(0)}%)`)
    .join('\n') || '  - No literacy data';

  // Format per-network breakdown
  const networkRows = Object.entries(byNetwork)
    .map(([n, s]) => `  - ${n}: ${s.failed}/${s.total} failed (${((s.failed/s.total)*100).toFixed(0)}%), avg ${s.avgDuration}ms`)
    .join('\n') || '  - No network data';

  // Top friction events
  const frictionRows = insights.frictionPoints
    .map(f => `  - [${f.severity.toUpperCase()}] ${f.type} at "${f.location}": ${f.description} (${f.count} occurrences)`)
    .join('\n') || '  - None detected';

  return `You are a senior frontend engineer and UX developer reviewing a merchant onboarding simulation.
${op.totalMerchants || op.activeAgents} merchants were simulated. ${op.completionRate}% completed successfully. ${op.dropoffs} failed.
Average completion time: ${op.avgDuration}ms. Retry frequency: ${op.retryFrequency} retries/merchant.

FAILURE BREAKDOWN BY STEP:
${stepRows}

FAILURE BREAKDOWN BY DIGITAL LITERACY:
${literacyRows}

FAILURE BREAKDOWN BY NETWORK PROFILE:
${networkRows}

FRICTION EVENTS DETECTED:
${frictionRows}

Your job: produce 6-8 developer-actionable recommendations that would directly improve the completion rate.
Each recommendation must:
- Reference the specific step, field, or segment that is failing
- Give a concrete UI or code fix (e.g. "replace the file upload input with a camera-capture component", "add inline validation on blur instead of on submit", "lazy-load step 3 assets to reduce 2G load time")
- Quantify the expected improvement based on the failure data above
- NOT use vague phrases like "improve UX", "enhance performance", or "consider simplifying"

Return ONLY a JSON array, no markdown, no explanation:
[
  {
    "priority": "critical|high|medium|low",
    "category": "ux|performance|accessibility|technical",
    "title": "Specific actionable title (max 8 words)",
    "description": "Exact fix referencing the failing step/segment and why it fails",
    "impact": "Quantified expected improvement e.g. 'Could recover ~23 of the 31 basic-literacy failures'",
    "effort": "low|medium|high",
    "affectedSegment": "e.g. basic literacy users on 2G_EDGE"
  }
]`;
}

async function generateAIRecommendations(insights) {
  if (isConfigured()) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a senior frontend engineer. Return only valid JSON arrays. No markdown, no prose.'
        },
        {
          role: 'user',
          content: buildRecommendationsPrompt(insights)
        }
      ];

      const response = await callGroqAPI(messages, { temperature: 0.2, maxTokens: 3000 });
      if (response) {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('✨ Using AI-powered recommendations');
            return parsed;
          }
        }
      }
    } catch (error) {
      console.warn('AI recommendations failed, using rule-based fallback:', error.message);
    }
  }

  return generateRuleBasedRecommendations(insights);
}

// Rule-based fallback — derives specific recommendations from actual failure data
function generateRuleBasedRecommendations(insights) {
  console.log('📋 Using rule-based recommendations');
  const recommendations = [];
  const op = insights.operational;
  const byStep = insights.byStep || {};
  const byLiteracy = insights.byLiteracy || {};
  const byNetwork = insights.byNetwork || {};

  // ── Step-level failures ───────────────────────────────────────────────────
  const stepsSorted = Object.entries(byStep)
    .map(([step, s]) => ({ step, ...s, rate: s.total > 0 ? s.failed / s.total : 0 }))
    .sort((a, b) => b.failed - a.failed);

  for (const s of stepsSorted.slice(0, 2)) {
    if (s.failed === 0) continue;
    const pct = (s.rate * 100).toFixed(0);

    if (s.step === 'documentation') {
      recommendations.push({
        priority: 'critical',
        category: 'ux',
        title: 'Replace document upload with guided capture flow',
        description: `${s.failed} merchants (${pct}%) failed at the documentation step. The current file-input UI requires users to locate files on their device — unfamiliar to low-literacy users. Replace with a step-by-step camera capture component that previews the document before submission and shows accepted file types with visual examples.`,
        impact: `Could recover up to ${Math.round(s.failed * 0.6)} of the ${s.failed} documentation failures`,
        effort: 'medium',
        affectedSegment: 'basic digital literacy users'
      });
    } else if (s.step === 'business_info') {
      recommendations.push({
        priority: 'high',
        category: 'ux',
        title: 'Add inline field validation with examples on business info',
        description: `${s.failed} merchants failed at business_info (${pct}% failure rate). Validation errors are only shown on submit. Switch to on-blur validation per field and add placeholder examples (e.g. "Mama Mboga Groceries" for businessName). Add a field format tooltip for businessType showing accepted values.`,
        impact: `Estimated 40% reduction in business_info failures (~${Math.round(s.failed * 0.4)} merchants recovered)`,
        effort: 'low',
        affectedSegment: 'all segments, highest impact on basic literacy'
      });
    } else if (s.step === 'contact_info') {
      recommendations.push({
        priority: 'high',
        category: 'ux',
        title: 'Add phone number format mask and auto-detect country code',
        description: `${s.failed} merchants failed at contact_info. Phone field accepts free text — users enter formats like "0712345678", "+254712345678", or "712 345 678" inconsistently. Add an input mask that auto-formats to E.164 and pre-fills the +254 country code for Kenyan numbers.`,
        impact: `Could eliminate ~${Math.round(s.failed * 0.5)} contact_info failures`,
        effort: 'low',
        affectedSegment: 'all network profiles'
      });
    } else {
      recommendations.push({
        priority: 'high',
        category: 'ux',
        title: `Fix high failure rate at step: ${s.step}`,
        description: `${s.failed} of ${s.total} merchants (${pct}%) failed at the "${s.step}" step. Audit this step for unclear labels, missing error messages, or required fields that are not obviously required. Add a progress indicator showing which step the user is on and how many remain.`,
        impact: `Addressing this step could improve overall completion rate by ~${(s.rate * (s.total / (op.activeAgents || 1)) * 100).toFixed(0)} percentage points`,
        effort: 'medium',
        affectedSegment: 'all segments'
      });
    }
  }

  // ── Literacy-based failures ───────────────────────────────────────────────
  const basicLiteracy = byLiteracy['basic'];
  if (basicLiteracy && basicLiteracy.total > 0) {
    const rate = basicLiteracy.failed / basicLiteracy.total;
    if (rate > 0.3) {
      recommendations.push({
        priority: 'high',
        category: 'accessibility',
        title: 'Add simplified mode for basic-literacy merchants',
        description: `${basicLiteracy.failed}/${basicLiteracy.total} basic-literacy merchants failed (${(rate*100).toFixed(0)}%). Implement a "simple mode" toggle that: reduces form to one field per screen, replaces text labels with icon+label pairs, adds audio pronunciation for field names in Swahili/local language, and increases tap target sizes to minimum 48px.`,
        impact: `Could recover ~${Math.round(basicLiteracy.failed * 0.45)} basic-literacy failures`,
        effort: 'high',
        affectedSegment: 'basic digital literacy'
      });
    }
  }

  // ── Network-based failures ────────────────────────────────────────────────
  const edge2g = byNetwork['2G_EDGE'];
  if (edge2g && edge2g.total > 0 && edge2g.failed / edge2g.total > 0.3) {
    const rate = (edge2g.failed / edge2g.total * 100).toFixed(0);
    recommendations.push({
      priority: 'critical',
      category: 'performance',
      title: 'Implement offline-first form with background sync for 2G',
      description: `${edge2g.failed}/${edge2g.total} merchants on 2G_EDGE failed (${rate}%). Average duration ${edge2g.avgDuration}ms. The form requires continuous connectivity — any interruption loses progress. Implement: (1) localStorage draft saving after each field, (2) lazy-load images and remove non-essential assets from the critical path, (3) compress all API payloads, (4) show a "Saving..." indicator so users know progress is preserved.`,
      impact: `2G failures represent ${((edge2g.failed / (op.dropoffs || 1)) * 100).toFixed(0)}% of all failures — fixing this is the highest ROI change`,
      effort: 'high',
      affectedSegment: '2G_EDGE network profile'
    });
  }

  const poor3g = byNetwork['3G_POOR'];
  if (poor3g && poor3g.total > 0 && poor3g.failed / poor3g.total > 0.25) {
    recommendations.push({
      priority: 'high',
      category: 'performance',
      title: 'Reduce page weight and defer non-critical JS for 3G users',
      description: `${poor3g.failed}/${poor3g.total} merchants on 3G_POOR failed. Audit bundle size — defer analytics, chat widgets, and non-critical scripts. Serve WebP images with explicit width/height to prevent layout shift. Target < 200KB initial HTML+CSS payload for the onboarding form.`,
      impact: `Could reduce 3G failure rate by ~30%, recovering ~${Math.round(poor3g.failed * 0.3)} merchants`,
      effort: 'medium',
      affectedSegment: '3G_POOR network profile'
    });
  }

  // ── Friction events ───────────────────────────────────────────────────────
  const docConfusion = insights.frictionPoints?.find(f => f.location === 'document_upload');
  if (docConfusion && docConfusion.count >= 3) {
    recommendations.push({
      priority: 'medium',
      category: 'ux',
      title: 'Add document upload explainer with accepted format examples',
      description: `${docConfusion.count} merchants showed confusion at document upload. Add a modal or inline panel showing: accepted document types with thumbnail previews, max file size, and a "Take photo" shortcut for mobile users. Show a checklist of required documents before the upload step so users can prepare.`,
      impact: `Reduces upload confusion events — currently ${docConfusion.count} occurrences per simulation run`,
      effort: 'low',
      affectedSegment: 'basic and intermediate literacy, mobile devices'
    });
  }

  // ── Retry patterns ────────────────────────────────────────────────────────
  if (op.retryFrequency > 0.5) {
    recommendations.push({
      priority: 'medium',
      category: 'ux',
      title: 'Surface specific error messages instead of generic retry prompts',
      description: `Average retry frequency is ${op.retryFrequency} per merchant. Generic "Something went wrong, try again" messages force blind retries. Map each error code to a specific user-facing message with a suggested fix (e.g. "Your ID photo is blurry — tap to retake" instead of "Upload failed"). Log the specific validation rule that failed and display it inline next to the field.`,
      impact: `Reducing retries by 50% would save ~${Math.round(op.avgDuration * op.retryFrequency * 0.5)}ms average per merchant`,
      effort: 'low',
      affectedSegment: 'all segments'
    });
  }

  // Sort by priority
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 8);
}

async function predictScenarioImpactAI(scenarioChange, currentInsights) {
  if (!isConfigured()) return null;

  const prompt = `You are a product analytics engineer. Predict the measurable impact of this change on a merchant onboarding flow.

CURRENT BASELINE:
- Success Rate: ${(currentInsights.successRate * 100).toFixed(1)}%
- Avg Completion Time: ${currentInsights.averageCompletionTimeMs}ms
- Drop-off Rate: ${((1 - currentInsights.successRate) * 100).toFixed(1)}%

PROPOSED CHANGE:
Type: ${scenarioChange.type}
Description: ${scenarioChange.description}

Return ONLY valid JSON, no markdown:
{
  "completionRate": {"current": X, "predicted": Y, "change": "+/-Z%", "direction": "positive|negative|neutral"},
  "avgCompletionTime": {"current": X, "predicted": Y, "change": "+/-Z%", "direction": "positive|negative|neutral"},
  "dropOffRate": {"change": "+/-Z%", "direction": "positive|negative|neutral"},
  "confidence": "low|medium|high",
  "risks": ["specific risk 1", "specific risk 2"],
  "personaImpact": [{"persona": "name", "impact": "specific description", "expectedImprovement": "X%"}]
}`;

  try {
    const response = await callGroqAPI([
      { role: 'system', content: 'Return only valid JSON. No markdown, no explanation.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.2, maxTokens: 1000 });

    if (response) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Failed to parse AI prediction:', error.message);
  }
  return null;
}

async function generateInsightsSummary(insights) {
  if (!isConfigured()) return 'Simulation completed. Review detailed metrics for insights.';

  const op = insights.operational;
  const prompt = `In 2-3 sentences, summarize these merchant onboarding simulation results for a developer. Be specific about what failed and where.
- ${op.activeAgents} merchants simulated, ${op.completionRate}% completed
- ${op.dropoffs} failures, avg ${op.avgDuration}ms completion time
- ${insights.frictionPoints.length} friction points, ${insights.personaStruggles.length} struggling segments
Focus on the biggest failure cause and the single most impactful fix.`;

  const response = await callGroqAPI([
    { role: 'system', content: 'You are a concise technical analyst. Be specific, not generic.' },
    { role: 'user', content: prompt }
  ], { temperature: 0.3, maxTokens: 200 });

  return response || 'Simulation completed. Review detailed metrics for insights.';
}

module.exports = {
  isConfigured,
  generateAIRecommendations,
  generateRuleBasedRecommendations,
  predictScenarioImpactAI,
  generateInsightsSummary,
  callGroqAPI
};
