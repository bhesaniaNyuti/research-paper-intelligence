from abc import ABC, abstractmethod
from typing import Any


class RerankerProvider(ABC):
    @abstractmethod
    async def rerank(self, query: str, documents: list[str], **kwargs: Any) -> list[int]:
        raise NotImplementedError
