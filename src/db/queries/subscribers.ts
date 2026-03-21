import { db } from "../../lib/db/db.js";
import { subscribers } from "../schema.js";
import { eq } from "drizzle-orm";

// Add subscribers
export async function addSubscribers(pipelineId: number, urls: string[]) {
  const subs = urls.map(url => ({ pipelineId, url }));
  await db.insert(subscribers).values(subs);
  return subs;
}

// Get subscribers by pipeline
export async function getSubscribersByPipeline(pipelineId: number) {
  return await db.select().from(subscribers).where(eq(subscribers.pipelineId, pipelineId));
}

// Delete subscribers
export async function deleteSubscribersByPipeline(pipelineId: number) {
  return await db.delete(subscribers).where(eq(subscribers.pipelineId, pipelineId)).returning();
}

// Get subscriber by ID
export async function getSubscriberById(subscriberId: number) {
  const result = await db.select().from(subscribers).where(eq(subscribers.id, subscriberId)).limit(1);
  return result[0];
}

// Update subscriber
export async function updateSubscriber(subscriberId: number, url: string) {
  const updated = await db.update(subscribers).set({ url }).where(eq(subscribers.id, subscriberId)).returning();
  return updated[0];
}