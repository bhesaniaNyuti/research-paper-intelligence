from backend.app.core.config import Settings, settings


def test_default_settings() -> None:
    assert settings.APP_NAME == "researchmind-api"
    assert settings.API_VERSION == "v1"
    assert settings.DEBUG is True


def test_settings_model() -> None:
    config = Settings(APP_NAME="test-app", DEBUG=False)
    assert config.APP_NAME == "test-app"
    assert config.DEBUG is False
