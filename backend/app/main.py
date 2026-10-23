from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.router import api_router
from backend.app.core.config import settings
from backend.app.core.exceptions import register_exception_handlers
from backend.app.core.logging import configure_logging


def create_app() -> FastAPI:
    configure_logging(settings)

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.API_VERSION,
        description="ResearchMind AI 2.0 backend foundation for research intelligence.",
        openapi_url=f"/api/{settings.API_VERSION}/openapi.json",
        docs_url=f"/api/{settings.API_VERSION}/docs",
        redoc_url=f"/api/{settings.API_VERSION}/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    from backend.app.core.middleware import RequestIDMiddleware

    app.add_middleware(RequestIDMiddleware)
    register_exception_handlers(app)
    app.include_router(api_router, prefix=f"/api/{settings.API_VERSION}")

    return app


app = create_app()
