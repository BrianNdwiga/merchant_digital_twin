import React, { useState, useEffect } from 'react';
import './AIAssistantPanel.css';

function AIAssistantPanel({ insights, summary }) {
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    if (insights && insights.aiRecommendations) {
      generateInsightMessages(insights);
    }
  }, [insights]);

  const generateInsightMessages = (insightsData) => {
    const newMessages = [];

    // Friction detection
    if (insightsData.frictionPoints && insightsData.frictionPoints.length > 0) {
      const topFriction = insightsData.frictionPoints[0];
      newMessages.push({
        id: Date.now() + 1,
        type: 'alert',
        text: `⚠️ ${topFriction.step} causes ${(topFriction.dropOffRate * 100).toFixed(0)}% drop-off`,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    // Persona struggles
    if (insightsData.personaInsights) {
      const struggling = insightsData.personaInsights.find(p => p.successRate < 0.5);
      if (struggling) {
        newMessages.push({
          id: Date.now() + 2,
          type: 'insight',
          text: `💡 ${struggling.persona} personas struggle with ${struggling.commonIssue || 'the current flow'}`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }

    // Network issues
    if (insightsData.networkImpact) {
      const poorNetwork = insightsData.networkImpact.find(n => n.profile === 'poor' || n.profile === '2G');
      if (poorNetwork && poorNetwork.avgLatency > 3000) {
        newMessages.push({
          id: Date.now() + 3,
          type: 'warning',
          text: `📡 Poor network conditions add ${(poorNetwork.avgLatency / 1000).toFixed(1)}s latency`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }

    // Recommendations
    if (insightsData.aiRecommendations && insightsData.aiRecommendations.length > 0) {
      const topRec = insightsData.aiRecommendations[0];
      newMessages.push({
        id: Date.now() + 4,
        type: 'recommendation',
        text: `🎯 ${topRec.title}: ${topRec.description}`,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    // Success patterns
    if (summary && summary.successRate > 0.8) {
      newMessages.push({
        id: Date.now() + 5,
        type: 'success',
        text: `✅ Strong performance: ${(summary.successRate * 100).toFixed(0)}% completion rate`,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    // Only add new unique messages
    setMessages(prev => {
      const existingTexts = new Set(prev.map(m => m.text));
      const uniqueNew = newMessages.filter(m => !existingTexts.has(m.text));
      return [...prev, ...uniqueNew].slice(-10); // Keep last 10 messages
    });
  };

  const getMessageIcon = (type) => {
    const icons = {
      alert: '⚠️',
      insight: '💡',
      warning: '📡',
      recommendation: '🎯',
      success: '✅',
      info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  };

  return (
    <div className="ai-assistant-panel">
      <div className="assistant-header">
        <div className="assistant-avatar">🤖</div>
        <div className="assistant-info">
          <h3>AI Assistant</h3>
          <p className="assistant-status">
            {isThinking ? 'Analyzing...' : 'Monitoring simulation'}
          </p>
        </div>
      </div>

      <div className="assistant-messages">
        {messages.length === 0 ? (
          <div className="assistant-empty">
            <div className="empty-icon">💭</div>
            <p>Waiting for insights...</p>
          </div>
        ) : (
          messages.map(message => (
            <div key={message.id} className={`assistant-message ${message.type}`}>
              <div className="message-icon">{getMessageIcon(message.type)}</div>
              <div className="message-content">
                <p className="message-text">{message.text}</p>
                <span className="message-time">{message.timestamp}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="assistant-footer">
        <div className="assistant-hint">
          💡 AI continuously analyzes simulation data
        </div>
      </div>
    </div>
  );
}

export default AIAssistantPanel;
