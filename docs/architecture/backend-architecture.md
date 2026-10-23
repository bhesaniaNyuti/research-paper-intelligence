# Backend Architecture

Phase 1 implements a modular FastAPI backend.

- `backend/app/main.py`: application factory
- `backend/app/api/`: route definitions and API versioning
- `backend/app/core/`: configuration, logging, exception handling
- `backend/app/db/`: SQLAlchemy session and base model
- `backend/app/services/`: business logic layer
- `backend/app/schemas/`: Pydantic models for API contracts
- `backend/app/ai/`: AI provider interfaces for future use
- `backend/app/utils/`: reusable helpers

This setup aligns with clean architecture by keeping the API layer separate from core business logic and infrastructure.
