# Webhook Pipeline Project

## 🎯 Project Overview

This is a **Webhook Pipeline** system for e-commerce order processing, featuring:

- **🔄 Webhook Ingestion** - Secure endpoint for receiving webhooks
- **⚡ Job Queue System** - Background processing with FIFO queue
- **🛠️ Processing Actions** - Order validation, pricing, notifications
- **🔁 Retry Logic** - Intelligent retry with exponential backoff
- **📊 Delivery Tracking** - Complete delivery attempt history
- **🐳 Docker Ready** - Complete Docker Compose setup
- **🔄 CI/CD Pipeline** - Automated testing, building, and deployment

## 🏗️ System Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Webhook   │───▶│   Queue     │───▶│   Worker    │───▶│  Delivery   │
│  Endpoint   │    │  Manager    │    │  Processor  │    │  Service    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │ PostgreSQL  │    │ Processing  │    │ Subscribers │
│   Request   │    │  Database   │    │   Service   │    │   URLs      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 🛠️ Technology Stack

- **TypeScript** - Type-safe development
- **Node.js + Express** - API server framework
- **PostgreSQL** - Primary database
- **Drizzle ORM** - Database query builder
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker setup)

### 1. Clone and Install
```bash
git clone <repository-url>
cd webhook-pipeline
npm install
```

### 2. Environment Setup
```bash
# Copy environment file
cp .env.example .env

# Edit with your configuration
nano .env
```

**Required Environment Variables:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/webhook_pipeline
WEBHOOK_SECRET=your-secure-webhook-token
PORT=3000
```

### 3. Start with Docker Compose (Recommended)
```bash
# Start all services
docker-compose up --build

# Or run in background
docker-compose up --build -d

# View logs
docker-compose logs -f
```

### 4. Start Locally
```bash
# Build and start
npm run dev

# In another terminal, start worker
curl -X POST http://localhost:3000/jobs/worker/start
```

## 📖 Usage Guide

### 1. Create a Pipeline
```bash
POST /pipelines
Content-Type: application/json

{
  "name": "E-Commerce Order Processing",
  "action": "complete_flow",
  "subscribers": [
    "https://webhook.site/inventory-webhook",
    "https://api.email-service.com/send"
  ]
}
```

### 2. Send a Webhook
```bash
POST /pipelines/webhook
Content-Type: application/json
X-Webhook-Token: your-webhook-secret

{
  "pipelineId": 1,
  "payload": {
    "orderId": "ORD-2024-001234",
    "customerId": "CUST-789456",
    "customerEmail": "john.smith@example.com",
    "items": [
      {
        "productId": "LAPTOP-MACBOOK-14",
        "quantity": 1,
        "price": 1299.99,
        "category": "electronics"
      }
    ],
    "shippingAddress": {
      "firstName": "John",
      "lastName": "Smith",
      "street": "123 Main Street",
      "city": "New York",
      "country": "USA"
    },
    "paymentMethod": "credit_card"
  }
}
```

### 3. Monitor Job Status
```bash
# Get all jobs
GET /jobs

# Get specific job
GET /jobs/1

# Get queue statistics
GET /jobs/stats/queue

# Get delivery attempts
GET /jobs/1/delivery-attempts
```

## 🔧 Processing Actions

### 1. Order Validation
Validates order completeness and data integrity.

**Input:**
```json
{
  "orderId": "ORD-123",
  "customerEmail": "customer@example.com",
  "items": [...],
  "shippingAddress": {...}
}
```

**Output:**
```json
{
  "isValid": true,
  "checks": {
    "productsAvailable": true,
    "emailValid": true,
    "addressComplete": true
  },
  "issues": [],
  "enrichedData": {
    "subtotal": 1299.99,
    "estimatedTax": 207.99,
    "estimatedShipping": 0,
    "estimatedTotal": 1507.98
  }
}
```

### 2. Pricing & Discounts
Calculates final pricing with discounts and taxes.

**Output:**
```json
{
  "subtotal": 1299.99,
  "discount": 130.00,
  "tax": 117.00,
  "shipping": 0,
  "total": 1286.99,
  "appliedDiscounts": ["10% new customer discount"],
  "rules": {
    "newCustomerDiscount": 0.1,
    "freeShippingThreshold": 100
  }
}
```

### 3. Customer Notification
Sends order confirmation notifications.

**Output:**
```json
{
  "notificationSent": true,
  "email": "customer@example.com",
  "messageType": "order_confirmation",
  "sentAt": "2024-03-17T20:30:00Z",
  "messageData": {
    "orderId": "ORD-123",
    "customerName": "John Smith",
    "orderTotal": 1286.99,
    "estimatedDelivery": "2024-03-22"
  }
}
```

## 🔄 Retry Logic & Delivery Tracking

### Retry Configuration
- **Max Retries:** 3 attempts per subscriber
- **Backoff Strategy:** 1s → 5s → 15s (exponential)
- **Error Tracking:** Detailed error messages and timestamps

### Delivery Attempts API
```bash
# Get delivery attempts for a job
GET /jobs/{jobId}/delivery-attempts

# Get attempts by status
GET /jobs/delivery-attempts/status/{status}

