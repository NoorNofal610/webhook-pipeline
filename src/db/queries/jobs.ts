import { db } from "../../lib/db/db.js";
import { jobs } from "../schema.js";
import { eq } from "drizzle-orm";

// Create a new job
export async function createJob(pipelineId: number, data: object) {
  const result = await db.insert(jobs).values({ pipelineId, data, status: "pending" }).returning();
  return result[0];
}

// Get job by ID
export async function getJobById(jobId: number) {
  const result = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  return result[0];
}

// Get all jobs
export async function getAllJobs() {
  return await db.select().from(jobs);
}

// Get jobs by status
export async function getJobsByStatus(status: string) {
  return await db.select().from(jobs).where(eq(jobs.status, status));
}

// Update job status
export async function updateJobStatus(jobId: number, status: string) {
  const updated = await db.update(jobs)
    .set({ status, updatedAt: new Date() })
    .where(eq(jobs.id, jobId))
    .returning();
  return updated[0];
}