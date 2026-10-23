import pytest

from backend.app.ai.interfaces.predictor import BasePredictor


def test_predictor_provider_is_abstract() -> None:
    with pytest.raises(TypeError):
        BasePredictor()