# Get attempts by subscriber
GET /jobs/delivery-attempts/subscriber/{subscriberId}
```

### Delivery Attempt Structure
```json
{
  "id": 1,
  "jobId": 123,
  "subscriberId": 456,
  "status": "success",
  "attemptNumber": 1,
  "lastAttempt": "2024-03-17T20:30:00Z",
  "nextRetryAt": null,
  "errorMessage": null,
  "createdAt": "2024-03-17T20:30:00Z"
}
```

## 📡 API Endpoints

### Pipelines
- `POST /pipelines` - Create pipeline
- `GET /pipelines` - List all pipelines
- `GET /pipelines/:id` - Get pipeline details
- `PUT /pipelines/:id` - Update pipeline
- `DELETE /pipelines/:id` - Delete pipeline
- `POST /pipelines/webhook` - Receive webhook

### Jobs
- `GET /jobs` - List all jobs
- `GET /jobs/:id` - Get job details
- `GET /jobs/status/:status` - Get jobs by status
- `GET /jobs/stats/queue` - Queue statistics
- `GET /jobs/:id/delivery-attempts` - Job delivery history

### Worker Management
- `GET /jobs/worker/status` - Worker status
- `POST /jobs/worker/start` - Start worker
- `POST /jobs/worker/stop` - Stop worker
- `POST /jobs/retry-failed` - Retry failed jobs

### Delivery Tracking
- `GET /jobs/delivery-attempts/status/:status` - Attempts by status
- `GET /jobs/delivery-attempts/subscriber/:id` - Attempts by subscriber

## 🐳 Docker Setup

### Docker Compose Services
- **postgres** - PostgreSQL 15 database
- **app** - Node.js application

### Docker Commands
```bash
# Build and start all services
docker-compose up --build

# Start in background
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down --volumes

# Rebuild only app
docker-compose up --build app
```

### Environment Variables (Docker)
```yaml
environment:
  DATABASE_URL: postgresql://postgres:postgres@postgres:5432/webhook_pipeline
  WEBHOOK_SECRET: webhook-secret-12345
  PORT: 3000
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
- **Triggers:** Push to main/develop, Pull Requests
- **Jobs:** Test, Quality, Deploy
- **Environments:** Staging, Production

### Pipeline Stages
1. **Testing** - Unit and integration tests with PostgreSQL
2. **Quality** - TypeScript compilation, formatting, linting
3. **Building** - TypeScript compilation
4. **Docker** - Image building and pushing to Docker Hub
5. **Deployment** - Automated deployment simulation

### Required Secrets
```bash
DOCKER_USERNAME=your_docker_username
DOCKER_PASSWORD=your_access_token
```

### Pipeline Configuration
```yaml
# Tests Job
- Runs unit and integration tests
- Uses PostgreSQL service
- Validates TypeScript compilation

# Quality Job  
- Checks code formatting
- Runs linting
- Validates TypeScript

# Deploy Job
- Builds Docker image
- Pushes to Docker Hub
- Simulates deployment
```

## 📊 Database Schema

### Tables
- **pipelines** - Pipeline configurations
- **subscribers** - Subscriber URLs
- **jobs** - Job queue entries
- **delivery_attempts** - Delivery tracking

### Relationships
```
pipelines (1) → (N) subscribers
pipelines (1) → (N) jobs
jobs (1) → (N) delivery_attempts
subscribers (1) → (N) delivery_attempts
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test:processing
```

### Test Coverage
- Processing Service logic
- Job Queue operations
- API endpoints
- Error handling
- Database queries

## 🔧 Development

### Scripts
```bash
# Development mode
npm run dev

# Production build
npm run build

# Start production
npm start

# Docker commands
npm run docker:build
npm run docker:compose
npm run docker:compose:down

# Code quality
npm run format:check
npm run lint
```

### Project Structure
```
src/
├── api/           # API routes
├── db/            # Database schema and queries
├── services/      # Business logic
├── workers/       # Background processing
├── config/        # Configuration
└── tests/         # Test files
```

## 🚀 Deployment

### Production Deployment
```bash
# Using Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Or using Docker directly
docker run -d \
  --name webhook-pipeline \
  -p 3000:3000 \
  -e DATABASE_URL=... \
  -e WEBHOOK_SECRET=... \
  webhook-pipeline:latest
```

### Environment Setup
- Set up PostgreSQL database
- Configure environment variables
- Run database migrations
- Start application and worker

## 📈 Monitoring

### Health Checks
- Application health: `GET /jobs/worker/status`
- Database health: PostgreSQL health check
- Docker health checks configured

### Logging
- Structured logging with timestamps
- Error tracking and reporting
- Delivery attempt logging
- Job processing logs

## 🔒 Security

### Authentication
- Webhook token validation
- Request authentication
- Input validation and sanitization

### Best Practices
- Non-root Docker user
- Environment variable secrets
- SQL injection prevention
- Rate limiting considerations

## 🎯 What I Built

### Core Features Implemented
1. **Webhook Ingestion System**
   - Secure endpoint with token validation
   - JSON payload processing
   - Error handling and logging

2. **Job Queue Management**
   - FIFO queue implementation
   - Background worker processing
   - Job status tracking

3. **Processing Pipeline**
   - Order validation logic
   - Pricing and discount calculations
   - Customer notification system

4. **Retry Logic**
   - Exponential backoff (1s, 5s, 15s)
   - Maximum 3 retry attempts
   - Detailed error tracking

5. **Delivery Tracking**
   - Complete attempt history
   - Status monitoring
   - Error logging

6. **CI/CD Pipeline**
   - Automated testing with PostgreSQL
   - Code quality checks
   - Docker image building and pushing
   - Deployment simulation

### Technical Implementation
- **Multi-stage Docker build** for optimized production images
- **TypeScript** for type safety and better development experience
- **PostgreSQL** with Drizzle ORM for reliable data persistence
- **Express.js** for RESTful API implementation
- **GitHub Actions** for complete CI/CD automation

### Database Design
- **Normalized schema** with proper relationships
- **Delivery attempts tracking** for monitoring
- **Job status management** for queue processing
- **Pipeline configuration** for flexible webhook routing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request
