import { db } from '../../lib/db/db.js';
import { deliveryAttempts } from '../schema.js';
import { eq, and, lt } from 'drizzle-orm';

export interface DeliveryAttempt {
  id: number;
  jobId: number;
  subscriberId: number;
  status: 'pending' | 'success' | 'failed';
  attemptNumber: number;
  lastAttempt: Date;
  nextRetryAt?: Date | null;
  errorMessage?: string | null;
  createdAt: Date;
}

export interface CreateDeliveryAttempt {
  jobId: number;
  subscriberId: number;
  status: 'pending' | 'success' | 'failed';
  attemptNumber: number;
  lastAttempt?: Date | null;
  nextRetryAt?: Date | null;
  errorMessage?: string | null;
  createdAt?: Date | null;
}

// Create delivery attempt
export async function createDeliveryAttempt(data: CreateDeliveryAttempt): Promise<DeliveryAttempt | null> {
  try {
    const [attempt] = await db.insert(deliveryAttempts).values({
      jobId: data.jobId,
      subscriberId: data.subscriberId,
      status: data.status,
      attemptNumber: data.attemptNumber,
      lastAttempt: data.lastAttempt || new Date(),
      nextRetryAt: data.nextRetryAt,
      errorMessage: data.errorMessage,
      createdAt: data.createdAt || new Date()
    }).returning();
    
    return attempt || null;
  } catch (error) {
    console.error('Error creating delivery attempt:', error);
    return null;
  }
}

// Update delivery attempt status
export async function updateDeliveryAttempt(
  id: number, 
  status: 'pending' | 'success' | 'failed',
  errorMessage?: string,
  nextRetryAt?: Date
): Promise<DeliveryAttempt | null> {
  try {
    const [attempt] = await db
      .update(deliveryAttempts)
      .set({
        status,
        lastAttempt: new Date(),
        errorMessage,
        nextRetryAt
      })
      .where(eq(deliveryAttempts.id, id))
      .returning();
    
    return attempt || null;
  } catch (error) {
    console.error('Error updating delivery attempt:', error);
    return null;
  }
}

// Get delivery attempts for a job
export async function getDeliveryAttemptsByJob(jobId: number): Promise<DeliveryAttempt[]> {
  try {
    const attempts = await db
      .select({
        id: deliveryAttempts.id,
        jobId: deliveryAttempts.jobId,
        subscriberId: deliveryAttempts.subscriberId,
        status: deliveryAttempts.status,
        attemptNumber: deliveryAttempts.attemptNumber,
        lastAttempt: deliveryAttempts.lastAttempt,
        nextRetryAt: deliveryAttempts.nextRetryAt,
        errorMessage: deliveryAttempts.errorMessage,
        createdAt: deliveryAttempts.createdAt
      })
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.jobId, jobId))
      .orderBy(deliveryAttempts.createdAt);
    
    return attempts;
  } catch (error) {
    console.error('Error getting delivery attempts:', error);
    return [];
  }
}

// Get failed delivery attempts ready for retry
export async function getFailedAttemptsForRetry(): Promise<DeliveryAttempt[]> {
  try {
    const now = new Date();
    const attempts = await db
      .select({
        id: deliveryAttempts.id,
        jobId: deliveryAttempts.jobId,
        subscriberId: deliveryAttempts.subscriberId,
        status: deliveryAttempts.status,
        attemptNumber: deliveryAttempts.attemptNumber,
        lastAttempt: deliveryAttempts.lastAttempt,
        nextRetryAt: deliveryAttempts.nextRetryAt,
        errorMessage: deliveryAttempts.errorMessage,
        createdAt: deliveryAttempts.createdAt
      })
      .from(deliveryAttempts)
      .where(
        and(
          eq(deliveryAttempts.status, 'failed'),
          lt(deliveryAttempts.nextRetryAt, now)
        )
      );
    
    return attempts;
  } catch (error) {
    console.error('Error getting failed attempts for retry:', error);
    return [];
  }
}

// Get delivery attempts for a specific subscriber
export async function getDeliveryAttemptsBySubscriber(subscriberId: number): Promise<DeliveryAttempt[]> {
  try {
    const attempts = await db
      .select({
        id: deliveryAttempts.id,
        jobId: deliveryAttempts.jobId,
        subscriberId: deliveryAttempts.subscriberId,
        status: deliveryAttempts.status,
        attemptNumber: deliveryAttempts.attemptNumber,
        lastAttempt: deliveryAttempts.lastAttempt,
        nextRetryAt: deliveryAttempts.nextRetryAt,
        errorMessage: deliveryAttempts.errorMessage,
        createdAt: deliveryAttempts.createdAt
      })
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.subscriberId, subscriberId))
      .orderBy(deliveryAttempts.createdAt);
    
    return attempts;
  } catch (error) {
    console.error('Error getting delivery attempts by subscriber:', error);
    return [];
  }
}

// Get delivery attempts by status
export async function getDeliveryAttemptsByStatus(status: 'pending' | 'success' | 'failed'): Promise<DeliveryAttempt[]> {
  try {
    const attempts = await db
      .select({
        id: deliveryAttempts.id,
        jobId: deliveryAttempts.jobId,
        subscriberId: deliveryAttempts.subscriberId,
        status: deliveryAttempts.status,
        attemptNumber: deliveryAttempts.attemptNumber,
        lastAttempt: deliveryAttempts.lastAttempt,
        nextRetryAt: deliveryAttempts.nextRetryAt,
        errorMessage: deliveryAttempts.errorMessage,
        createdAt: deliveryAttempts.createdAt
      })
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.status, status))
      .orderBy(deliveryAttempts.createdAt);
    
    return attempts;
  } catch (error) {
    console.error('Error getting delivery attempts by status:', error);
    return [];
  }
}

// Delete delivery attempts for a job
export async function deleteDeliveryAttemptsByJob(jobId: number): Promise<boolean> {
  try {
    await db
      .delete(deliveryAttempts)
      .where(eq(deliveryAttempts.jobId, jobId));
    
    return true;
  } catch (error) {
    console.error('Error deleting delivery attempts:', error);
    return false;
  }
}
