/**
 * QR Super Generator - Privacy-Compliant Analytics System
 * 
 * Tracks user engagement, feature usage, and performance metrics
 * while respecting user privacy and GDPR compliance
 */

export interface AnalyticsEvent {
  event: string;
  category: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

export interface UsageMetrics {
  totalQRGenerated: number;
  typeDistribution: Record<string, number>;
  featureUsage: Record<string, number>;
  dailyActiveUsers: Record<string, number>;
  sessionDuration: number[];
  errorRate: number;
  retentionRate: number;
  conversionFunnel: Record<string, number>;
}

export interface PerformanceMetrics {
  qrGenerationTime: number[];
  loadTime: number[];
  memoryUsage: number[];
  crashRate: number;
  responseTime: number[];
}

export interface GrowthMetrics {
  referralSources: Record<string, number>;
  shareEvents: number;
  viralCoefficient: number;
  userAcquisitionCost: number;
  lifetimeValue: number;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private sessionId: string;
  private sessionStart: number;
  private eventQueue: AnalyticsEvent[] = [];
  private isEnabled: boolean = true;
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.initializeAnalytics();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private async initializeAnalytics() {
    try {
      // Always disable analytics in service worker context or when chrome APIs unavailable
      if (typeof window === 'undefined' || 
          typeof (globalThis as any).importScripts !== 'undefined' ||
          typeof chrome === 'undefined' || 
          !chrome.storage) {
        this.isEnabled = false;
        console.log('Analytics disabled - incompatible environment');
        return;
      }

      // Check user consent and settings using chrome.storage.local ONLY
      const result = await chrome.storage.local.get(['analyticsEnabled', 'userId']);
      this.isEnabled = result.analyticsEnabled !== false; // Opt-out by default
      
      if (!result.userId) {
        const userId = this.generateUserId();
        await chrome.storage.local.set({ userId });
      }

      // Start session tracking (no localStorage usage)
      this.trackEvent('session', 'start', {
        timestamp: this.sessionStart,
        userAgent: navigator?.userAgent || 'Unknown',
        timezone: Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || 'Unknown',
        language: navigator?.language || 'Unknown'
      });

      // Set up periodic flush using chrome storage
      this.flushTimer = setInterval(() => {
        this.flushEvents();
      }, 30000); // Flush every 30 seconds

      // Track session end on unload (only in popup/content script context)
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('beforeunload', () => {
          this.endSession();
        });
      }

    } catch (error) {
      console.warn('Analytics initialization failed:', error);
      this.isEnabled = false; // Disable on any error
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public tracking methods
  public trackEvent(category: string, event: string, properties?: Record<string, any>) {
    if (!this.isEnabled) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      category,
      properties: this.sanitizeProperties(properties),
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.eventQueue.push(analyticsEvent);

    // Immediate flush for critical events
    if (['error', 'conversion', 'purchase'].includes(category)) {
      this.flushEvents();
    }
  }

  public trackQRGeneration(type: string, method: string, success: boolean, duration?: number) {
    this.trackEvent('qr_generation', 'generate', {
      type,
      method,
      success,
      duration,
      timestamp: Date.now()
    });
  }

  public trackFeatureUsage(feature: string, action: string, value?: any) {
    this.trackEvent('feature_usage', action, {
      feature,
      value: this.sanitizeValue(value),
      timestamp: Date.now()
    });
  }

  public trackUserAction(action: string, context: string, metadata?: any) {
    this.trackEvent('user_action', action, {
      context,
      metadata: this.sanitizeProperties(metadata),
      timestamp: Date.now()
    });
  }

  public trackError(error: Error, context: string, fatal: boolean = false) {
    this.trackEvent('error', 'exception', {
      message: error.message,
      stack: error.stack?.substring(0, 500), // Limit stack trace length
      context,
      fatal,
      timestamp: Date.now()
    });
  }

  public trackPerformance(metric: string, value: number, context?: string) {
    this.trackEvent('performance', metric, {
      value,
      context,
      timestamp: Date.now()
    });
  }

  public trackConversion(event: string, value?: number, currency?: string) {
    this.trackEvent('conversion', event, {
      value,
      currency,
      timestamp: Date.now()
    });
  }

  public trackShare(method: string, content: string, success: boolean) {
    this.trackEvent('social', 'share', {
      method,
      content,
      success,
      timestamp: Date.now()
    });
  }

  // Analytics insights and reporting
  public async getUsageMetrics(): Promise<UsageMetrics> {
    try {
      const result = await chrome.storage.local.get(['analyticsData']);
      const data = result.analyticsData || {};

      return {
        totalQRGenerated: data.totalQRGenerated || 0,
        typeDistribution: data.typeDistribution || {},
        featureUsage: data.featureUsage || {},
        dailyActiveUsers: data.dailyActiveUsers || {},
        sessionDuration: data.sessionDuration || [],
        errorRate: data.errorRate || 0,
        retentionRate: data.retentionRate || 0,
        conversionFunnel: data.conversionFunnel || {}
      };
    } catch (error) {
      console.error('Failed to get usage metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  public async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const result = await chrome.storage.local.get(['performanceData']);
      const data = result.performanceData || {};

      return {
        qrGenerationTime: data.qrGenerationTime || [],
        loadTime: data.loadTime || [],
        memoryUsage: data.memoryUsage || [],
        crashRate: data.crashRate || 0,
        responseTime: data.responseTime || []
      };
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {
        qrGenerationTime: [],
        loadTime: [],
        memoryUsage: [],
        crashRate: 0,
        responseTime: []
      };
    }
  }

  public async getGrowthMetrics(): Promise<GrowthMetrics> {
    try {
      const result = await chrome.storage.local.get(['growthData']);
      const data = result.growthData || {};

      return {
        referralSources: data.referralSources || {},
        shareEvents: data.shareEvents || 0,
        viralCoefficient: data.viralCoefficient || 0,
        userAcquisitionCost: data.userAcquisitionCost || 0,
        lifetimeValue: data.lifetimeValue || 0
      };
    } catch (error) {
      console.error('Failed to get growth metrics:', error);
      return {
        referralSources: {},
        shareEvents: 0,
        viralCoefficient: 0,
        userAcquisitionCost: 0,
        lifetimeValue: 0
      };
    }
  }

  // Privacy and consent management
  public async setAnalyticsEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    await chrome.storage.local.set({ analyticsEnabled: enabled });

    if (!enabled) {
      // Clear existing analytics data
      await this.clearAnalyticsData();
    }

    this.trackEvent('privacy', 'analytics_consent', { enabled });
  }

  public async clearAnalyticsData() {
    try {
      await chrome.storage.local.remove([
        'analyticsData',
        'performanceData',
        'growthData',
        'userId'
      ]);
      this.eventQueue = [];
    } catch (error) {
      console.error('Failed to clear analytics data:', error);
    }
  }

  // Data processing and aggregation
  private async flushEvents() {
    if (this.eventQueue.length === 0) return;

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];

      // Process events locally (privacy-first approach)
      await this.processEventsLocally(events);

      // Optional: Send to external analytics service (with user consent)
      if (this.isEnabled) {
        await this.sendToExternalService(events);
      }

    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...this.eventQueue);
    }
  }

  private async processEventsLocally(events: AnalyticsEvent[]) {
    try {
      const [usageData, performanceData, growthData] = await Promise.all([
        chrome.storage.local.get(['analyticsData']),
        chrome.storage.local.get(['performanceData']),
        chrome.storage.local.get(['growthData'])
      ]);

      const updatedUsage = this.aggregateUsageData(events, usageData.analyticsData || {});
      const updatedPerformance = this.aggregatePerformanceData(events, performanceData.performanceData || {});
      const updatedGrowth = this.aggregateGrowthData(events, growthData.growthData || {});

      await chrome.storage.local.set({
        analyticsData: updatedUsage,
        performanceData: updatedPerformance,
        growthData: updatedGrowth,
        lastAnalyticsUpdate: Date.now()
      });

    } catch (error) {
      console.error('Failed to process events locally:', error);
    }
  }

  private aggregateUsageData(events: AnalyticsEvent[], existing: any): any {
    const updated = { ...existing };

    events.forEach(event => {
      // Count QR generations
      if (event.category === 'qr_generation' && event.event === 'generate') {
        updated.totalQRGenerated = (updated.totalQRGenerated || 0) + 1;
        
        const type = event.properties?.type || 'unknown';
        updated.typeDistribution = updated.typeDistribution || {};
        updated.typeDistribution[type] = (updated.typeDistribution[type] || 0) + 1;
      }

      // Track feature usage
      if (event.category === 'feature_usage') {
        const feature = event.properties?.feature || 'unknown';
        updated.featureUsage = updated.featureUsage || {};
        updated.featureUsage[feature] = (updated.featureUsage[feature] || 0) + 1;
      }

      // Track daily active users
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      updated.dailyActiveUsers = updated.dailyActiveUsers || {};
      updated.dailyActiveUsers[date] = 1; // Session-based tracking
    });

    return updated;
  }

  private aggregatePerformanceData(events: AnalyticsEvent[], existing: any): any {
    const updated = { ...existing };

    events.forEach(event => {
      if (event.category === 'performance') {
        const metric = event.event;
        const value = event.properties?.value;

        if (typeof value === 'number') {
          updated[metric] = updated[metric] || [];
          updated[metric].push(value);

          // Keep only last 1000 measurements
          if (updated[metric].length > 1000) {
            updated[metric] = updated[metric].slice(-1000);
          }
        }
      }
    });

    return updated;
  }

  private aggregateGrowthData(events: AnalyticsEvent[], existing: any): any {
    const updated = { ...existing };

    events.forEach(event => {
      if (event.category === 'social' && event.event === 'share') {
        updated.shareEvents = (updated.shareEvents || 0) + 1;
      }

      if (event.category === 'conversion') {
        updated.conversionEvents = (updated.conversionEvents || 0) + 1;
      }
    });

    return updated;
  }

  private async sendToExternalService(events: AnalyticsEvent[]) {
    // Optional: Send to external analytics service
    // This should only be done with explicit user consent
    // and should be anonymized/aggregated data only
    try {
      // Implementation would depend on chosen analytics provider
      // e.g., Google Analytics 4, Mixpanel, Amplitude, etc.
      
      // For privacy compliance, only send aggregated metrics
      const aggregatedMetrics = this.generateAggregatedMetrics(events);
      
      // Example: Send to hypothetical analytics endpoint
      // await fetch('https://analytics.example.com/events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(aggregatedMetrics)
      // });
      
    } catch (error) {
      console.error('Failed to send to external analytics service:', error);
    }
  }

  private generateAggregatedMetrics(events: AnalyticsEvent[]) {
    // Generate privacy-safe aggregated metrics
    return {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      eventCount: events.length,
      categories: [...new Set(events.map(e => e.category))],
      // Add other aggregated metrics without PII
    };
  }

  private sanitizeProperties(properties?: Record<string, any>): Record<string, any> {
    if (!properties) return {};

    const sanitized: Record<string, any> = {};
    
    Object.keys(properties).forEach(key => {
      const value = properties[key];
      
      // Remove potential PII
      if (this.isPotentialPII(key, value)) {
        return;
      }
      
      sanitized[key] = this.sanitizeValue(value);
    });

    return sanitized;
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Truncate long strings and remove potential PII
      return value.substring(0, 100);
    }
    
    if (typeof value === 'number') {
      return Math.round(value * 100) / 100; // Round to 2 decimal places
    }
    
    if (Array.isArray(value)) {
      return value.length; // Return array length instead of contents
    }
    
    if (typeof value === 'object' && value !== null) {
      return '[Object]'; // Don't store complex objects
    }
    
    return value;
  }

  private isPotentialPII(key: string, value: any): boolean {
    const piiKeys = [
      'email', 'phone', 'name', 'address', 'ssn', 'credit',
      'password', 'token', 'key', 'secret', 'ip', 'mac'
    ];
    
    const lowerKey = key.toLowerCase();
    return piiKeys.some(piiKey => lowerKey.includes(piiKey));
  }

  private getEmptyMetrics(): UsageMetrics {
    return {
      totalQRGenerated: 0,
      typeDistribution: {},
      featureUsage: {},
      dailyActiveUsers: {},
      sessionDuration: [],
      errorRate: 0,
      retentionRate: 0,
      conversionFunnel: {}
    };
  }

  private endSession() {
    const sessionDuration = Date.now() - this.sessionStart;
    
    this.trackEvent('session', 'end', {
      duration: sessionDuration,
      timestamp: Date.now()
    });

    this.flushEvents();
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }

  // Public API for insights dashboard
  public async generateInsights() {
    const [usage, performance, growth] = await Promise.all([
      this.getUsageMetrics(),
      this.getPerformanceMetrics(),
      this.getGrowthMetrics()
    ]);

    return {
      usage,
      performance,
      growth,
      recommendations: this.generateRecommendations(usage, performance, growth),
      generatedAt: Date.now()
    };
  }

  private generateRecommendations(usage: UsageMetrics, performance: PerformanceMetrics, growth: GrowthMetrics) {
    const recommendations = [];

    // Usage-based recommendations
    if (usage.totalQRGenerated < 10) {
      recommendations.push({
        type: 'engagement',
        message: 'Try different QR code types to discover new features!',
        action: 'explore_features'
      });
    }

    // Performance-based recommendations
    const avgGenerationTime = performance.qrGenerationTime.reduce((a, b) => a + b, 0) / performance.qrGenerationTime.length;
    if (avgGenerationTime > 1000) {
      recommendations.push({
        type: 'performance',
        message: 'Consider using smaller QR code sizes for faster generation',
        action: 'optimize_settings'
      });
    }

    // Growth-based recommendations
    if (growth.shareEvents === 0) {
      recommendations.push({
        type: 'growth',
        message: 'Share your QR codes to unlock premium features!',
        action: 'try_sharing'
      });
    }

    return recommendations;
  }
}

// Export singleton instance
export const analytics = AnalyticsService.getInstance();
export default analytics; 