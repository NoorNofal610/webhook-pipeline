CREATE TABLE pipelines (
    id SERIAL PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE subscribers (
    id SERIAL PRIMARY KEY NOT NULL,
    pipeline_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
);

CREATE TABLE jobs (
    id SERIAL PRIMARY KEY NOT NULL,
    pipeline_id INTEGER NOT NULL,
    data JSONB NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP DEFAULT now() NOT NULL,
    updated_at TIMESTAMP DEFAULT now() NOT NULL,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
);

CREATE TABLE delivery_attempts (
    id SERIAL PRIMARY KEY NOT NULL,
    job_id INTEGER NOT NULL,
    subscriber_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    attempt_number INTEGER DEFAULT 1 NOT NULL,
    last_attempt TIMESTAMP DEFAULT now() NOT NULL,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE
);