from fastapi import APIRouter

from backend.app.api.v1 import health, research, search, system

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(search.router, prefix="", tags=["search"])
api_router.include_router(research.router, prefix="", tags=["research"])
