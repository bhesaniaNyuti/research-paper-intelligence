from datetime import datetime

from backend.app.core.config import settings
from backend.app.schemas.health import (
    HealthResponse,
    ReadinessResponse,
    ReadinessStatus,
)


class HealthService:
    def health(self) -> HealthResponse:
        return HealthResponse(
            status="healthy",
            service=settings.APP_NAME,
            version=settings.API_VERSION,
            environment=settings.APP_ENV,
            timestamp=datetime.utcnow(),
        )

    def liveness(self) -> HealthResponse:
        return HealthResponse(
            status="alive",
            service=settings.APP_NAME,
            version=settings.API_VERSION,
            environment=settings.APP_ENV,
            timestamp=datetime.utcnow(),
        )

    def readiness(self) -> ReadinessResponse:
        checks = [
            ReadinessStatus(
                component="database",
                healthy=False,
                detail="Database readiness configuration placeholder. Implementation scheduled for Phase 2.",
            ),
            ReadinessStatus(
                component="vector_store",
                healthy=False,
                detail="Vector store readiness not implemented in Phase 1.",
            ),
            ReadinessStatus(
                component="model_provider",
                healthy=False,
                detail="Model provider readiness not implemented in Phase 1.",
            ),
        ]
        return ReadinessResponse(
            status="starting",
            service=settings.APP_NAME,
            version=settings.API_VERSION,
            environment=settings.APP_ENV,
            checks=checks,
            timestamp=datetime.utcnow(),
        )
