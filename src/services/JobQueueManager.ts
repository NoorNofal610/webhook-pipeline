import { createJob, getJobsByStatus, updateJobStatus } from '../db/queries/jobs.js';
import { getPipelineById } from '../db/queries/pipelines.js';

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface QueuedJob {
  id: number;
  pipelineId: number;
  data: any;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class JobQueueManager {
  
  // Add new job to queue
  async enqueueJob(pipelineId: number, payload: any): Promise<QueuedJob> {
    try {
      // Validate pipeline exists
      const pipeline = await getPipelineById(pipelineId);
      if (!pipeline) {
        throw new Error(`Pipeline with ID ${pipelineId} not found`);
      }

      // Create job in database
      const job = await createJob(pipelineId, payload);
      
      if (!job) {
        throw new Error('Failed to create job');
      }
      
      console.log(`Job ${job.id} enqueued for pipeline ${pipelineId}`);
      return {
        id: job.id,
        pipelineId: job.pipelineId,
        data: job.data,
        status: job.status as JobStatus,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      };
    } catch (error) {
      console.error('Failed to enqueue job:', error);
      throw error;
    }
  }

  // Get next pending job
  async dequeueJob(): Promise<QueuedJob | null> {
    try {
      // Get first pending job
      const pendingJobs = await getJobsByStatus(JobStatus.PENDING);
      
      if (pendingJobs.length === 0) {
        return null;
      }

      const job = pendingJobs[0]; // FIFO - take first job
      
      if (!job) {
        return null;
      }
      
      // Update status to processing to prevent other workers from taking it
      await this.updateJobStatus(job.id, JobStatus.PROCESSING);
      
      console.log(`Job ${job.id} dequeued and marked as processing`);
      
      return {
        id: job.id,
        pipelineId: job.pipelineId,
        data: job.data,
        status: JobStatus.PROCESSING,
        createdAt: job.createdAt,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Failed to dequeue job:', error);
      return null;
    }
  }

  // Update job status
  async updateJobStatus(jobId: number, status: JobStatus): Promise<void> {
    try {
      await updateJobStatus(jobId, status);
      console.log(`Job ${jobId} status updated to: ${status}`);
    } catch (error) {
      console.error(`Failed to update job ${jobId} status:`, error);
      throw error;
    }
  }

  // Get all pending jobs
  async getPendingJobs(): Promise<QueuedJob[]> {
    try {
      const jobs = await getJobsByStatus(JobStatus.PENDING);
      return jobs.map(job => {
        if (!job) return null;
        return {
          id: job.id,
          pipelineId: job.pipelineId,
          data: job.data,
          status: job.status as JobStatus,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        };
      }).filter(job => job !== null) as QueuedJob[];
    } catch (error) {
      console.error('Failed to get pending jobs:', error);
      return [];
    }
  }

  // Get jobs by status
  async getJobsByStatus(status: JobStatus): Promise<QueuedJob[]> {
    try {
      const jobs = await getJobsByStatus(status);
      return jobs.map(job => {
        if (!job) return null;
        return {
          id: job.id,
          pipelineId: job.pipelineId,
          data: job.data,
          status: job.status as JobStatus,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        };
      }).filter(job => job !== null) as QueuedJob[];
    } catch (error) {
      console.error(`Failed to get jobs with status ${status}:`, error);
      return [];
    }
  }

  // Get queue statistics
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    try {
      const pending = await getJobsByStatus(JobStatus.PENDING);
      const processing = await getJobsByStatus(JobStatus.PROCESSING);
      const completed = await getJobsByStatus(JobStatus.COMPLETED);
      const failed = await getJobsByStatus(JobStatus.FAILED);

      return {
        pending: pending.length,
        processing: processing.length,
        completed: completed.length,
        failed: failed.length,
        total: pending.length + processing.length + completed.length + failed.length
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0
      };
    }
  }

  // Mark failed jobs for retry
  async retryFailedJobs(): Promise<number> {
    try {
      const failedJobs = await getJobsByStatus(JobStatus.FAILED);
      let retriedCount = 0;

      for (const job of failedJobs) {
        // Simple retry logic: mark failed jobs as pending again
        await this.updateJobStatus(job.id, JobStatus.PENDING);
        retriedCount++;
        console.log(`Job ${job.id} marked for retry`);
      }

      console.log(`Retried ${retriedCount} failed jobs`);
      return retriedCount;
    } catch (error) {
      console.error('Failed to retry jobs:', error);
      return 0;
    }
  }

  // Clean up old completed jobs
  async cleanupOldJobs(daysOld: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const completedJobs = await getJobsByStatus(JobStatus.COMPLETED);
      const oldJobs = completedJobs.filter(job => job.createdAt < cutoffDate);

      // In a real implementation, you would delete these jobs
      // For now, we'll just log them
      console.log(`Found ${oldJobs.length} jobs older than ${daysOld} days`);
      
      return oldJobs.length;
    } catch (error) {
      console.error('Failed to cleanup old jobs:', error);
      return 0;
    }
  }
}
