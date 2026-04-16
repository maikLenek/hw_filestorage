# File Storage Microservice

A high-performance NestJS hybrid application for file storage, caching, and automated archival. This service provides a RESTful API for file upload, download, and management with intelligent caching and automatic archival to object storage.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Load Testing](#load-testing)
- [Development](#development)
- [Implementation Notes](#implementation-notes)

---

## Overview

This microservice implements a two-tier storage system:

- **Hot Storage**: Local filesystem for frequently accessed files
- **Archive Storage**: MinIO S3-compatible object storage for cold data

Files are automatically archived based on age using a scheduled job queue, reducing storage costs while maintaining high availability for active files.

### Tech Stack

- **Framework**: NestJS 11 (Hybrid: HTTP + Microservices)
- **Runtime**: Node.js with TypeScript
- **Caching**: Redis (metadata and L2 cache)
- **Message Queue**: RabbitMQ (archival jobs)
- **Object Storage**: MinIO (S3-compatible)
- **Containerization**: Docker Compose

---

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────────────────────────────────────┐
│         NestJS Hybrid Application           │
│                                             │
│  ┌──────────────┐      ┌─────────────────┐ │
│  │ HTTP Server  │      │ RabbitMQ Worker │ │
│  │  (REST API)  │      │   (Archival)    │ │
│  └──────┬───────┘      └────────▲────────┘ │
│         │                       │          │
│         ▼                       │          │
│  ┌─────────────────────────────┴────────┐ │
│  │      File Service (Business Logic)   │ │
│  └───┬─────────────────────┬────────────┘ │
│      │                     │              │
│      ▼                     ▼              │
│  ┌─────────┐         ┌──────────────┐    │
│  │  Cache  │         │   Storage    │    │
│  │ (Redis) │         │   Services   │    │
│  └─────────┘         └──────┬───────┘    │
│                             │             │
└─────────────────────────────┼─────────────┘
                              │
          ┌───────────────────┴───────────────┐
          │                                   │
          ▼                                   ▼
  ┌───────────────┐                  ┌────────────────┐
  │ Hot Storage   │                  │ Archive Storage│
  │ (Filesystem)  │                  │    (MinIO)     │
  └───────────────┘                  └────────────────┘
```

### Components

1. **HTTP Server**: REST API for file operations (upload, download, list, delete)
2. **RabbitMQ Worker**: Background processor for archival jobs
3. **Scheduler**: Cron-based job that scans for files eligible for archival
4. **Cache Service**: Redis-based metadata cache with TTL
5. **Hot Storage**: Local filesystem for active files
6. **Archive Storage**: MinIO S3-compatible storage for archived files

---

## Features

### Core Functionality

- ✅ **File Upload**: Multipart file upload with type/ID categorization
- ✅ **File Download**: Streaming downloads with proper content-type headers
- ✅ **File Listing**: List all files within a type category
- ✅ **File Deletion**: Remove files from both hot and archive storage
- ✅ **Batch Existence Check**: Check multiple file IDs in one request

---

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development/load testing)
- npm 9+

---

## Quick Start

### 1. Clone and Configure

```bash
# Copy environment template
cp .env.example .env

# Edit .env if needed (defaults work for Docker Compose)
nano .env
```

### 2. Start with Docker Compose

```bash
# Start all services (production build)
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f filestorage_api
```

The API will be available at `http://localhost:3000`

**Services Started:**

- `filestorage_api` - Main application (port 3000)
- `filestorage_redis` - Cache layer (internal)
- `filestorage_rabbitmq` - Message queue (internal)
- `filestorage_minio` - Object storage (ports 9000, 9001)

### 3. Verify Health

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "info": {
    "redis": { "status": "up" },
    "rabbitmq": { "status": "up" },
    "storage": { "status": "up" }
  }
}
```

### 4. Test File Upload

```bash
# Create a test file
echo "Hello, File Storage!" > test.txt

# Upload file
curl -X POST \
  -F "file=@test.txt" \
  http://localhost:3000/v1/files/invoices/inv-001

# Download file
curl http://localhost:3000/v1/files/invoices/inv-001
```

### 5. Stop Services

```bash
# Stop and remove containers
docker compose down

# Stop and remove containers + volumes (clears all data)
docker compose down -v
```

---

## Configuration

### Environment Variables

All configuration is done via environment variables. See [.env.example](.env.example) for the complete list.

#### Key Settings

| Variable                | Default                  | Description                  |
| ----------------------- | ------------------------ | ---------------------------- |
| `PORT`                  | `3000`                   | HTTP server port             |
| `REDIS_HOST`            | `filestorage_redis`      | Redis hostname               |
| `RABBITMQ_URL`          | `amqp://guest:guest@...` | RabbitMQ connection URL      |
| `HOT_STORAGE_PATH`      | `/hot-storage`           | Path for hot file storage    |
| `MINIO_ENDPOINT`        | `filestorage_minio`      | MinIO server hostname        |
| `MINIO_ACCESS_KEY`      | `minioadmin`             | MinIO access key             |
| `MINIO_SECRET_KEY`      | `minioadmin`             | MinIO secret key             |
| `ARCHIVE_AFTER_SECONDS` | `604800`                 | Archive files after (7 days) |
| `ARCHIVAL_CRON`         | `0 * * * * *`            | Cron schedule (every minute) |
| `UPLOAD_MAX_SIZE_BYTES` | `104857600`              | Max file size (100 MB)       |

#### Development Mode

For development with hot reload:

```bash
docker compose -f compose.yml -f compose.override.yml up
```

This mounts your local source code and uses `nodemon` for auto-reload.

---

## API Documentation

Base URL: `http://localhost:3000/v1`

### Endpoints

#### Upload File

```http
POST /v1/files/:type/:id
Content-Type: multipart/form-data

Body:
  file: <binary>
```

**Parameters:**

- `type` (path): File category/type (alphanumeric, hyphens, underscores)
- `id` (path): Unique file identifier within type
- `file` (body): File content (max 100 MB)

**Response:** `201 Created`

```json
{
  "type": "invoices",
  "id": "inv-001",
  "location": "hot",
  "size": 1024,
  "contentType": "application/pdf",
  "createdAt": "2026-04-16T10:30:00.000Z"
}
```

---

#### Download File

```http
GET /v1/files/:type/:id
```

**Parameters:**

- `type` (path): File category/type
- `id` (path): File identifier

**Response:** `200 OK`

- Headers: `Content-Type`, `Content-Disposition`
- Body: File binary stream

---

#### List Files

```http
GET /v1/files/:type
```

**Parameters:**

- `type` (path): File category/type

**Response:** `200 OK`

```json
{
  "files": [
    {
      "id": "inv-001",
      "location": "hot",
      "size": 1024,
      "contentType": "application/pdf",
      "createdAt": "2026-04-16T10:30:00.000Z"
    }
  ]
}
```

---

#### Delete File

```http
DELETE /v1/files/:type/:id
```

**Parameters:**

- `type` (path): File category/type
- `id` (path): File identifier

**Response:** `204 No Content`

---

#### Batch Existence Check

```http
GET /v1/files/:type/exists?ids=id1,id2,id3
```

**Parameters:**

- `type` (path): File category/type
- `ids` (query): Comma-separated list of file IDs

**Response:** `200 OK`

```json
{
  "exists": {
    "id1": true,
    "id2": false,
    "id3": true
  }
}
```

---

#### Health Check

```http
GET /health
```

**Response:** `200 OK` or `503 Service Unavailable`

```json
{
  "status": "ok",
  "info": {
    "redis": { "status": "up" },
    "rabbitmq": { "status": "up" },
    "storage": { "status": "up" }
  }
}
```

---

## Load Testing

The project includes a comprehensive load test that uploads 300,000 files across multiple categories.

### Run Load Test

**Prerequisites:** Ensure the services are running (`docker compose up -d`)

```bash
# Install dependencies (if not already done)
npm install

# Run with defaults (300k files, 50 concurrent)
npm run load-test

# Run with custom settings
BASE_URL=http://localhost:3000 \
CONCURRENCY=100 \
CATEGORIES=10 \
FILES_PER_CATEGORY=30000 \
npm run load-test
```

### Load Test Parameters

| Variable             | Default                 | Description                    |
| -------------------- | ----------------------- | ------------------------------ |
| `BASE_URL`           | `http://localhost:3000` | API endpoint                   |
| `CONCURRENCY`        | `50`                    | Parallel upload limit          |
| `CATEGORIES`         | `10`                    | Number of file type categories |
| `FILES_PER_CATEGORY` | `30000`                 | Files per category             |

### Expected Results

```
File Storage Load Test
  Target: http://localhost:3000
  Categories: 10 × 30000 files = 300000 total
  File size: 100 KB
  Concurrency: 50

[overall] 1,000 / 300,000 — 0.3% — elapsed 15.2s — rate 65 req/s
[overall] 2,000 / 300,000 — 0.7% — elapsed 29.8s — rate 67 req/s
...

✓ Done. Total: 300,000 files | Elapsed: 1h 15m | Avg rate: 66 req/s
  p50 latency: 750ms | p95 latency: 1800ms
  Success rate: 100.00% (0 failures)
```

---

## Development

### Local Setup (without Docker)

```bash
# Install dependencies
npm install

# Start Redis, RabbitMQ, MinIO locally or via Docker
docker compose up -d filestorage_redis filestorage_rabbitmq filestorage_minio

# Configure .env for local connections
# Set REDIS_HOST=localhost, MINIO_ENDPOINT=localhost, etc.

# Run in development mode
npm run start:dev
```

### Run Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Useful Commands

```bash
# Lint code
npm run lint

# Format code
npm run format

# Build production bundle
npm run build

# Start production build
npm run start:prod
```

### Access MinIO Console

MinIO provides a web console for browsing archived files:

1. Open http://localhost:9001
2. Login with credentials from `.env`:
   - Username: `minioadmin`
   - Password: `minioadmin`
3. Browse the `filestorage-archive` bucket

---

## Implementation Notes

### Design Decisions

#### File Identifier Uniqueness Scope

**Decision**: File identifiers are unique **per-type** (not globally unique).

**Rationale**: The same ID can exist in different types (e.g., ID `"invoice-2024-001"` can exist in both `type: "unpaid"` and `type: "archived"`).

**Impact**:

- Cache key format: `file:{type}:{id}` (composite key)
- API enforces uniqueness within type boundaries
- Clients must include the `type` parameter in all operations

#### Archival Strategy

- **Scheduler**: Runs every minute (configurable via `ARCHIVAL_CRON`)
- **Eligibility**: Files older than `ARCHIVE_AFTER_SECONDS` (default: 7 days)
- **Processing**: Jobs queued to RabbitMQ for async processing
- **Durability**: Dead-letter exchange for failed archival attempts
- **Transparency**: Cache metadata tracks file location (`hot` or `archive`)

### Project Structure

```
src/
├── main.ts                 # Bootstrap (hybrid HTTP + microservices)
├── app.module.ts           # Root module
├── config/                 # Configuration with Joi validation
├── files/                  # REST API controllers & business logic
│   ├── files.controller.ts
│   ├── files.service.ts
│   └── dto/                # Request/response DTOs
├── storage/                # Storage abstraction layer
│   ├── hot-storage.service.ts    # Filesystem operations
│   └── archive-storage.service.ts # MinIO operations
├── cache/                  # Redis caching layer
│   └── file-cache.service.ts
├── archival/               # Background archival system
│   ├── archival.scheduler.ts  # Cron-based scanner
│   └── archival.worker.ts     # RabbitMQ message handler
└── health/                 # Health check endpoint
    └── health.controller.ts
```

---
