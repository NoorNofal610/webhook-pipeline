import { JobQueueManager, JobStatus } from '../services/JobQueueManager.js';
import type { QueuedJob } from '../services/JobQueueManager.js';
import { ProcessingService } from '../services/ProcessingService.js';
import { getPipelineById } from '../db/queries/pipelines.js';
import { getSubscribersByPipeline } from '../db/queries/pipelines.js';
import { createDeliveryAttempt, updateDeliveryAttempt } from '../db/queries/deliveryAttempts.js';

export interface ProcessingResult {
  action: string;
  result: any;
  success: boolean;
  error?: string;
}

export class JobWorker {
  private queueManager: JobQueueManager;
  private processingService: ProcessingService;
  private isRunning: boolean = false;
  private pollInterval: number = 5000; // 5s
  private maxRetries: number = 3;
  private retryDelays: number[] = [1000, 5000, 15000]; // 1s, 5s, 15s

  constructor() {
    this.queueManager = new JobQueueManager();
    this.processingService = new ProcessingService();
  }

  // Start the worker
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('JobWorker started - polling every 5 seconds');

    // Start the polling loop
    this.poll();
  }

  // Stop the worker
  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('JobWorker stopped');
  }

  // Main polling loop
  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processNextJob();
      } catch (error) {
        console.error('Worker polling error:', error);
      }

      await this.sleep(this.pollInterval);
    }
  }

  private async processNextJob(): Promise<void> {
    let job: QueuedJob | null = null;
  
    try {
      job = await this.queueManager.dequeueJob();
      
      if (!job) {
        return;
      }

      console.log(`Processing job ${job.id} for pipeline ${job.pipelineId}`);
      
      const pipeline = await getPipelineById(job.pipelineId);
      if (!pipeline) {
        throw new Error(`Pipeline ${job.pipelineId} not found`);
      }

      const results = await this.processJobAction(pipeline.action, job.data);
      
      const hasFailure = results.some(result => !result.success);
      const validationFailed = results.some(result => 
        result.action === 'order_validation' && 
        result.result && 
        result.result.isValid === false
      );

      if (hasFailure || validationFailed) {
        await this.queueManager.updateJobStatus(job.id, JobStatus.FAILED);
        console.log(`Job ${job.id} marked as failed due to validation or processing failure`);
        
        await this.deliverToSubscribers(job.pipelineId, {
          jobId: job.id,
          pipelineId: job.pipelineId,
          action: pipeline.action,
          results,
          processedAt: new Date().toISOString()
        });

        console.log(`Job ${job.id} completed with failure`);
      } else {
        await this.queueManager.updateJobStatus(job.id, JobStatus.COMPLETED);
        
        await this.deliverToSubscribers(job.pipelineId, {
          jobId: job.id,
          pipelineId: job.pipelineId,
          action: pipeline.action,
          results,
          processedAt: new Date().toISOString()
        });

        console.log(`Job ${job.id} completed successfully`);
      }

    } catch (error) {
      console.error('Job processing error:', error);
      if (job) {
        await this.queueManager.updateJobStatus(job.id, JobStatus.FAILED);
        console.log(`Job ${job.id} marked as failed due to: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async processJobAction(action: string, payload: any): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];

    try {
      switch (action) {
        case 'order_validation':
          const validationResult = await this.processingService.orderValidation(payload);
          results.push({
            action: 'order_validation',
            result: validationResult,
            success: true
          });
          break;

        case 'pricing_discounts':
          const pricingResult = await this.processingService.pricingDiscounts(payload);
          results.push({
            action: 'pricing_discounts',
            result: pricingResult,
            success: true
          });
          break;

        case 'customer_notification':
          const notificationResult = await this.processingService.customerNotification(payload);
          results.push({
            action: 'customer_notification',
            result: notificationResult,
            success: true
          });
          break;

        case 'complete_flow':
          const validation = await this.processingService.orderValidation(payload);
          results.push({
            action: 'order_validation',
            result: validation,
            success: validation.isValid
          });

          if (validation.isValid) {
            const pricing = await this.processingService.pricingDiscounts(payload);
            results.push({
              action: 'pricing_discounts',
              result: pricing,
              success: true
            });

            const notification = await this.processingService.customerNotification({
              ...payload,
              orderTotal: pricing.total
            });
            results.push({
              action: 'customer_notification',
              result: notification,
              success: notification.notificationSent
            });
          }
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

    } catch (error) {
      results.push({
        action: action,
        result: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return results;
  }

  private async deliverToSubscribersWithRetry(pipelineId: number, payload: any): Promise<void> {
    try {
      const subscribers = await getSubscribersByPipeline(pipelineId);
      
      if (subscribers.length === 0) {
        console.log(`No subscribers found for pipeline ${pipelineId}`);
        return;
      }

      console.log(`Delivering to ${subscribers.length} subscribers with retry logic`);

      const deliveryPromises = subscribers.map(async (subscriber) => {
        await this.deliverToSubscriberWithRetry(subscriber.id, subscriber.url, payload);
      });

      await Promise.allSettled(deliveryPromises);

    } catch (error) {
      console.error('Delivery error:', error);
    }
  }

  private async deliverToSubscriberWithRetry(
    subscriberId: number, 
    url: string, 
    payload: any,
    attemptNumber: number = 1
  ): Promise<void> {
    try {
      const retryDelay = this.retryDelays[attemptNumber - 1] || 5000;
      const attempt = await createDeliveryAttempt({
        jobId: payload.jobId,
        subscriberId,
        status: 'pending',
        attemptNumber,
        ...(attemptNumber <= this.maxRetries ? {
          nextRetryAt: new Date(Date.now() + retryDelay)
        } : {})
      });

      if (!attempt) {
        console.error(`Failed to create delivery attempt for subscriber ${subscriberId}`);
        return;
      }

      // Try to deliver
      await this.sendToSubscriber(url, payload);
      console.log(`Delivered to ${url} (attempt ${attemptNumber})`);

      await updateDeliveryAttempt(attempt.id, 'success');

    } catch (error) {
      console.error(`Failed to deliver to ${url} (attempt ${attemptNumber}):`, error);

      const retryDelay = this.retryDelays[attemptNumber] || 5000;
      const attempt = await createDeliveryAttempt({
        jobId: payload.jobId,
        subscriberId,
        status: 'failed',
        attemptNumber,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        ...(attemptNumber < this.maxRetries ? {
          nextRetryAt: new Date(Date.now() + retryDelay)
        } : {})
      });

      if (attemptNumber < this.maxRetries) {
        const retryDelay = this.retryDelays[attemptNumber] || 5000;
        console.log(`Retrying delivery to ${url} in ${retryDelay / 1000} seconds`);
        await this.sleep(retryDelay);
        await this.deliverToSubscriberWithRetry(subscriberId, url, payload, attemptNumber + 1);
      } else {
        console.error(`Max retries reached for ${url}, giving up`);
      }
    }
  }

  private async deliverToSubscribers(pipelineId: number, payload: any): Promise<void> {
    try {
      const subscribers = await getSubscribersByPipeline(pipelineId);
      
      if (subscribers.length === 0) {
        console.log(`No subscribers found for pipeline ${pipelineId}`);
        return;
      }

      console.log(`Delivering to ${subscribers.length} subscribers`);

      const deliveryPromises = subscribers.map(async (subscriber) => {
        try {
          await this.sendToSubscriber(subscriber.url, payload);
          console.log(`Delivered to ${subscriber.url}`);
        } catch (error) {
          console.error(`Failed to deliver to ${subscriber.url}:`, error);
        }
      });

      await Promise.allSettled(deliveryPromises);

    } catch (error) {
      console.error('Delivery error:', error);
    }
  }

  private async sendToSubscriber(url: string, payload: any): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WebhookPipeline-Worker/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      throw new Error(`Failed to send to ${url}: ${error}`);
    }
  }

  getStatus(): {
    isRunning: boolean;
    pollInterval: number;
  } {
    return {
      isRunning: this.isRunning,
      pollInterval: this.pollInterval
    };
  }

  // Helper method to sleep
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const jobWorker = new JobWorker();
