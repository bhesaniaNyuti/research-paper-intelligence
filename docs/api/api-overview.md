# API Overview

Phase 1 exposes a minimal API surface for system health and application metadata.

Endpoints:
- `GET /api/v1/health`
- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`
- `GET /api/v1/system/info`

The API is versioned under `/api/v1` and supports OpenAPI documentation at `/api/v1/docs`.
