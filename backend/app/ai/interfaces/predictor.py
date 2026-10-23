from abc import ABC, abstractmethod
from typing import Any


class BasePredictor(ABC):
    @abstractmethod
    def fit(self, features: Any, targets: Any) -> None:
        raise NotImplementedError

    @abstractmethod
    def predict(self, features: Any) -> Any:
        raise NotImplementedError

    @abstractmethod
    def evaluate(self, features: Any, targets: Any) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def save(self, path: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def load(self, path: str) -> None:
        raise NotImplementedError
