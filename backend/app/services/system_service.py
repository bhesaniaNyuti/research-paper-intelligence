from datetime import datetime

from backend.app.core.config import settings
from backend.app.schemas.system import SystemInfoResponse


class SystemService:
    def system_info(self) -> SystemInfoResponse:
        return SystemInfoResponse(
            app_name=settings.APP_NAME,
            api_version=settings.API_VERSION,
            environment=settings.APP_ENV,
            debug=settings.DEBUG,
            timestamp=datetime.utcnow(),
        )
