/**
 * QR Super Generator - Background Analytics Worker
 * 
 * Background processing for analytics data aggregation,
 * performance monitoring, and privacy-compliant insights
 */

import analytics from '../utils/analytics';
import { debug } from '../utils/debug';

export interface AnalyticsJob {
  id: string;
  type: 'aggregation' | 'cleanup' | 'export' | 'sync';
  data?: any;
  priority: number;
  createdAt: number;
  scheduledFor?: number;
}

export interface WorkerMetrics {
  jobsProcessed: number;
  averageProcessingTime: number;
  lastProcessedAt: number;
  queueSize: number;
  errorCount: number;
}

class AnalyticsWorker {
  private static instance: AnalyticsWorker;
  private jobQueue: AnalyticsJob[] = [];
  private isProcessing = false;
  private metrics: WorkerMetrics = {
    jobsProcessed: 0,
    averageProcessingTime: 0,
    lastProcessedAt: 0,
    queueSize: 0,
    errorCount: 0
  };
  private component = 'AnalyticsWorker';
  private processingIntervalId?: NodeJS.Timeout;

  private constructor() {
    this.initializeWorker();
  }

  public static getInstance(): AnalyticsWorker {
    if (!AnalyticsWorker.instance) {
      AnalyticsWorker.instance = new AnalyticsWorker();
    }
    return AnalyticsWorker.instance;
  }

  private async initializeWorker() {
    try {
      debug.info(this.component, '🚀 Initializing analytics worker');

      // Load persisted job queue
      await this.loadPersistedJobs();

      // Set up periodic processing
      this.schedulePeriodicTasks();

      // Start processing queue
      this.startProcessing();

      debug.info(this.component, '✅ Analytics worker initialized', {
        queueSize: this.jobQueue.length
      });

    } catch (error) {
      debug.error(this.component, '❌ Failed to initialize analytics worker', error);
    }
  }

