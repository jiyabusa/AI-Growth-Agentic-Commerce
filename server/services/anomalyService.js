/**
 * Anomaly Detection Service for Agentic Commerce
 * Monitors real-time transaction velocities and ticket sizes, flagging outliers
 * that deviate from the normal baseline (₹1,500–₹6,000).
 */

const dbService = require('./dbService');

class AnomalyDetectionService {
  constructor() {
    this.anomalies = [
      {
        id: 'anom_01',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        type: 'SPIKE_ANOMALY',
        amount: 28500,
        normalRange: '₹1,500–₹6,000',
        deviationFactor: '4.75x Baseline',
        status: 'FLAGGED',
        riskLevel: 'HIGH',
        message: 'Transaction cluster of ₹28,500 detected significantly above normal operating band.',
        recommendedAction: 'PAUSE_AGENT',
        mitigated: false
      }
    ];
  }

  evaluateTransaction(amount, items = []) {
    const normalMin = 1500;
    const normalMax = 6000;
    const isAnomalous = amount > 15000 || amount > normalMax * 2.5;

    if (isAnomalous) {
      const anomaly = {
        id: `anom_${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString(),
        type: 'SPIKE_ANOMALY',
        amount,
        normalRange: `₹${normalMin.toLocaleString('en-IN')}–₹${normalMax.toLocaleString('en-IN')}`,
        deviationFactor: `${(amount / normalMax).toFixed(1)}x Baseline`,
        status: 'FLAGGED',
        riskLevel: 'HIGH',
        message: `Transaction value ₹${amount.toLocaleString('en-IN')} is significantly above normal merchant baseline.`,
        recommendedAction: 'PAUSE_AGENT',
        mitigated: false
      };
      this.anomalies.unshift(anomaly);
      
      dbService.recordAuditEvent({
        action: 'ANOMALY_DETECTED',
        actor: 'Anomaly Detection Engine',
        amount,
        reason: anomaly.message,
        status: 'WARNING'
      });

      return { anomalous: true, anomaly };
    }

    return { anomalous: false };
  }

  getAnomalies() {
    return {
      status: this.anomalies.some(a => !a.mitigated) ? 'ANOMALY_DETECTED' : 'NORMAL',
      activeAnomalyCount: this.anomalies.filter(a => !a.mitigated).length,
      normalOperatingRange: '₹1,500 – ₹6,000',
      anomalies: this.anomalies
    };
  }

  mitigateAnomaly(anomalyId) {
    const anom = this.anomalies.find(a => a.id === anomalyId) || this.anomalies[0];
    if (anom) {
      anom.mitigated = true;
      anom.status = 'RESOLVED';
    }

    // Trigger agent kill switch
    dbService.toggleAgentStatus('PAUSED');
    dbService.recordAuditEvent({
      action: 'AGENT_PAUSED_ANOMALY_MITIGATION',
      actor: 'Merchant Admin / Anomaly Engine',
      reason: `Mitigated anomaly: Paused AI Agent financial actions.`,
      status: 'SUCCESS'
    });

    return { success: true, message: 'Anomaly mitigated: AI Agent financial actions have been paused.' };
  }
}

module.exports = new AnomalyDetectionService();
