import { Router } from 'express';
import { createPipeline, addSubscribers, getAllPipelines, getPipelineById, deletePipeline, deleteSubscribersByPipeline, updatePipeline, getSubscribersByPipeline } from '../db/queries/pipelines.js';
import { JobQueueManager } from '../services/JobQueueManager.js';

export const pipelinesRouter = Router()

// Get all pipelines
pipelinesRouter.get("/", async (req, res) => {
  try {
    const pipelines = await getAllPipelines()
    const results = await Promise.all(
      pipelines.map(async (p) => {
        const subs = await getSubscribersByPipeline(p.id)
        return { ...p, subscribers: subs }
      })
    )
    res.json(results)
  } catch (error) {
    console.error("Database error in GET /pipelines:", error)
    res.status(500).json({
      error: "Database connection failed",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
})

// Get pipeline by ID
pipelinesRouter.get("/:id", async (req, res) => {
  try {
    const pipelineId = parseInt(req.params.id)
    const pipeline = await getPipelineById(pipelineId)
    
    if (!pipeline) {
      return res.status(404).json({ error: "Pipeline not found" })
    }
    
    const subs = await getSubscribersByPipeline(pipelineId)
    res.json({ ...pipeline, subscribers: subs })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Database error" })
  }
})

// Create a new pipeline
pipelinesRouter.post("/", async (req, res) => {
  try {
    const { name, action, subscribers } = req.body

    if (!name || !action || !Array.isArray(subscribers)) {
      return res.status(400).json({ error: "Missing or invalid fields" })
    }

    const pipeline = await createPipeline(name, action)
    if (!pipeline) {
      return res.status(500).json({ error: "Failed to create pipeline" })
    }

    const subs = await addSubscribers(pipeline.id, subscribers)

    const message = `Pipeline created successfully: ${pipeline.name}`
    console.log(message)

    res.status(201).json({
      message,
      pipeline: { ...pipeline, subscribers: subs },
    })

  } catch (error) {
    console.error("Database error in POST /pipelines:", error)

    res.status(500).json({
      error: "Database connection failed",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
})

// Update pipeline
pipelinesRouter.put("/:id", async (req, res) => {
  try {
    const pipelineId = parseInt(req.params.id)
    const { name, action, subscribers } = req.body

    if (!name && !action && !Array.isArray(subscribers)) {
      return res.status(400).json({ error: "Nothing to update" })
    }

    const pipeline = await getPipelineById(pipelineId)
    if (!pipeline) {
      return res.status(404).json({ error: "Pipeline not found" })
    }

    const updatedPipeline = await updatePipeline(pipelineId, { name, action })
    if (!updatedPipeline) {
      return res.status(404).json({ error: "Pipeline not found after update" })
    }

    let updatedSubscribers: { pipelineId: number; url: string }[] = []

    if (Array.isArray(subscribers)) {
      await deleteSubscribersByPipeline(pipelineId)
      updatedSubscribers = await addSubscribers(pipelineId, subscribers)
    }

    const message = `Pipeline updated successfully: ${updatedPipeline.name}`
    console.log(message)

    res.json({
      message,
      pipeline: {
        ...updatedPipeline,
        subscribers:
          updatedSubscribers.length > 0
            ? updatedSubscribers
            : await getSubscribersByPipeline(pipelineId),
      },
    })
  } catch (error) {
    console.error("Database error in PUT /pipelines/:id:", error)
    res.status(500).json({
      error: "Database error",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
})

// Delete pipeline
pipelinesRouter.delete("/:id", async (req, res) => {
  try {
    const pipelineId = parseInt(req.params.id)

    const deleted = await deletePipeline(pipelineId)

    if (!deleted || deleted.length === 0 || !deleted[0]) {
      return res.status(404).json({ error: "Pipeline not found" })
    }

    const deletedPipeline = deleted[0]
    const message = `Pipeline deleted successfully: ${deletedPipeline.name}`
    console.log(message)

    res.json({
      message,
      pipeline: deletedPipeline,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Database error" })
  }
})

// Webhook Endpoint
pipelinesRouter.post("/webhook", async (req, res) => {
  try {
    const token = req.headers["x-webhook-token"];
    if (token !== process.env.WEBHOOK_SECRET) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { pipelineId, payload } = req.body;
    if (!pipelineId || !payload) {
      return res.status(400).json({ error: "Missing pipelineId or payload" });
    }

    if (typeof payload !== "object") {
      return res.status(400).json({ error: "Payload must be an object" });
    }

    // Use JobQueueManager to enqueue the job
    const queueManager = new JobQueueManager();
    const job = await queueManager.enqueueJob(pipelineId, payload);

    res.status(201).json({
      message: "Job queued successfully",
      jobId: job.id,
      status: job.status
    });
  } catch (err) {
    console.error("Webhook Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});