  // Job Management
  public async scheduleJob(job: Omit<AnalyticsJob, 'id' | 'createdAt'>): Promise<string> {
    const jobId = this.generateJobId();
    
    const analyticsJob: AnalyticsJob = {
      ...job,
      id: jobId,
      createdAt: Date.now()
    };

    // Insert job based on priority
    this.insertJobByPriority(analyticsJob);
    
    // Persist updated queue
    await this.persistJobs();
    
    debug.info(this.component, '📋 Job scheduled', {
      jobId,
      type: job.type,
      priority: job.priority
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return jobId;
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    const initialLength = this.jobQueue.length;
    this.jobQueue = this.jobQueue.filter(job => job.id !== jobId);
    
    if (this.jobQueue.length < initialLength) {
      await this.persistJobs();
      debug.info(this.component, '❌ Job cancelled', { jobId });
      return true;
    }
    
    return false;
  }

  public getQueueStatus(): { queueSize: number; processing: boolean; metrics: WorkerMetrics } {
    this.metrics.queueSize = this.jobQueue.length;
    
    return {
      queueSize: this.jobQueue.length,
      processing: this.isProcessing,
      metrics: { ...this.metrics }
    };
  }

  // Job Processing
  private async startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    debug.info(this.component, '▶️ Starting job processing');

    while (this.jobQueue.length > 0) {
      const job = this.jobQueue.shift();
      if (!job) break;

      // Check if job should be delayed
      if (job.scheduledFor && job.scheduledFor > Date.now()) {
        // Re-queue for later
        this.insertJobByPriority(job);
        break;
      }

      try {
        const startTime = performance.now();
        await this.processJob(job);
        const duration = performance.now() - startTime;
        
        this.updateMetrics(duration, false);
        
        debug.info(this.component, '✅ Job completed', {
          jobId: job.id,
          type: job.type,
          duration: Math.round(duration)
        });

      } catch (error) {
        this.updateMetrics(0, true);
        debug.error(this.component, '❌ Job failed', error, {
          jobId: job.id,
          type: job.type
        });
      }
    }

    this.isProcessing = false;
    await this.persistJobs();
    
    debug.info(this.component, '⏸️ Job processing completed');
  }

  private async processJob(job: AnalyticsJob): Promise<void> {
    switch (job.type) {
      case 'aggregation':
        await this.processAggregationJob(job);
        break;
      case 'cleanup':
        await this.processCleanupJob(job);
        break;
      case 'export':
        await this.processExportJob(job);
        break;
      case 'sync':
        await this.processSyncJob(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  // Job Types Implementation
  private async processAggregationJob(job: AnalyticsJob): Promise<void> {
    debug.info(this.component, '📊 Processing aggregation job', { jobId: job.id });

    try {
      // Get analytics data
      const [usage, performance, growth] = await Promise.all([
        analytics.getUsageMetrics(),
        analytics.getPerformanceMetrics(),
        analytics.getGrowthMetrics()
      ]);

      // Perform aggregations
      const aggregatedData = {
        daily: this.aggregateDailyMetrics(usage),
        weekly: this.aggregateWeeklyMetrics(usage),
        monthly: this.aggregateMonthlyMetrics(usage),
        performance: this.aggregatePerformanceMetrics(performance),
        growth: this.aggregateGrowthMetrics(growth),
        generatedAt: Date.now()
      };

      // Store aggregated data
      await chrome.storage.local.set({
        aggregatedAnalytics: aggregatedData,
        lastAggregation: Date.now()
      });

      debug.info(this.component, '✅ Aggregation completed', {
        totalQRGenerated: usage.totalQRGenerated,
        dailyActiveUsers: Object.keys(usage.dailyActiveUsers).length
      });

    } catch (error) {
      debug.error(this.component, '❌ Aggregation failed', error);
      throw error;
    }
  }

  private async processCleanupJob(job: AnalyticsJob): Promise<void> {
    debug.info(this.component, '🧹 Processing cleanup job', { jobId: job.id });

    try {
      const maxAge = job.data?.maxAge || (30 * 24 * 60 * 60 * 1000); // 30 days
      const cutoffDate = Date.now() - maxAge;

      // Clean old analytics data
      const result = await chrome.storage.local.get([
        'analyticsData',
        'performanceData', 
        'growthData'
      ]);

      let cleanedCount = 0;

      // Clean analytics events
      if (result.analyticsData) {
        const events = result.analyticsData.events || [];
        const cleanedEvents = events.filter((event: any) => event.timestamp > cutoffDate);
        cleanedCount += events.length - cleanedEvents.length;
        
        await chrome.storage.local.set({
          analyticsData: {
            ...result.analyticsData,
            events: cleanedEvents
          }
        });
      }

      // Clean performance data
      if (result.performanceData) {
        Object.keys(result.performanceData).forEach(key => {
          if (Array.isArray(result.performanceData[key])) {
            // Keep only recent performance metrics
            result.performanceData[key] = result.performanceData[key].slice(-1000);
          }
        });

        await chrome.storage.local.set({
          performanceData: result.performanceData
        });
      }

      debug.info(this.component, '✅ Cleanup completed', {
        itemsRemoved: cleanedCount,
        cutoffDate: new Date(cutoffDate).toISOString()
      });

    } catch (error) {
      debug.error(this.component, '❌ Cleanup failed', error);
      throw error;
    }
  }

  private async processExportJob(job: AnalyticsJob): Promise<void> {
    debug.info(this.component, '📤 Processing export job', { jobId: job.id });

    try {
      const exportFormat = job.data?.format || 'json';
      const includePersonalData = job.data?.includePersonalData || false;

      // Generate comprehensive analytics report
      const insights = await analytics.generateInsights();
      
      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
          format: exportFormat,
          includePersonalData
        },
        insights,
        summary: {
          totalQRGenerated: insights.usage.totalQRGenerated,
          topQRTypes: Object.entries(insights.usage.typeDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5),
          averageGenerationTime: insights.performance.qrGenerationTime
            .reduce((a, b) => a + b, 0) / insights.performance.qrGenerationTime.length || 0,
          retentionRate: insights.usage.retentionRate,
          errorRate: insights.usage.errorRate
        }
      };

      // Store export data for pickup
      const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await chrome.storage.local.set({
        [`analyticsExport_${exportId}`]: exportData
      });

      // Notify about export completion
      if (chrome.notifications) {
        chrome.notifications.create(exportId, {
          type: 'basic',
          iconUrl: 'icon-128.png',
          title: 'Analytics Export Ready',
          message: 'Your analytics export has been generated and is ready for download.'
        });
      }

      debug.info(this.component, '✅ Export completed', {
        exportId,
        format: exportFormat,
        dataPoints: Object.keys(exportData.insights).length
      });

    } catch (error) {
      debug.error(this.component, '❌ Export failed', error);
      throw error;
    }
  }

  private async processSyncJob(job: AnalyticsJob): Promise<void> {
    debug.info(this.component, '🔄 Processing sync job', { jobId: job.id });

    try {
      // Check if analytics are enabled and user has consented
      const result = await chrome.storage.local.get(['analyticsEnabled', 'lastSync']);
      
      if (!result.analyticsEnabled) {
        debug.info(this.component, '⏭️ Analytics disabled, skipping sync');
        return;
      }

      // Get aggregated analytics data (privacy-safe)
      const aggregatedData = await chrome.storage.local.get(['aggregatedAnalytics']);
      
      if (!aggregatedData.aggregatedAnalytics) {
        debug.info(this.component, '⏭️ No aggregated data to sync');
        return;
      }

      // Prepare privacy-safe sync data
      const syncData = {
        timestamp: Date.now(),
        version: chrome.runtime.getManifest().version,
        metrics: {
          totalQRGenerated: aggregatedData.aggregatedAnalytics.daily?.totalGenerated || 0,
          averageSessionTime: aggregatedData.aggregatedAnalytics.daily?.averageSessionTime || 0,
          topFeatures: aggregatedData.aggregatedAnalytics.weekly?.topFeatures || [],
          errorRate: aggregatedData.aggregatedAnalytics.performance?.errorRate || 0
        }
      };

      // In a real implementation, this would sync to your analytics service
      // For privacy compliance, ensure this is opt-in and anonymized
      debug.info(this.component, '📡 Would sync data to analytics service', {
        dataSize: JSON.stringify(syncData).length,
        lastSync: result.lastSync
      });

      // Update last sync timestamp
      await chrome.storage.local.set({
        lastSync: Date.now()
      });

      debug.info(this.component, '✅ Sync completed');

    } catch (error) {
      debug.error(this.component, '❌ Sync failed', error);
      throw error;
    }
  }

  // Utility Methods
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private insertJobByPriority(job: AnalyticsJob): void {
    let insertIndex = this.jobQueue.length;
    
    for (let i = 0; i < this.jobQueue.length; i++) {
      if (this.jobQueue[i].priority < job.priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.jobQueue.splice(insertIndex, 0, job);
  }

  private updateMetrics(duration: number, isError: boolean): void {
    if (isError) {
      this.metrics.errorCount++;
    } else {
      this.metrics.jobsProcessed++;
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime * (this.metrics.jobsProcessed - 1) + duration) / 
        this.metrics.jobsProcessed;
      this.metrics.lastProcessedAt = Date.now();
    }
  }

  private async loadPersistedJobs(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['analyticsJobQueue']);
      if (result.analyticsJobQueue && Array.isArray(result.analyticsJobQueue)) {
        this.jobQueue = result.analyticsJobQueue;
        debug.info(this.component, '📥 Loaded persisted jobs', {
          count: this.jobQueue.length
        });
      }
    } catch (error) {
      debug.error(this.component, '❌ Failed to load persisted jobs', error);
    }
  }

  private async persistJobs(): Promise<void> {
    try {
      await chrome.storage.local.set({
        analyticsJobQueue: this.jobQueue,
        analyticsWorkerMetrics: this.metrics
      });
    } catch (error) {
      debug.error(this.component, '❌ Failed to persist jobs', error);
    }
  }

  private schedulePeriodicTasks(): void {
    // Schedule daily aggregation
    this.scheduleJob({
      type: 'aggregation',
      priority: 2,
      scheduledFor: this.getNextMidnight()
    });

    // Schedule weekly cleanup
    this.scheduleJob({
      type: 'cleanup',
      priority: 1,
      scheduledFor: this.getNextSunday(),
      data: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
    });

    // Set up recurring processing
    this.processingIntervalId = setInterval(() => {
      if (!this.isProcessing && this.jobQueue.length > 0) {
        this.startProcessing();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private getNextMidnight(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  private getNextSunday(): number {
    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
    nextSunday.setHours(2, 0, 0, 0); // 2 AM Sunday
    return nextSunday.getTime();
  }

  // Aggregation Methods
  private aggregateDailyMetrics(usage: any): any {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      date: today,
      totalGenerated: usage.totalQRGenerated || 0,
      uniqueTypes: Object.keys(usage.typeDistribution || {}).length,
      mostUsedType: this.getMostUsedType(usage.typeDistribution || {}),
      averageSessionTime: this.calculateAverageSessionTime(usage.sessionDuration || [])
    };
  }

  private aggregateWeeklyMetrics(usage: any): any {
    const weekStart = this.getWeekStart();
    
    return {
      weekStart: weekStart.toISOString(),
      totalGenerated: usage.totalQRGenerated || 0,
      topFeatures: this.getTopFeatures(usage.featureUsage || {}),
      retentionRate: usage.retentionRate || 0,
      growthRate: this.calculateWeeklyGrowth(usage.dailyActiveUsers || {})
    };
  }

  private aggregateMonthlyMetrics(usage: any): any {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    return {
      month: monthStart.toISOString(),
      totalGenerated: usage.totalQRGenerated || 0,
      averageDaily: this.calculateAverageDailyUsage(usage.dailyActiveUsers || {}),
      conversionFunnel: usage.conversionFunnel || {},
      churnRate: this.calculateChurnRate(usage.dailyActiveUsers || {})
    };
  }

  private aggregatePerformanceMetrics(performance: any): any {
    return {
      averageGenerationTime: this.calculateAverage(performance.qrGenerationTime || []),
      p95GenerationTime: this.calculatePercentile(performance.qrGenerationTime || [], 95),
      errorRate: performance.crashRate || 0,
      memoryUsage: this.calculateAverage(performance.memoryUsage || []),
      throughput: this.calculateThroughput(performance.qrGenerationTime || [])
    };
  }

  private aggregateGrowthMetrics(growth: any): any {
    return {
      totalShares: growth.shareEvents || 0,
      viralCoefficient: growth.viralCoefficient || 0,
      referralSources: this.getTopReferralSources(growth.referralSources || {}),
      conversionRate: this.calculateConversionRate(growth)
    };
  }

  // Helper Methods
  private getMostUsedType(typeDistribution: Record<string, number>): string {
    return Object.entries(typeDistribution)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
  }

  private calculateAverageSessionTime(sessionTimes: number[]): number {
    return sessionTimes.length > 0 
      ? sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length 
      : 0;
  }

  private getWeekStart(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek;
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private getTopFeatures(featureUsage: Record<string, number>, limit: number = 5): string[] {
    return Object.entries(featureUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([feature]) => feature);
  }

  private calculateWeeklyGrowth(dailyUsers: Record<string, number>): number {
    const dates = Object.keys(dailyUsers).sort();
    if (dates.length < 7) return 0;
    
    const thisWeek = dates.slice(-7).reduce((sum, date) => sum + dailyUsers[date], 0);
    const lastWeek = dates.slice(-14, -7).reduce((sum, date) => sum + dailyUsers[date], 0);
    
    return lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;
  }

  private calculateAverageDailyUsage(dailyUsers: Record<string, number>): number {
    const values = Object.values(dailyUsers);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  private calculateChurnRate(dailyUsers: Record<string, number>): number {
    // Simplified churn calculation - would need more sophisticated logic in practice
    const dates = Object.keys(dailyUsers).sort();
    if (dates.length < 30) return 0;
    
    const recentDays = dates.slice(-7);
    const olderDays = dates.slice(-30, -7);
    
    const recentAvg = recentDays.reduce((sum, date) => sum + dailyUsers[date], 0) / recentDays.length;
    const olderAvg = olderDays.reduce((sum, date) => sum + dailyUsers[date], 0) / olderDays.length;
    
    return olderAvg > 0 ? Math.max(0, ((olderAvg - recentAvg) / olderAvg) * 100) : 0;
  }

  private calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  private calculateThroughput(generationTimes: number[]): number {
    // QR codes per second
    return generationTimes.length > 0 
      ? 1000 / this.calculateAverage(generationTimes) 
      : 0;
  }

  private getTopReferralSources(sources: Record<string, number>, limit: number = 3): string[] {
    return Object.entries(sources)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([source]) => source);
  }

  private calculateConversionRate(growth: any): number {
    const totalShares = growth.shareEvents || 0;
    const conversions = growth.conversionEvents || 0;
    return totalShares > 0 ? (conversions / totalShares) * 100 : 0;
  }

  // Public API for scheduling common jobs
  public scheduleAggregation(): Promise<string> {
    return this.scheduleJob({
      type: 'aggregation',
      priority: 2
    });
  }

  public scheduleCleanup(maxAge?: number): Promise<string> {
    return this.scheduleJob({
      type: 'cleanup',
      priority: 1,
      data: { maxAge }
    });
  }

  public scheduleExport(format: string = 'json', includePersonalData: boolean = false): Promise<string> {
    return this.scheduleJob({
      type: 'export',
      priority: 3,
      data: { format, includePersonalData }
    });
  }

  public scheduleSync(): Promise<string> {
    return this.scheduleJob({
      type: 'sync',
      priority: 2
    });
  }

  // Cleanup
  public destroy(): void {
    if (this.processingIntervalId) {
      clearInterval(this.processingIntervalId);
    }
    this.isProcessing = false;
    this.jobQueue = [];
  }
}

// Export singleton instance
export const analyticsWorker = AnalyticsWorker.getInstance();
export default analyticsWorker; 