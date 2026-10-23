from fastapi import APIRouter

from backend.app.schemas.system import SystemInfoResponse
from backend.app.services.system_service import SystemService

router = APIRouter()


@router.get("/info", response_model=SystemInfoResponse)
def info() -> SystemInfoResponse:
    return SystemService().system_info()
