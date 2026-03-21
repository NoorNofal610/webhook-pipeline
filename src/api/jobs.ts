import { Router } from 'express';
import { getAllJobs, getJobById, getJobsByStatus, updateJobStatus } from '../db/queries/jobs.js';

class JobQueueManager {
  async getQueueStats() {
    return { pending: 0, completed: 0, failed: 0 };
  }
  async retryFailedJobs() {
    return 0;
  }
}

class JobWorker {
  private isRunning = false;
  
  async start() {
    this.isRunning = true;
    console.log("Worker started (placeholder)");
  }
  
  async stop() {
    this.isRunning = false;
    console.log("Worker stopped (placeholder)");
  }
  
  getStatus() {
    return { isRunning: this.isRunning };
  }
}

const jobWorker = new JobWorker();

export const jobsRouter = Router()

// Get all jobs
jobsRouter.get("/", async (req, res) => {
  try {
    const jobs = await getAllJobs()
    res.json(jobs)
  } catch (error) {
    console.error("Database error in GET /jobs:", error)
    res.status(500).json({ error: "Database error" })
  }
})

// Get job by ID
jobsRouter.get("/:id", async (req, res) => {
  try {
    const jobId = parseInt(req.params.id)
    const job = await getJobById(jobId)
    
    if (!job) {
      return res.status(404).json({ error: "Job not found" })
    }
    
    res.json(job)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Database error" })
  }
})

// Get jobs by status
jobsRouter.get("/status/:status", async (req, res) => {
  try {
    const status = req.params.status
    const jobs = await getJobsByStatus(status)
    res.json(jobs)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Database error" })
  }
})

// Update job status
jobsRouter.put("/:id/status", async (req, res) => {
  try {
    const jobId = parseInt(req.params.id)
    const { status } = req.body
    
    const updatedJob = await updateJobStatus(jobId, status)
    
    if (!updatedJob) {
      return res.status(404).json({ error: "Job not found" })
    }
    
    res.json(updatedJob)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Database error" })
  }
})

// Worker
// Start
jobsRouter.post("/worker/start", async (req, res) => {
  try {
    await jobWorker.start();
    res.json({ message: "Worker started successfully" });
  } catch (error) {
    console.error("Worker start error:", error);
    res.status(500).json({ error: "Failed to start worker" });
  }
})

// Get status
jobsRouter.get("/worker/status", async (req, res) => {
  try {
    const status = jobWorker.getStatus();
    res.json(status);
  } catch (error) {
    console.error("Worker status error:", error);
    res.status(500).json({ error: "Failed to get worker status" });
  }
})

// Stop
jobsRouter.post("/worker/stop", async (req, res) => {
  try {
    await jobWorker.stop();
    res.json({ message: "Worker stopped successfully" });
  } catch (error) {
    console.error("Worker stop error:", error);
    res.status(500).json({ error: "Failed to stop worker" });
  }
})