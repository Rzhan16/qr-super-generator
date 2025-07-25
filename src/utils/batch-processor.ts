/**
 * QR Super Generator - Advanced Batch Processing System
 * 
 * High-performance batch QR code generation with queue management,
 * parallel processing, and progress tracking
 */

import { qrService } from './qr-service';
import { QRCodeData, QRGenerationOptions, QRCodeType } from '../types';
import analytics from './analytics';

export interface BatchTask {
  id: string;
  text: string;
  type: QRCodeType;
  options?: QRGenerationOptions;
  metadata?: any;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: QRCodeData;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface BatchJob {
  id: string;
  name: string;
  tasks: BatchTask[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  concurrency: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  results: QRCodeData[];
  errors: string[];
  settings: BatchSettings;
}

export interface BatchSettings {
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  enableAnalytics: boolean;
  saveToHistory: boolean;
  exportFormat: 'zip' | 'json' | 'csv';
}

export interface BatchProgress {
  jobId: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  currentTask?: string;
  estimatedTimeRemaining: number;
  throughput: number;
}

class BatchProcessor {
  private static instance: BatchProcessor;
  private activeJobs: Map<string, BatchJob> = new Map();
  private taskQueue: BatchTask[] = [];
  private isProcessing = false;
  private defaultSettings: BatchSettings = {
    maxConcurrency: 3,
    retryAttempts: 2,
    retryDelay: 1000,
    timeout: 10000,
    enableAnalytics: true,
    saveToHistory: true,
    exportFormat: 'zip'
  };

  private constructor() {
    this.initializeProcessor();
  }

  public static getInstance(): BatchProcessor {
    if (!BatchProcessor.instance) {
      BatchProcessor.instance = new BatchProcessor();
    }
    return BatchProcessor.instance;
  }

  private async initializeProcessor() {
    try {
      // Load persisted jobs on startup
      await this.loadPersistedJobs();
      
      // Resume any incomplete jobs
      await this.resumeIncompleteJobs();
      
    } catch (error) {
      console.error('Failed to initialize batch processor:', error);
    }
  }

  // Job Management
  public async createBatchJob(
    name: string,
    tasks: Omit<BatchTask, 'id' | 'status' | 'progress' | 'createdAt'>[],
    settings?: Partial<BatchSettings>
  ): Promise<string> {
    const jobId = this.generateJobId();
    const jobSettings = { ...this.defaultSettings, ...settings };
    
    const batchTasks: BatchTask[] = tasks.map((task, index) => ({
      ...task,
      id: this.generateTaskId(jobId, index),
      status: 'pending',
      progress: 0,
      createdAt: Date.now()
    }));

    const job: BatchJob = {
      id: jobId,
      name,
      tasks: batchTasks,
      status: 'pending',
      progress: 0,
      concurrency: jobSettings.maxConcurrency,
      createdAt: Date.now(),
      results: [],
      errors: [],
      settings: jobSettings
    };

    this.activeJobs.set(jobId, job);
    await this.persistJob(job);

    if (settings?.enableAnalytics !== false) {
      analytics.trackEvent('batch_processing', 'job_created', {
        jobId,
        taskCount: batchTasks.length,
        concurrency: jobSettings.maxConcurrency
      });
    }

    return jobId;
  }

  public async startBatchJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'pending') {
      throw new Error(`Job ${jobId} is not in pending status`);
    }

    job.status = 'processing';
    job.startedAt = Date.now();
    
    await this.persistJob(job);
    await this.processJob(job);
  }

  public async cancelBatchJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = 'cancelled';
    
    // Cancel pending tasks
    job.tasks.forEach(task => {
      if (task.status === 'pending') {
        task.status = 'failed';
        task.error = 'Job cancelled';
      }
    });

    await this.persistJob(job);

