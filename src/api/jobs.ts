import { Router } from 'express';
import { getAllJobs, getJobById, getJobsByStatus, updateJobStatus } from '../db/queries/jobs.js';

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