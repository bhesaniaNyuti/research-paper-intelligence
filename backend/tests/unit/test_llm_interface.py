import pytest

from backend.app.ai.interfaces.llm import LLMProvider


def test_llm_provider_is_abstract() -> None:
    with pytest.raises(TypeError):
        LLMProvider()
