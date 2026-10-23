from datetime import datetime

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str
    timestamp: datetime


class ReadinessStatus(BaseModel):
    component: str
    healthy: bool
    detail: str


class ReadinessResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str
    checks: list[ReadinessStatus]
    timestamp: datetime
