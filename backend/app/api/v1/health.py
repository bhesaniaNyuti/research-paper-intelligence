from fastapi import APIRouter, Depends

from backend.app.schemas.health import HealthResponse, ReadinessResponse
from backend.app.services.health_service import HealthService

router = APIRouter()

health_service_dependency = Depends(HealthService)


@router.get("", response_model=HealthResponse)
def health(status_service: HealthService = health_service_dependency) -> HealthResponse:
    return status_service.health()


@router.get("/live", response_model=HealthResponse)
def live(status_service: HealthService = health_service_dependency) -> HealthResponse:
    return status_service.liveness()


@router.get("/ready", response_model=ReadinessResponse)
def ready(status_service: HealthService = health_service_dependency) -> ReadinessResponse:
    return status_service.readiness()