    analytics.trackEvent('batch_processing', 'job_cancelled', {
      jobId,
      progress: job.progress
    });
  }

  public getBatchJob(jobId: string): BatchJob | undefined {
    return this.activeJobs.get(jobId);
  }

  public getAllJobs(): BatchJob[] {
    return Array.from(this.activeJobs.values());
  }

  public getJobProgress(jobId: string): BatchProgress | null {
    const job = this.activeJobs.get(jobId);
    if (!job) return null;

    const completedTasks = job.tasks.filter(t => t.status === 'completed').length;
    const failedTasks = job.tasks.filter(t => t.status === 'failed').length;
    const currentTask = job.tasks.find(t => t.status === 'processing');

    const elapsed = job.startedAt ? Date.now() - job.startedAt : 0;
    const throughput = completedTasks > 0 ? completedTasks / (elapsed / 1000) : 0;
    const remainingTasks = job.tasks.length - completedTasks - failedTasks;
    const estimatedTimeRemaining = throughput > 0 ? remainingTasks / throughput * 1000 : 0;

    return {
      jobId,
      totalTasks: job.tasks.length,
      completedTasks,
      failedTasks,
      currentTask: currentTask?.text.substring(0, 50) + '...',
      estimatedTimeRemaining,
      throughput
    };
  }

  // Batch processing from various sources
  public async createBatchFromTabs(tabs: chrome.tabs.Tab[], settings?: Partial<BatchSettings>): Promise<string> {
    const tasks = tabs
      .filter(tab => tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://')))
      .map((tab, index) => ({
        text: tab.url!,
        type: 'url' as QRCodeType,
        priority: tab.active ? 1 : 2,
        metadata: {
          title: tab.title,
          favIconUrl: tab.favIconUrl,
          tabId: tab.id
        }
      }));

    return this.createBatchJob(`Browser Tabs (${tasks.length})`, tasks, settings);
  }

  public async createBatchFromUrls(urls: string[], settings?: Partial<BatchSettings>): Promise<string> {
    const tasks = urls.map(url => ({
      text: url,
      type: 'url' as QRCodeType,
      priority: 1
    }));

    return this.createBatchJob(`URL Batch (${tasks.length})`, tasks, settings);
  }

  public async createBatchFromText(texts: string[], type: QRCodeType = 'text', settings?: Partial<BatchSettings>): Promise<string> {
    const tasks = texts.map(text => ({
      text,
      type,
      priority: 1
    }));

    return this.createBatchJob(`${type.toUpperCase()} Batch (${tasks.length})`, tasks, settings);
  }

  public async createBatchFromCSV(csvData: string, settings?: Partial<BatchSettings>): Promise<string> {
    const lines = csvData.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const tasks: Omit<BatchTask, 'id' | 'status' | 'progress' | 'createdAt'>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      if (row.text) {
        tasks.push({
          text: row.text,
          type: (row.type as QRCodeType) || 'text',
          priority: parseInt(row.priority) || 1,
          metadata: row
        });
      }
    }

    return this.createBatchJob(`CSV Import (${tasks.length})`, tasks, settings);
  }

  // Core processing logic
  private async processJob(job: BatchJob): Promise<void> {
    try {
      const semaphore = new Semaphore(job.concurrency);
      const promises: Promise<void>[] = [];

      for (const task of job.tasks) {
        if (job.status === 'cancelled') break;

        const promise = semaphore.acquire().then(async (release) => {
          try {
            await this.processTask(task, job);
          } finally {
            release();
          }
        });

        promises.push(promise);
      }

      await Promise.all(promises);

      // Finalize job
      const completedTasks = job.tasks.filter(t => t.status === 'completed').length;
      const failedTasks = job.tasks.filter(t => t.status === 'failed').length;

      if (failedTasks === 0) {
        job.status = 'completed';
      } else if (completedTasks === 0) {
        job.status = 'failed';
      } else {
        job.status = 'completed'; // Partial success
      }

      job.progress = 100;
      job.completedAt = Date.now();

      await this.persistJob(job);

      analytics.trackEvent('batch_processing', 'job_completed', {
        jobId: job.id,
        totalTasks: job.tasks.length,
        completedTasks,
        failedTasks,
        duration: job.completedAt - (job.startedAt || job.createdAt)
      });

    } catch (error) {
      job.status = 'failed';
      job.errors.push((error as Error).message);
      await this.persistJob(job);

      analytics.trackError(error as Error, 'batch_processing');
    }
  }

  private async processTask(task: BatchTask, job: BatchJob): Promise<void> {
    task.status = 'processing';
    task.startedAt = Date.now();
    
    await this.persistJob(job);

    let retryCount = 0;
    const maxRetries = job.settings.retryAttempts;

    while (retryCount <= maxRetries) {
      try {
        const startTime = performance.now();
        
        const qrData = await Promise.race([
          qrService.generateQRCode(task.text, task.options, task.type),
          this.createTimeoutPromise(job.settings.timeout)
        ]);

        const duration = performance.now() - startTime;

        task.result = qrData as QRCodeData;
        task.status = 'completed';
        task.progress = 100;
        task.completedAt = Date.now();

        job.results.push(qrData as QRCodeData);

        // Save to history if enabled
        if (job.settings.saveToHistory) {
          const { storageService } = await import('./storage-service');
          await storageService.addToHistory(qrData as QRCodeData);
        }

        // Update job progress
        const completedCount = job.tasks.filter(t => t.status === 'completed').length;
        job.progress = Math.round((completedCount / job.tasks.length) * 100);

        await this.persistJob(job);

        analytics.trackPerformance('batch_task_duration', duration, 'batch_processing');
        break;

      } catch (error) {
        retryCount++;
        
        if (retryCount <= maxRetries) {
          await this.delay(job.settings.retryDelay * retryCount);
        } else {
          task.status = 'failed';
          task.error = (error as Error).message;
          task.completedAt = Date.now();
          
          job.errors.push(`Task ${task.id}: ${(error as Error).message}`);
          
          await this.persistJob(job);
          
          analytics.trackError(error as Error, 'batch_task_processing');
        }
      }
    }
  }

  // Advanced features
  public async optimizeBatchOrder(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job || job.status !== 'pending') return;

    // Sort tasks by priority and estimated complexity
    job.tasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // Shorter texts typically generate faster
      return a.text.length - b.text.length;
    });

    await this.persistJob(job);
  }

  public async estimateJobDuration(jobId: string): Promise<number> {
    const job = this.activeJobs.get(jobId);
    if (!job) return 0;

    // Base estimation: 500ms per QR code + overhead
    const baseTimePerTask = 500;
    const overhead = 100;
    const concurrencyFactor = 1 / job.concurrency;

    return (job.tasks.length * baseTimePerTask * concurrencyFactor) + overhead;
  }

  public async getJobStatistics(): Promise<any> {
    const jobs = Array.from(this.activeJobs.values());
    
    return {
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      activeJobs: jobs.filter(j => j.status === 'processing').length,
      totalTasks: jobs.reduce((sum, job) => sum + job.tasks.length, 0),
      totalResults: jobs.reduce((sum, job) => sum + job.results.length, 0),
      averageConcurrency: jobs.reduce((sum, job) => sum + job.concurrency, 0) / jobs.length || 0,
      successRate: this.calculateSuccessRate(jobs)
    };
  }

  // Utility methods
  private generateJobId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTaskId(jobId: string, index: number): string {
    return `${jobId}_task_${index}`;
  }

  private async persistJob(job: BatchJob): Promise<void> {
    try {
      const jobs = await chrome.storage.local.get(['batchJobs']);
      const existingJobs = jobs.batchJobs || {};
      existingJobs[job.id] = job;
      
      await chrome.storage.local.set({ batchJobs: existingJobs });
    } catch (error) {
      console.error('Failed to persist batch job:', error);
    }
  }

  private async loadPersistedJobs(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['batchJobs']);
      const jobs = result.batchJobs || {};
      
      Object.values(jobs).forEach((job: any) => {
        this.activeJobs.set(job.id, job);
      });
    } catch (error) {
      console.error('Failed to load persisted jobs:', error);
    }
  }

  private async resumeIncompleteJobs(): Promise<void> {
    const incompleteJobs = Array.from(this.activeJobs.values())
      .filter(job => job.status === 'processing');

    for (const job of incompleteJobs) {
      // Reset processing tasks to pending
      job.tasks.forEach(task => {
        if (task.status === 'processing') {
          task.status = 'pending';
        }
      });

      job.status = 'pending';
      await this.persistJob(job);
    }
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Task timeout')), timeout);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateSuccessRate(jobs: BatchJob[]): number {
    const totalTasks = jobs.reduce((sum, job) => sum + job.tasks.length, 0);
    const successfulTasks = jobs.reduce((sum, job) => 
      sum + job.tasks.filter(t => t.status === 'completed').length, 0
    );
    
    return totalTasks > 0 ? (successfulTasks / totalTasks) * 100 : 0;
  }
}

// Semaphore for concurrency control
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.queue.push(() => {
          this.permits--;
          resolve(() => this.release());
        });
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    }
  }
}

// Export singleton instance
export const batchProcessor = BatchProcessor.getInstance();
export default batchProcessor; 