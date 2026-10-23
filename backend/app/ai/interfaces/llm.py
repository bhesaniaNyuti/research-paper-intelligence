from abc import ABC, abstractmethod
from typing import Any


class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, **kwargs: Any) -> Any:
        raise NotImplementedError

    @abstractmethod
    async def generate_structured(self, prompt: str, schema: dict[str, Any], **kwargs: Any) -> Any:
        raise NotImplementedError

    @abstractmethod
    async def health_check(self) -> bool:
        raise NotImplementedError
