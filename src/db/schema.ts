import { pgTable, serial, text, jsonb, timestamp, integer } from "drizzle-orm/pg-core";

// Pipelines
export const pipelines = pgTable("pipelines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subscribers
export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  pipelineId: serial("pipeline_id").references(() => pipelines.id),
  url: text("url").notNull(),
});

// Jobs
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  pipelineId: serial("pipeline_id").references(() => pipelines.id),
  data: jsonb("data").notNull(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Delivery Attempts
export const deliveryAttempts = pgTable("delivery_attempts", {
  id: serial("id").primaryKey(),
  jobId: serial("job_id").references(() => jobs.id),
  subscriberId: serial("subscriber_id").references(() => subscribers.id),
  status: text("status").default("pending").notNull(),
  attemptNumber: integer("attempt_number").default(1).notNull(),
  lastAttempt: timestamp("last_attempt").defaultNow().notNull(),
  nextRetryAt: timestamp("next_retry_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
