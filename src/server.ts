import express from "express";
import cors from "cors";
import { pipelinesRouter } from "./api/pipelines.js";
import { jobsRouter } from "./api/jobs.js";
import dotenv from "dotenv";
import { apiConfig } from "./config.js"

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

console.log(process.env.DATABASE_URL);/////////
// Root route
app.get("/", (req, res) => {
  res.send("Webhook Pipeline Service is running!");
});

// Routes
app.use("/pipelines", pipelinesRouter);
app.use("/jobs", jobsRouter);

// Start server
app.listen(apiConfig.port, () => {
  console.log(`Server running on port ${apiConfig.port}`);
});