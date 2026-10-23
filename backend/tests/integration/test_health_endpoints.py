import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app


@pytest.mark.asyncio
async def test_health_endpoint() -> None:
    app = create_app()
    client = TestClient(app)
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_readiness_endpoint() -> None:
    app = create_app()
    client = TestClient(app)
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "starting"


@pytest.mark.asyncio
async def test_system_info_endpoint() -> None:
    app = create_app()
    client = TestClient(app)
    response = client.get("/api/v1/system/info")
    assert response.status_code == 200
    assert response.json()["app_name"] == "researchmind-api"
