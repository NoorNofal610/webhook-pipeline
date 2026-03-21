import { db } from "../../lib/db/db.js"
import { pipelines, subscribers } from "../schema.js"
import { eq } from "drizzle-orm"

// Create a new pipeline
export async function createPipeline(name: string, action: string) {
  const result = await db
    .insert(pipelines)
    .values({ name, action })
    .returning()

  if (!result || result.length === 0) {
    throw new Error("Failed to create pipeline")
  }

  console.log(`Pipeline created: ${name}`)
  return result[0]
}

// Add subscribers to a pipeline
export async function addSubscribers(pipelineId: number, urls: string[]) {
  if (!urls || urls.length === 0) return []

  const subs = urls.map((url) => ({
    pipelineId,
    url,
  }))

  await db.insert(subscribers).values(subs)
  console.log(`Added ${subs.length} subscribers to pipeline ${pipelineId}`)
  return subs
}

// Get all pipelines
export async function getAllPipelines() {
  return await db.select().from(pipelines)
}

// Get all subscribers for a specific pipeline
export async function getSubscribersByPipeline(pipelineId: number) {
  return await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.pipelineId, pipelineId))
}

// Get a specific pipeline by ID
export async function getPipelineById(pipelineId: number) {
  const result = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.id, pipelineId))
    .limit(1)

  return result[0]
}

// Delete a pipeline
export async function deletePipeline(pipelineId: number) {
  const deleted = await db
    .delete(pipelines)
    .where(eq(pipelines.id, pipelineId))
    .returning()

  console.log(`Pipeline deleted: ID ${pipelineId}`)
  return deleted
}

// Delete all subscribers for a pipeline
export async function deleteSubscribersByPipeline(pipelineId: number) {
  const deleted = await db
    .delete(subscribers)
    .where(eq(subscribers.pipelineId, pipelineId))
    .returning()

  console.log(`Deleted ${deleted.length} subscribers from pipeline ${pipelineId}`)
  return deleted
}

// Update a pipeline
export async function updatePipeline(
  pipelineId: number,
  data: { name?: string; action?: string }
) {
  if (!data.name && !data.action) {
    throw new Error("Nothing to update")
  }

  const updated = await db
    .update(pipelines)
    .set(data)
    .where(eq(pipelines.id, pipelineId))
    .returning()

  console.log(`Pipeline updated: ID ${pipelineId}`)
  return updated[0]
}