from datetime import datetime

from pydantic import BaseModel


class SystemInfoResponse(BaseModel):
    app_name: str
    api_version: str
    environment: str
    debug: bool
    timestamp: datetime
