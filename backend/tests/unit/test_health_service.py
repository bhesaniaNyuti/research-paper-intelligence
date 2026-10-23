from backend.app.services.health_service import HealthService


def test_health_service_reports_healthy() -> None:
    service = HealthService()
    health = service.health()
    assert health.status == "healthy"
    assert health.service == "researchmind-api"


def test_readiness_has_checks() -> None:
    service = HealthService()
    readiness = service.readiness()
    assert readiness.status == "starting"
    assert len(readiness.checks) == 3
