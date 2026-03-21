import { db } from "../../lib/db/db.js";
import { deliveryAttempts, deliveryStatusEnum } from "../schema.js";
import { eq } from "drizzle-orm";

// Create delivery attempt
export async function createDeliveryAttempt(jobId: number, subscriberId: number, status: "pending" | "success" | "failed" = "pending", attemptNumber: number = 1) {
  const result = await db.insert(deliveryAttempts).values({
    jobId,
    subscriberId,
    status: status as any,
    attemptNumber,
    lastAttempt: new Date(),
  }).returning();
  return result[0];
}

// Get delivery attempts by job
export async function getDeliveryAttemptsByJob(jobId: number) {
  return await db.select().from(deliveryAttempts).where(eq(deliveryAttempts.jobId, jobId));
}

// Update delivery attempt
export async function updateDeliveryAttempt(attemptId: number, status: "pending" | "success" | "failed", attemptNumber: number) {
  const updated = await db.update(deliveryAttempts)
    .set({ status: status as any, attemptNumber, lastAttempt: new Date() })
    .where(eq(deliveryAttempts.id, attemptId))
    .returning();
  return updated[0];
}

// Get failed delivery attempts
export async function getFailedDeliveryAttempts() {
  return await db.select().from(deliveryAttempts).where(eq(deliveryAttempts.status, "failed" as any));
}