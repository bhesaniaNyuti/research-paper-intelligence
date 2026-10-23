from abc import ABC, abstractmethod
from typing import Any


class EmbeddingProvider(ABC):
    @abstractmethod
    async def embed_text(self, text: str, **kwargs: Any) -> list[float]:
        raise NotImplementedError

    @abstractmethod
    async def embed_documents(self, documents: list[str], **kwargs: Any) -> list[list[float]]:
        raise NotImplementedError

    @abstractmethod
    def dimension(self) -> int:
        raise NotImplementedError

    @abstractmethod
    async def health_check(self) -> bool:
        raise NotImplementedError
